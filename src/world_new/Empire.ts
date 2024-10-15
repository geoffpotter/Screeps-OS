import { setInterval } from "shared/polyfills";
import queues from "./queues";
import { baseStorable, MemoryGroupedCollection, MemoryGroupedCollectionJSON } from "shared/utils/memory";
import MemoryMap, { MemoryMapJSON } from "shared/utils/memory/MemoryMap";
import MemoryManager, { StorableClass } from "shared/utils/memory/MemoryManager";
import { canHazJob, Job, JobMemory } from "./jobs/Job";
import type { BaseAction } from "./actions/base/BaseAction";
import { priority } from "shared/utils/priority";
import Logger from "shared/utils/logger";
import { AnyGameObjectWrapper } from "./wrappers/base/GameObjectWrapper";
import { CanSpawnCreeps, CreepRequest } from "./wrappers/creep/CreepRequest";
import { getPlayerIntel, playerName } from "shared/subsystems/intel";
import { CreepWrapper } from "./wrappers";
import { getAllColonies } from "./Colonies";
import nodeNetwork from "shared/subsystems/NodeNetwork/nodeNetwork";


let logger = new Logger("Empire");

interface empireMemory {
}
class Empire extends baseStorable implements StorableClass<Empire, typeof Empire, empireMemory>, CanSpawnCreeps {
    static fromJSON(json: empireMemory): Empire {
        let empire = new Empire();
        return empire;
    }
    toJSON(): empireMemory {
        return {
        };
    }
    protected registeredActions: MemoryGroupedCollection<BaseAction<any, any>> = new MemoryGroupedCollection("Empire_actions", "id", ["actionType"], undefined, false);
    scoutJob: Job;
    constructor() {
        super("Empire");
        this.scoutJob = new Job("empire_scoutJob", this, {
            name: "scout",
            fatness: 0,
            priority: priority.BOTTOM,
            primaryPart: MOVE,
            secondaryPart: false,
            secondaryPerPrimary: 0,
            maxLevel: 1,
        });
        this.scoutJob.maxAssignedObjects = 1;
    }

    findSuitableJobForObject(object: canHazJob): Job | undefined {
        if (this.scoutJob.needsObject(object, true)) {
            return this.scoutJob;
        }
        return undefined;
    }

    registerAction(action: BaseAction<any, any>) {
        logger.log("Registering action", action.id, action.actionType);
        this.registeredActions.add(action);
        logger.log("Registered action", action.id, action.actionType, this.registeredActions.size, this.registeredActions.toJSON());
    }
    unregisterAction(action: BaseAction<any, any>) {
        this.registeredActions.removeById(action.id);
    }
    hasAction(actionId: string) {
        return this.registeredActions.hasId(actionId);
    }
    getAction(actionId: string) {
        return this.registeredActions.getById(actionId);
    }
    getActionsByType(actionType: string) {
        let actionIds = this.registeredActions.getGroupWithValue("actionType", actionType);
        if (!actionIds) {
            return [];
        }
        return actionIds.map(id => this.registeredActions.getById(id));
    }

    // CanSpawnCreeps interface implementation
    projectedSpawnTime(creepRequest: CreepRequest): number {
        return Math.min(...getAllColonies().map(colony => colony.projectedSpawnTime(creepRequest)));
    }

    maxSpawnableLevel(creepRequest: CreepRequest): number {
        return Math.max(...getAllColonies().map(colony => colony.maxSpawnableLevel(creepRequest)));
    }

    spawnCreep(creepRequest: CreepRequest): Promise<string | false> {
        let colonies = getAllColonies();
        logger.log("Spawning creep", creepRequest, colonies.length);
        logger.log("Colonies", colonies, colonies);
        // limit colinies to those within 150 tiles
        colonies = colonies.filter(colony => colony.wpos.getRangeTo(creepRequest.pos) <= 150);
        logger.log("Filtered colonies", colonies.length);
        // Sort colonies by projected spawn time and then by max spawnable level and then by distance
        colonies.sort((a, b) => {
            const timeDiff = a.projectedSpawnTime(creepRequest) - b.projectedSpawnTime(creepRequest);
            if (timeDiff !== 0) return timeDiff;
            const levelDiff = b.maxSpawnableLevel(creepRequest) - a.maxSpawnableLevel(creepRequest);
            if (levelDiff !== 0) return levelDiff;
            const distanceDiff = a.wpos.getRangeTo(creepRequest.pos) - b.wpos.getRangeTo(creepRequest.pos);
            return distanceDiff;
        });
        logger.log("Sorted colonies", colonies.map(colony => colony.id));
        for (const colony of colonies) {
            logger.log("Trying to spawn creep in colony", colony.id);
            return colony.spawnCreep(creepRequest).then(creepName => {
                logger.log("Spawned creep", creepName);
                return creepName;
            }).catch(err => {
                logger.error("Error spawning creep", err);
                return false;
            });
        }
        logger.log("No colonies to spawn creep", creepRequest);
        return Promise.reject(false);
    }

    cancelCreep(creepRequest: CreepRequest): void {
        getAllColonies().forEach(colony => colony.cancelCreep(creepRequest));
    }

    // Periodic update function
    init() {
        // Additional empire-level logic
        nodeNetwork.addRoomsToNetwork(10);
        nodeNetwork.refineRooms();
        nodeNetwork.refineEdges();
        nodeNetwork.displayNodes();
        nodeNetwork.displayRooms();
    };
    postInit() {
        logger.log("Registered actions", this.registeredActions.size, this.registeredActions.getAll());
        // Add all actions to the scout job
        this.registeredActions.forEach(action => {
            if (!this.scoutJob.hasAction(action)) {
                this.scoutJob.addPrimaryAction(action);
            }
        })
        //remove any actions that are no longer registered
        this.scoutJob.forEachAction(action => {
            if (!this.registeredActions.hasId(action.id)) {
                this.scoutJob.removeAction(action);
            }
        })
        this.scoutJob.update();
    }
    update() {

        logger.log("Scout job actions", this.scoutJob.numActions());
    };
    act() {
        this.scoutJob.act();
        logger.log("Scout job actions", this.scoutJob.numActions());
    };
}
const empire = MemoryManager.loadOrCreateObject(Empire, "empire");
export default empire;
// Schedule the empire's update function to run periodically
setInterval(() => empire.init(), 1, queues.TICK_INIT);
setInterval(() => empire.postInit(), 1, queues.POST_INIT);
setInterval(() => empire.update(), 1, queues.UPDATE);
setInterval(() => empire.act(), 1, queues.ACTIONS);
