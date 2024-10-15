import { registerObjectWrapper } from "world_new/wrappers/base/AllGameObjects";
import { HasStorageWrapper, HasStorageWrapperData } from "world_new/wrappers/base/HasStorageWrapper";
import Logger from "shared/utils/logger";
import { StorableCreatableClass } from "shared/utils/memory";
import { CanSpawnCreeps, CreepRequest } from "../creep/CreepRequest";
import { PriorityQueue } from "shared/utils/queues/priorityQueue";
import sleep from "shared/polyfills/sleep";
import { setInterval, clearInterval } from "shared/polyfills/setInterval";
import queues from "../../queues"
const logger = new Logger("SpawnWrapper");
logger.color = COLOR_RED
// logger.enabled = false;

interface CreepRequestWithCallback extends CreepRequest {
  callback: (creepName: string | false) => void;
}

interface SpawnWrapperData extends HasStorageWrapperData {
  name: string;
  spawning: boolean;
  remainingTime: number | null;
  spawnQueue: CreepRequest[];
}

let allSpawnWrappers = new Map<string, SpawnWrapper>();
setInterval(() => {
  logger.log("running SpawnWrapper.act()", allSpawnWrappers.keys());
  for(const [id, wrapper] of allSpawnWrappers) {
    logger.log("running SpawnWrapper.act()", id);
    wrapper.act();
  }
}, 1, queues.ACTIONS, true);

export default class SpawnWrapper extends HasStorageWrapper<StructureSpawn> implements StorableCreatableClass<SpawnWrapper, typeof SpawnWrapper, SpawnWrapperData>, CanSpawnCreeps {
  name: string;
  spawning: boolean;
  remainingTime: number | null;
  private spawnQueue: PriorityQueue<CreepRequestWithCallback>;

  static fromJSON(json: SpawnWrapperData): SpawnWrapper {
    const wrapper = new SpawnWrapper(json.id as Id<StructureSpawn>);
    wrapper.name = json.name;
    wrapper.spawning = json.spawning;
    wrapper.remainingTime = json.remainingTime;
    json.spawnQueue.forEach(request => wrapper.spawnQueue.push(request));
    return wrapper;
  }

  toJSON(): SpawnWrapperData {
    return {
      ...super.toJSON(),
      name: this.name,
      spawning: this.spawning,
      remainingTime: this.remainingTime,
      spawnQueue: this.spawnQueue._heap,
    };
  }

  constructor(id: string) {
    super(id as Id<StructureSpawn>);
    this.name = "spawn";
    this.spawning = false;
    this.remainingTime = null;
    this.spawnQueue = new PriorityQueue<CreepRequestWithCallback>((a, b) => {
      logger.log("priority", a.options.priority, b.options.priority);
      if ((b.options.priority ?? 0) !== (a.options.priority ?? 0)) {
        return (b.options.priority ?? 0) < (a.options.priority ?? 0);
      }
      logger.log("distance", a.pos.getRangeTo(this.wpos), b.pos.getRangeTo(this.wpos));
      return (a.pos.getRangeTo(this.wpos) ?? 0) > (b.pos.getRangeTo(this.wpos) ?? 0);
    });
    // logger.log("new SpawnWrapper", this.id, new Error().stack);
    allSpawnWrappers.set(this.id, this);
    this.store.addAmount(RESOURCE_ENERGY, 0);
    this.store.setMin(RESOURCE_ENERGY, 300);
    this.store.setMax(RESOURCE_ENERGY, 300);
    this.update();
  }
  delete(): void {
    super.delete();
    allSpawnWrappers.delete(this.id);
  }

  init() {
    super.init();
    // logger.log("init", this.id, this.exists, this.owner, this.wpos);
  }

  update() {
    super.update();
    const spawn = this.getObject();
    if (spawn) {
      this.name = spawn.name;
      this.spawning = !!spawn.spawning;
      this.remainingTime = spawn.spawning ? spawn.spawning.remainingTime : null;

    }
  }

  act() {
    // logger.log("act", this.id, this.spawnQueue.size(), this.spawnQueue.peek()?.options.name);
    const spawn = this.getObject();
    if (!spawn) return;

    // Handle spawning creeps
    if (!this.spawning && !this.spawnQueue.isEmpty()) {
      this.trySpawnNextCreep(spawn);
    } else if (this.spawning) {
      logger.log("busy spawning", this.id, this.spawning, this.spawnQueue.size(), this.spawnQueue.peek()?.options.name);
    } else {
      logger.log("not spawning", this.id, this.spawning, this.spawnQueue.size(), this.spawnQueue.peek()?.options.name);
    }
  }

