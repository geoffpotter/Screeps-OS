import { RoomMode } from "./wrappers/room/RoomMode";
import type { RoomWrapper } from "./wrappers/room/RoomWrapper";
import { setInterval } from "shared/polyfills";
import { baseStorable, MemoryGroupedCollection, MemoryGroupedCollectionJSON, StorableClass, StorableCreatableClass } from "shared/utils/memory";
import queues from "./queues";
import CreepWrapper from "./wrappers/creep/CreepWrapper";
import MemoryMap, { MemoryMapJSON } from "shared/utils/memory/MemoryMap";
import MemoryManager from "shared/utils/memory/MemoryManager";
import { BaseAction } from "./actions/base/BaseAction";
import { Priority } from "shared/utils/priority";
import { builtInQueues } from "shared/polyfills/tasks";
import { CanSpawnCreeps, CreepRequest } from "./wrappers/creep/CreepRequest";
import { SpawnWrapper } from "./wrappers/spawn";
import { getRoomIntel, playerName, PlayerStatus } from "shared/subsystems/intel";
import { getGameObjectWrapperById } from "./wrappers/base/AllGameObjects";
import Logger from "shared/utils/logger";
import { ControllerWrapper, ResourceWrapper } from "./wrappers";
import { addColony, getAllColonies, getColony } from "./Colonies";
import { BaseDropoff } from "./actions/economy/resources/BaseDropoff";
import { BasePickup } from "./actions/economy/resources/BasePickup";
import { getRoomWrapper } from "./wrappers/room/RoomWrappers";
import nodeNetwork from "shared/subsystems/NodeNetwork/nodeNetwork";
import { Node } from "shared/subsystems/NodeNetwork";
import nodeTypes from "shared/subsystems/NodeNetwork/nodeTypes";
import { CreepJob } from "./jobs/CreepJob";
import { StructureJob } from "./jobs/StructureJob";
let logger = new Logger("Colony");
logger.color = COLOR_GREEN;




export interface colonyMemory {
  id: string;
  rooms: MemoryGroupedCollectionJSON<RoomWrapper>;
}

// OWNED,
// REMOTE_UNOWNED,
// REMOTE_RESERVED,
// REMOTE_OWNED,
// REMOTE_SK,
// REMOTE_CENTER,
// REMOTE_HIGHWAY,
type ColonyRoomType =
    RoomMode.OWNED |
    RoomMode.REMOTE_UNOWNED |
    RoomMode.REMOTE_RESERVED |
    RoomMode.REMOTE_OWNED |
    RoomMode.REMOTE_SK |
    RoomMode.REMOTE_CENTER |
    RoomMode.REMOTE_HIGHWAY;

export class Colony extends baseStorable implements StorableClass<Colony, typeof Colony, colonyMemory>, CanSpawnCreeps {
  static fromJSON(json: colonyMemory, colony?: Colony): Colony {
    if(!colony) {
      colony = new Colony(json.id);
    }
    colony.rooms = MemoryGroupedCollection.fromJSON(json.rooms);
    return colony;
  }
  toJSON(): colonyMemory {
    return {
      id: this.id,
      rooms: this.rooms.toJSON(),
    };
  }

  rooms: MemoryGroupedCollection<RoomWrapper>;
  spawnQueue: any[] = [];
  jobs: (CreepJob | StructureJob)[] = [];
  registeredActions: MemoryGroupedCollection<BaseAction<any, any>>;

  private workerJob: CreepJob | undefined;
  private minerJob: CreepJob | undefined;
  private haulerJob: CreepJob | undefined;
  private upgraderJob: CreepJob | undefined;

  private actionsDirty = true;

  private baseNode: Node | undefined;

