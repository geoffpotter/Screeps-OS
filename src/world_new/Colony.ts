import { RoomMode } from "./wrappers/room/RoomMode";
import type { RoomWrapper } from "./wrappers/room/RoomWrapper";
import { Job, JobMemory } from "./jobs/Job";
import { setInterval } from "shared/polyfills";
import { baseStorable, MemoryGroupedCollection, MemoryGroupedCollectionJSON, StorableClass, StorableCreatableClass } from "shared/utils/memory";
import queues from "./queues";
import CreepWrapper from "./wrappers/creep/CreepWrapper";
import MemoryMap, { MemoryMapJSON } from "shared/utils/memory/MemoryMap";
import MemoryManager from "shared/utils/memory/MemoryManager";
import { BaseAction } from "./actions/base/BaseAction";
import { priority } from "shared/utils/priority";
import { builtInQueues } from "shared/polyfills/tasks";
import { CanSpawnCreeps, CreepRequest } from "./wrappers/creep/CreepRequest";
import { SpawnWrapper } from "./wrappers/spawn";
import { getRoomIntel, playerName, PlayerStatus } from "shared/subsystems/intel";
import { getGameObjectWrapperById } from "./wrappers/base/AllGameObjects";
import Logger from "shared/utils/logger";
import { ControllerWrapper, ResourceWrapper } from "./wrappers";
import { addColony, getAllColonies, getColony } from "./Colonies";
import { Dropoff } from "./actions/economy/Dropoff";
import { Pickup } from "./actions/economy/Pickup";
import { getRoomWrapper } from "./wrappers/room/RoomWrappers";
import nodeNetwork from "shared/subsystems/NodeNetwork/nodeNetwork";
import { Node } from "shared/subsystems/NodeNetwork";
import nodeTypes from "shared/subsystems/NodeNetwork/nodeTypes";
let logger = new Logger("Colony");
logger.color = COLOR_GREEN;