  projectedSpawnTime(creepRequest: CreepRequest): number {
    const spawn = this.getObject();
    if (!spawn) return Infinity;

    const bodyAndLevel = creepRequest.designBody(spawn.room.energyAvailable);
    return bodyAndLevel.body.length * CREEP_SPAWN_TIME;
  }

  maxSpawnableLevel(creepRequest: CreepRequest): number {
    const spawn = this.getObject();
    if (!spawn) return 0;

    const energyAvailable = spawn.room.energyAvailable;
    const bodyAndLevel = creepRequest.designBody(energyAvailable);
    return bodyAndLevel.level;
  }

  spawnCreep(creepRequest: CreepRequest): Promise<string | false> {
    logger.log("Spawning creep", creepRequest, this.id);
    let spawnedCreepName: string | false = false;
    //@ts-ignore
    creepRequest.callback = (name: string) => {
      logger.log("Creep spawned(callback)", name);
      spawnedCreepName = name;
    };
    this.spawnQueue.push(creepRequest);
    logger.log("added Creep to spawn queue", this.id, creepRequest.options.name, this.spawnQueue.size(), this.spawnQueue.peek()?.options.name);
    return new Promise((resolve, reject) => {
      let intervalId = setInterval(() => {
        logger.log("waiting for creep to spawn1", creepRequest.options.name, spawnedCreepName);
        let spawn = this.getObject();
        if(!spawn) {
          //spawn is gone
          logger.log("spawn is gone, rejecting");
          clearInterval(intervalId);
          reject(false);
          return;
        }
        logger.log("waiting for creep to spawn2", creepRequest.options.name, spawnedCreepName);
        if(spawnedCreepName) {
          //creep is spawned
          logger.log("creep is spawning, resolving", creepRequest.options.name, spawnedCreepName);
          clearInterval(intervalId);
          resolve(spawnedCreepName);
          return;
        }
      }, 1, undefined);
    });
  }

  cancelCreep(creepRequest: CreepRequest): void {
    logger.log("cancelling creep", creepRequest.options.name);
    this.spawnQueue.remove(creepRequest as CreepRequestWithCallback, (a, b) => _.isEqual(a.options, b.options) && _.isEqual(a.pos, b.pos));
  }

  private trySpawnNextCreep(spawn: StructureSpawn) {
    logger.log("trySpawnNextCreep", this.id, this.spawnQueue.size(), this.spawnQueue.peek()?.options.name);
    const creepRequest = this.spawnQueue.peek();

    const bodyAndLevel = creepRequest.designBody(spawn.room.energyCapacityAvailable);
    if (bodyAndLevel.body.length === 0) {
      // throw new Error("body is empty, this room can't spawn this creep");
      logger.log("body is empty, this room can't spawn this creep", creepRequest.options.name);
      this.spawnQueue.pop();
      return;
    }
    let creepName = creepRequest.options.name;
    let creepNumber = 0;
    let level = bodyAndLevel.level;
    while (Game.creeps[`${creepName}_${level}_${creepNumber}`]) {
      creepNumber++;
    }
    creepName = `${creepName}_${level}_${creepNumber}`;
    let requiredEnergy = bodyAndLevel.body.reduce((sum, part) => sum + BODYPART_COST[part], 0);
    if (spawn.room.energyAvailable < requiredEnergy || requiredEnergy === 0) {
      logger.log(`Not enough energy to spawn creep: ${requiredEnergy}`, creepName, bodyAndLevel.body);
      return;
    }
    const result = spawn.spawnCreep(bodyAndLevel.body, creepName, creepRequest.options.memory);
    logger.log(`Spawning creep: ${result}`, creepName, bodyAndLevel.body, spawn.room.energyAvailable,  requiredEnergy, bodyAndLevel.body);
    if (result === OK) {
      creepRequest.callback(creepName);
      this.spawnQueue.pop(); // Remove the successfully spawned creep request from the queue
    } else {
      // logger.log(`Failed to spawn creep: ${result}`);
      // this.spawnQueue.pop(); // Remove the failed creep request from the queue
      // creepRequest.callback(false);
    }
  }
}

registerObjectWrapper(StructureSpawn, SpawnWrapper);