  get spawns():SpawnWrapper[] {
    let ownedRooms = this.rooms.getGroupWithValue("roomMode", RoomMode.OWNED);
    logger.log("getting spawns", this.id, ownedRooms);
    if(!ownedRooms) {
      return [];
    }
    let spawns:SpawnWrapper[] = []
    for(const roomId of ownedRooms) {
      let roomIntel = getRoomIntel(roomId);
      let spawnsInRoom = roomIntel.buildings[PlayerStatus.MINE].getGroupWithValue("wrapperType", "SpawnWrapper");
      // logger.log("getting spawns", this.id, roomId, spawnsInRoom, roomIntel.buildings[PlayerStatus.MINE].getGroup("wrapperType"));
      if(spawnsInRoom) {
        for(const spawnId of spawnsInRoom) {
          let spawn = getGameObjectWrapperById(spawnId) as SpawnWrapper;
          if(spawn) {
            spawns.push(spawn);
          }
        }
      }
    }
    return spawns;
  }
  get wpos() {
    if (this.rooms.size === 0) {
      throw new Error("Colony has no rooms");
    }
    // logger.log("Colony has rooms", this.rooms.getAll());
    return this.rooms.getAll()[0].wpos;
  }
  constructor(mainRoomName: string) {
    super(`${mainRoomName}`);
    let gw = (roomName: string):RoomWrapper => {
      let w:RoomWrapper|false = getRoomWrapper(roomName);
      if(!w) {
        throw new Error("No room wrapper found for " + roomName);
      }
      return w;
    }
    this.rooms = new MemoryGroupedCollection<RoomWrapper>("rooms", "id", ["roomMode"], undefined, gw);

    let mainRoomWrapper = getRoomWrapper(mainRoomName);
    if(!mainRoomWrapper) {
      throw new Error("No room wrapper found for " + mainRoomName);
    }
    this.addRoom(mainRoomWrapper, RoomMode.OWNED);

    this.registeredActions = new MemoryGroupedCollection<BaseAction<any, any>>("registeredActions", "id", ["actionType"], undefined, false);

    addColony(this);
    // this.setupJobs();
  }
  setupJobs() {
    let sourceActions: any[] = [];
    let spawnsActions: BaseDropoff[] = [];
    let upgradeActions: any[] = [];
    let pickupActions: BasePickup[] = [];
    let controllerDropOff: BaseDropoff[] = [];
    let controllerPickup: BasePickup[] = [];
    let upgraderDropoffs: BaseDropoff[] = [];
    let haulerPickups: BasePickup[] = [];
    let haulerDropoffs: BaseDropoff[] = [];
    let minerPickups: BasePickup[] = [];

    // Create jobs if they don't exist
    if (!this.workerJob) {
      this.workerJob = new CreepJob(this.id + "_worker", this, {
        name: "worker",
        fatness: 1,
        priority: Priority.TOP,
        primaryPart: WORK,
        secondaryPart: CARRY,
        secondaryPerPrimary: 1,
        maxLevel: 1,
      });
      this.workerJob.maxAssignedObjects = 1;
      this.workerJob.priority = Priority.NORMAL;
    }
    if (!this.minerJob) {
      this.minerJob = new CreepJob(this.id + "_miner", this, {
        name: "miner",
        fatness: 100,
        priority: Priority.NORMAL,
        primaryPart: WORK,
        secondaryPart: CARRY,
        secondaryPerPrimary: 0.01,
      });
      // this.minerJob.maxAssignedObjects = 1;
      this.minerJob.priority = Priority.TOP;
    }
    if (!this.haulerJob) {
      this.haulerJob = new CreepJob(this.id + "_hauler", this, {
        name: "hauler",
        fatness: 1,
        priority: Priority.NORMAL,
        maxLevel: 1
      });
      // this.haulerJob.maxAssignedObjects = 1;
      this.haulerJob.priority = Priority.LOW;
    }
    if (!this.upgraderJob) {
      this.upgraderJob = new CreepJob(this.id + "_upgrader", this, {
        name: "upgrader",
        fatness: 100,
        priority: Priority.NORMAL,
        primaryPart: WORK,
        secondaryPart: CARRY,
        secondaryPerPrimary: 0.01,
      });
      // this.upgraderJob.maxAssignedObjects = 1;
      this.upgraderJob.priority = Priority.NORMAL;
    }



    // Iterate through all rooms assigned to this colony
    for (const room of this.rooms.getAll()) {
      let intel = getRoomIntel(room.id);
      logger.log("setupJobs for room", room.id, intel.roomName, intel.sources.size, intel.buildings[PlayerStatus.MINE].size);

      // Collect actions from each room
      sourceActions.push(...intel.sources.map(source => source.getActionHarvest()));
      spawnsActions.push(...intel.buildings[PlayerStatus.MINE].getGroupWithValueGetObjects<SpawnWrapper>("wrapperType", "SpawnWrapper")
        .map(spawn => spawn.getActionDropoffAny()));

      if (intel.controller) {
        upgradeActions.push(intel.controller.getActionUpgrade());
        controllerDropOff.push(intel.controller.getActionDumpEnergy());
        controllerPickup.push(intel.controller.getActionUseEnergy());
      }

      pickupActions.push(...intel.droppedResources.getAll().filter(resource=>!resource.nearController).map(resource => resource.getActionPickup()));
      minerPickups.push(...intel.creeps[PlayerStatus.MINE].getAll().filter(creep => creep && creep.assignedJob && creep.assignedJob.id.includes("miner")).map(creep => creep.getActionPickupAny() as BasePickup));
      haulerPickups.push(...intel.creeps[PlayerStatus.MINE].getAll().filter(creep => creep && creep.assignedJob && creep.assignedJob.id.includes("hauler")).map(creep => creep.getActionPickupAny() as BasePickup));
      haulerDropoffs.push(...intel.creeps[PlayerStatus.MINE].getAll().filter(creep => creep && creep.assignedJob && creep.assignedJob.id.includes("hauler")).map(creep => creep.getActionDropoffAllowed() as BaseDropoff));
      upgraderDropoffs.push(...intel.creeps[PlayerStatus.MINE].getAll().filter(creep => creep && creep.assignedJob && creep.assignedJob.id.includes("upgrader")).map(creep => creep.getActionDropoffAllowed() as BaseDropoff));

    }

    logger.log("syncing actions", sourceActions.length, pickupActions.length, controllerPickup.length, upgradeActions.length);

    // Sync actions for each job
    this.minerJob.syncActions(sourceActions);
    this.workerJob.syncActions(sourceActions, [...spawnsActions, ...upgradeActions]);
    this.haulerJob.syncActions(pickupActions, [...spawnsActions, ...controllerDropOff, ...upgraderDropoffs]);
    this.upgraderJob.syncActions(controllerPickup, [...upgradeActions]);

    this.jobs = [
      this.workerJob,
      this.minerJob,
      this.haulerJob,
      this.upgraderJob,
    ];
    this.actionsDirty = false;

  }