export interface colonyMemory {
  id: string;
  rooms: MemoryGroupedCollectionJSON<RoomWrapper>;
  spawnQueue: any[];
  jobs: JobMemory[];
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
    colony.spawnQueue = json.spawnQueue;
    colony.jobs = json.jobs.map(job=>Job.fromJSON(job, colony));
    return colony;
  }
  rooms: MemoryGroupedCollection<RoomWrapper>;
  spawnQueue: any[] = [];
  jobs: Job[] = [];
  registeredActions: MemoryGroupedCollection<BaseAction<any, any>>;

  private workerJob: Job | undefined;
  private minerJob: Job | undefined;
  private haulerJob: Job | undefined;
  private upgraderJob: Job | undefined;

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
    this.setupJobs();
  }
  setupJobs() {
    let sourceActions: any[] = [];
    let spawnsActions: Dropoff[] = [];
    let upgradeActions: any[] = [];
    let pickupActions: Pickup[] = [];
    let controllerDropOff: Dropoff[] = [];
    let controllerPickup: Pickup[] = [];
    let upgraderDropoffs: Dropoff[] = [];
    let haulerPickups: Pickup[] = [];
    let haulerDropoffs: Dropoff[] = [];
    let minerPickups: Pickup[] = [];





    // Iterate through all rooms assigned to this colony
    for (const room of this.rooms.getAll()) {
      let intel = getRoomIntel(room.id);
      logger.log("setupJobs for room", room.id, intel.roomName, intel.sources.size, intel.buildings[PlayerStatus.MINE].size);

      // Collect actions from each room
      sourceActions.push(...intel.sources.map(source => source.harvestAction));
      spawnsActions.push(...intel.buildings[PlayerStatus.MINE].getGroupWithValueGetObjects<SpawnWrapper>("wrapperType", "SpawnWrapper")
        .map(spawn => spawn.actionDropoff)
        .filter(action => action !== false) as Dropoff[]);

      if (intel.controller) {
        upgradeActions.push(intel.controller.upgradeAction);
        if (intel.controller.dumpEnergyAction) controllerDropOff.push(intel.controller.dumpEnergyAction);
        if (intel.controller.useEnergyAction) controllerPickup.push(intel.controller.useEnergyAction);
      }

      pickupActions.push(...intel.droppedResources.map(resource => resource.actionPickup));
      minerPickups.push(...intel.creeps[PlayerStatus.MINE].getAll().filter(creep => creep && creep.actionPickup && creep.assignedJob && creep.assignedJob.id.includes("miner")).map(creep => creep.actionPickup as Pickup));
      haulerPickups.push(...intel.creeps[PlayerStatus.MINE].getAll().filter(creep => creep && creep.actionPickup && creep.assignedJob && creep.assignedJob.id.includes("hauler")).map(creep => creep.actionPickup as Pickup));
      haulerDropoffs.push(...intel.creeps[PlayerStatus.MINE].getAll().filter(creep => creep && creep.actionDropoff && creep.assignedJob && creep.assignedJob.id.includes("hauler")).map(creep => creep.actionDropoff as Dropoff));
      upgraderDropoffs.push(...intel.creeps[PlayerStatus.MINE].getAll().filter(creep => creep && creep.actionDropoff && creep.assignedJob && creep.assignedJob.id.includes("upgrader")).map(creep => creep.actionDropoff as Dropoff));

    }

    // Create jobs if they don't exist
    if (!this.minerJob) {
      this.minerJob = new Job(this.id + "_miner", this, {
        name: "miner",
        fatness: 100,
        priority: priority.TOP,
        primaryPart: WORK,
        secondaryPart: CARRY,
        secondaryPerPrimary: 0.01,
      });
      // this.minerJob.maxAssignedObjects = 2;
    }
    if (!this.haulerJob) {
      this.haulerJob = new Job(this.id + "_hauler", this, {
        name: "hauler",
        fatness: 1,
        priority: priority.HIGH,
        maxLevel: 1
      });
      this.haulerJob.maxAssignedObjects = 8;
    }
    if (!this.upgraderJob) {
      this.upgraderJob = new Job(this.id + "_upgrader", this, {
        name: "upgrader",
        fatness: 100,
        priority: priority.NORMAL,
        primaryPart: WORK,
        secondaryPart: CARRY,
        secondaryPerPrimary: 0.01,
      });
      // this.upgraderJob.maxAssignedObjects = 5;
    }

    // Sync actions for each job
    this.minerJob.syncActions(sourceActions);
    this.haulerJob.syncActions(pickupActions, [...spawnsActions, ...controllerDropOff, ...upgraderDropoffs, ...minerPickups]);
    this.upgraderJob.syncActions(controllerPickup, [...upgradeActions]);

    this.jobs = [
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
        let basePos = controllerWrapper.dumpEnergyAction.wpos;
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

  registerAction(action: BaseAction<any, any>) {
    // logger.log(action.id, "registering action");
    this.registeredActions.add(action);
    this.actionsDirty = true;
  }
  unregisterAction(action: BaseAction<any, any>) {
    this.registeredActions.removeById(action.id);
    this.actionsDirty = true;
  }
  hasAction(actionId: string) {
    return this.registeredActions.hasId(actionId);
  }
  getAction(actionId: string) {
    return this.registeredActions.getById(actionId);
  }
  getActionsByType(actionType: string) {
    let actionIds = this.registeredActions.getGroupWithValue("actionType", actionType);
    if(!actionIds) {
      return [];
    }
    return actionIds.map(id=>this.registeredActions.getById(id));
  }

  init() {
    if (this.actionsDirty) {
      // logger.log("actions dirty during init!!! setting up jobs");
      this.setupJobs();
    }
    if (Game.time % 1000 === 0) {
      this.connectNetworkNodes();
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
        return ret.then(creepName => {
          // logger.log("Spawned creep", creepName);
          return creepName;
        }).catch(err => {
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

  findSuitableJobForCreep(creep: CreepWrapper): Job | undefined {
    // Implement logic to find a suitable job based on creep's capabilities
    for(const job of this.jobs) {
      //@ts-ignore
      // logger.log(creep.name, "checking job", job.id, job.needsObject(creep, true), job.assignedObjects.size);
      if(job.needsObject(creep, true)) {
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