  connectNetworkNodes() {
    if (!this.baseNode) {
      let roomIntel = getRoomIntel(this.rooms.getAll()[0].id);
      //add base node at controller drop off point
      let controllerWrapper = roomIntel.buildings[PlayerStatus.MINE].getGroupWithValueGetObjects("wrapperType", "ControllerWrapper")[0] as unknown as ControllerWrapper;
      if(controllerWrapper) {
        let basePos = controllerWrapper.getActionDumpEnergy().wpos;
        if (nodeNetwork.hasNode(basePos)) {
          this.baseNode = nodeNetwork.getNode(basePos) as Node;
        } else {
          this.baseNode = nodeNetwork.addNode(basePos, nodeTypes.BASE, true);
        }
      }
    }
    if (!this.baseNode) {
      return;
    }
    let fromNodes: Node[] = [this.baseNode];
    let toNodes: Node[] = [];
    //connect base node to all other nodes
    for(const room of this.rooms.getAll()) {
      logger.log("connecting nodes in room:", room.id);
      let intel = getRoomIntel(room.id);
      let spawnNodes = intel.buildings[PlayerStatus.MINE].getGroupWithValueGetObjects("wrapperType", "SpawnWrapper")
      logger.log("spawnNodes", spawnNodes.length);
      if(spawnNodes.length > 0) {
        fromNodes.push(...spawnNodes.map(spawn=>spawn.createAndAddNodes(1, nodeTypes.BUILDING, false)).reduce((a, b) => a.concat(b), []));
      }
      for (const source of intel.sources.getAll()) {
        let sourceNodes = source.createAndAddNodes(1, nodeTypes.STATIC_RESOURCE, false);
        logger.log("connecting source", source.id, "num nodes", sourceNodes.length);
        if(sourceNodes.length > 0) {
          toNodes.push(...sourceNodes);
        }
      }
      for(const structure of intel.buildings[PlayerStatus.MINE].getAll()) {
        if (structure.wrapperType === "ControllerWrapper") {
          continue;
        }
        let structureNodes = structure.createAndAddNodes(1, nodeTypes.BUILDING, false);
        logger.log("connecting structure", structure.id, "num nodes", structureNodes.length);
        if(structureNodes.length > 0) {
          toNodes.push(...structureNodes);
        }
      }
      if(intel.controller && room.roomMode == RoomMode.OWNED) {
        let range = 3;
        let controllerNodes = intel.controller.createAndAddNodes(range, nodeTypes.CONTROLLER_OWNED, false);
        logger.log("connecting controller", intel.controller.id, "num nodes", controllerNodes.length, "range", range);
        if(controllerNodes.length > 0) {
          toNodes.push(...controllerNodes);
        }
      }
      // for(const resource of intel.droppedResources.getAll()) {
      //   if (!nodeNetwork.hasNode(resource.wpos)) {
      //     toNodes.push(nodeNetwork.addNode(resource.wpos, nodeTypes.STATIC_RESOURCE, false));
      //   }
      // }
    }
    logger.log("connecting nodes", fromNodes.length, toNodes.length);
    nodeNetwork.connectNodes(fromNodes, toNodes);
  }

  addRoom(roomWrapper: RoomWrapper, roomType: RoomMode) {
    roomWrapper.colony = this;
    roomWrapper.roomMode = roomType;
    this.rooms.add(roomWrapper);
    this.actionsDirty = true;
  }
  removeRoom(roomWrapper: RoomWrapper) {
    roomWrapper.colony = false;
    roomWrapper.roomMode = RoomMode.UNUSED;
    this.rooms.remove(roomWrapper);
    this.actionsDirty = true;
  }
  getJob(jobId: string) {
    return this.jobs.find(job=>job.id === jobId);
  }

  init() {
    if (this.actionsDirty || Game.time % 10 == 0) {
      // logger.log("actions dirty during init!!! setting up jobs");
      this.setupJobs();
    }
    if (Game.time % 1000 === 0) {
      // this.connectNetworkNodes();
    }



  }
  postInit() {
    // logger.log("postInit", this.id);
    if (this.actionsDirty) {
      // logger.log("actions dirty during postInit!!! setting up jobs");
      this.setupJobs();
    }
  }
  // Update function for the colony
  update() {
    if (this.actionsDirty) {
      // logger.log("actions dirty during update!!! setting up jobs");
      this.setupJobs();
    }
    // logger.log("updating colony", this.id, this.jobs.length);
    this.jobs.forEach(job=>job.update());

  };
  act() {
    this.jobs.forEach(job=>job.act());
    // nodeNetwork.displayRooms();
    // nodeNetwork.displayNodes();


  }

  projectedSpawnTime(creepRequest: CreepRequest): number {
    return Math.min(...this.spawns.map(spawn => spawn.projectedSpawnTime(creepRequest)));
  }

  maxSpawnableLevel(creepRequest: CreepRequest): number {
    return Math.max(...this.spawns.map(spawn => spawn.maxSpawnableLevel(creepRequest)));
  }

  spawnCreep(creepRequest: CreepRequest): Promise<string | false> {
    const availableSpawns = this.spawns
    // logger.log("Spawning creep", creepRequest, this.id, availableSpawns.length);
    if (availableSpawns.length === 0) return Promise.reject(false);
    let usableSpawns = availableSpawns.filter(spawn=>spawn.maxSpawnableLevel(creepRequest) === 0);
    // Sort spawns by max spawnable level (descending) and then by projected spawn time (ascending) and then by distance (ascending)
    usableSpawns.sort((a, b) => {
      const levelDiff = b.maxSpawnableLevel(creepRequest) - a.maxSpawnableLevel(creepRequest);
      if (levelDiff !== 0) return levelDiff;
      const timeDiff = a.projectedSpawnTime(creepRequest) - b.projectedSpawnTime(creepRequest);
      if (timeDiff !== 0) return timeDiff;
      const distanceDiff = a.wpos.getRangeTo(creepRequest.pos) - b.wpos.getRangeTo(creepRequest.pos);
      return distanceDiff;
    });

    // Try spawning with the best available spawn
    for (const spawn of availableSpawns) {
      // logger.log("Trying to spawn creep in spawn", spawn.id, spawn.maxSpawnableLevel(creepRequest));
      let ret =  spawn.spawnCreep(creepRequest);
      if (ret) {
        return ret.then((creepName: string | false) => {
          // logger.log("Spawned creep", creepName);
          return creepName;
        }).catch((err: any) => {
          logger.error("Error spawning creep", err);
          return false;
        });
      }
    }

    return Promise.reject(false);
  }
  cancelCreep(creepRequest: CreepRequest): void {
    for (const spawn of this.spawns) {
      spawn.cancelCreep(creepRequest);
    }
  }

  findSuitableJobForCreep(creep: CreepWrapper): CreepJob | undefined {
    // Implement logic to find a suitable job based on creep's capabilities
    for(const job of this.jobs) {
      //@ts-ignore
      // logger.log(creep.name, "checking job", job.id, job.needsObject(creep, true), job.assignedObjects.size);
      if(job instanceof CreepJob && job.needsObject(creep, true)) {
        return job;
      }
    }
    return undefined;
  }

}

export function getOrMakeColony(mainRoomName: string): Colony {
  let colony = getColony(mainRoomName);
  if(!colony) {
    colony = new Colony(mainRoomName);
    addColony(colony);
  }
  return colony;
}

// //if we have no colonies, create one for each owned room
// logger.log("checking for colonies", getAllColonies().length);
// if(getAllColonies().length === 0) {
//   for(const room of Object.values(Game.rooms)) {
//     if(room.controller && room.controller.owner && room.controller.owner.username === playerName) {
//       logger.log("creating colony for room", room.name);
//       addColony(new Colony(room.name));
//     }
//   }
// }

