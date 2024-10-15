import MemoryManager, { StorableClass } from "shared/utils/memory/MemoryManager";
import { BaseAction } from "../actions/base/BaseAction";
import { ActionDemand, getTotalDemand } from "../actions/base/ActionHelpers";
import CreepWrapper from "../wrappers/creep/CreepWrapper";
import { baseStorable, StorableCreatableClass, MemorySet, MemoryGroupedCollection } from "shared/utils/memory";
import MemoryMap, { MemoryMapJSON } from "shared/utils/memory/MemoryMap";
import { GameObjectWrapper } from "world_new/wrappers/base/GameObjectWrapper";
import Logger from "shared/utils/logger";
import { CanSpawnCreeps, CreepRequest, CreepRequestOptions } from "../wrappers/creep/CreepRequest";
import WorldPosition from "shared/utils/map/WorldPosition";
import { sleepUntilCreepExists } from "shared/polyfills/sleep";

const logger = new Logger("Job");
logger.color = COLOR_CYAN;
logger.enabled = false;

export interface canHazJob extends GameObjectWrapper<any> {
  assignedJob: Job | false;
  currentAction: BaseAction<GameObjectWrapper<any>, any, any> | false;
}

export interface JobMemory {
  id: string;
  primaryActionsCollectionId: string;
  secondaryActionsCollectionId: string;
  allowSpawning: boolean;
  assignedObjects: MemorySet<canHazJob>;
  spawnerId: string;
  creepRequestOptions: CreepRequestOptionsWithName;
  isSpawning: boolean;
  maxAssignedObjects: number; // Add this line
}

type CreepRequestOptionsWithName = Partial<CreepRequestOptions> & Pick<CreepRequestOptions, "name">;

export class Job extends baseStorable implements StorableClass<Job, typeof Job, JobMemory> {
  static fromJSON(json: JobMemory, spawner?: CanSpawnCreeps): Job {
    if (!spawner) {
      throw new Error("Spawner is required to create a Job");
    }
    let job = new Job(json.id, spawner, json.creepRequestOptions);
    job.isSpawning = json.isSpawning;
    job.maxAssignedObjects = json.maxAssignedObjects;
    return job;
  }
  toJSON(): JobMemory {
    return {
      id: this.id,
      primaryActionsCollectionId: this.primaryActions.id,
      secondaryActionsCollectionId: this.secondaryActions.id,
      allowSpawning: this.allowSpawning,
      assignedObjects: this.assignedObjects,
      spawnerId: (this.spawner as any).id,
      creepRequestOptions: this.creepRequestOptions,
      isSpawning: this.isSpawning,
      maxAssignedObjects: this.maxAssignedObjects
    };
  }

  allowSpawning: boolean = true;
  protected assignedObjects: MemorySet<canHazJob>;
  protected spawner: CanSpawnCreeps;
  protected creepRequestOptions: CreepRequestOptionsWithName;
  isSpawning: boolean = false;
  maxAssignedObjects: number;
  protected primaryActions: MemoryGroupedCollection<BaseAction<any, any>>;
  protected secondaryActions: MemoryGroupedCollection<BaseAction<any, any>>;

  constructor(
    id: string,
    spawner: CanSpawnCreeps,
    creepRequestOptions: CreepRequestOptionsWithName,
  ) {
    super(id);
    this.assignedObjects = new MemorySet<canHazJob>(this.fullId + "_assignedObjects");
    this.primaryActions = new MemoryGroupedCollection<BaseAction<any, any>>(this.fullId + "_primaryActions", "id", ["actionType"], undefined, false);
    this.secondaryActions = new MemoryGroupedCollection<BaseAction<any, any>>(this.fullId + "_secondaryActions", "id", ["actionType"], undefined, false);
    this.spawner = spawner;
    this.creepRequestOptions = creepRequestOptions;
    this.maxAssignedObjects = 0;

    // Set default values if not provided
    this.creepRequestOptions.memory = creepRequestOptions.memory || {};
    if (!this.creepRequestOptions.memory.jobId) {
      this.creepRequestOptions.memory.jobId = this.id;
    }

    this.primaryActions = new MemoryGroupedCollection<BaseAction<any, any>>(this.fullId + "_primaryActions", "id", ["actionType"], undefined, false);
    this.secondaryActions = new MemoryGroupedCollection<BaseAction<any, any>>(this.fullId + "_secondaryActions", "id", ["actionType"], undefined, false);
  }

  update() {
    logger.log("update", this.id, "#assigned", this.assignedObjects.size, "#actions", this.primaryActions.size, this.secondaryActions.size, "maxAssignedObjects", this.maxAssignedObjects);
  };
  act() {
    // override maxAssignedObjects with the max assigned objects from all the actions, if maxAssignedObjects is 0
    let allActions = [...this.primaryActions.getAll(), ...this.secondaryActions.getAll()];
    if(this.maxAssignedObjects === 0 && allActions.filter(action=>action.maxAssignments > 0).length == allActions.length) {
      this.maxAssignedObjects = allActions
        .reduce((total, action) => total + action.maxAssignments, 0);
      for(let action of allActions) {
        logger.log("action", action.id, "maxAssignments", action.maxAssignments);
      }
      logger.log("overring maxAssignedObjects", this.id, this.maxAssignedObjects, this.primaryActions.size, this.secondaryActions.size, allActions.length);
    }
    logger.log("act", this.id, "#assigned", this.assignedObjects.size, "of max", this.maxAssignedObjects, "#actions", this.primaryActions.size, this.secondaryActions.size);
    if(this.maxAssignedObjects > 0 && this.assignedObjects.size >= this.maxAssignedObjects) {
      return;
    }
    // determine total demand for this job
    let { totalDemand, demandPos }: { totalDemand: ActionDemand; demandPos: false | WorldPosition; } = this.getTotalDemand();
    let currentPartsAssigned: ActionDemand = {};
    this.assignedObjects.forEach(assignedObject => {
      if (assignedObject.wrapperType === "CreepWrapper") {
        let creepWrapper = assignedObject as CreepWrapper;
        let bodyClassification = creepWrapper.getBodyClassification()
        // logger.log("processing creep", creepWrapper.id, bodyClassification.demand, currentPartsAssigned);
        for (let part in bodyClassification.demand) {
          currentPartsAssigned[part as BodyPartConstant] = (currentPartsAssigned[part as BodyPartConstant] || 0) + (bodyClassification.demand[part as BodyPartConstant] || 0);
        }
      }
    });
    let remainingDemand = _.mapValues(totalDemand, (value, key) => value - (currentPartsAssigned[key as BodyPartConstant] || 0));
    let totalRemainingDemand = _.sum(Object.values(remainingDemand));
    logger.log("Total demand for job", this.id, JSON.stringify(totalDemand), "num actions", this.numActions(), "current parts assigned", JSON.stringify(currentPartsAssigned), " (", this.assignedObjects.size, "creeps assigned)", "remaining demand", JSON.stringify(remainingDemand));
    // Handle creep requests if allowed
    logger.log("should we spawn?", this.allowSpawning, demandPos, !this.isSpawning, totalRemainingDemand);
    if (this.allowSpawning && demandPos && !this.isSpawning && totalRemainingDemand > 0) {
      // Create a CreepRequest based on the total demand
      let creepRequest = this.getCreepRequestFromDemand(totalDemand, demandPos);

      if (creepRequest) {
        logger.log("Spawning creep", creepRequest);
        this.isSpawning = true;
        this.spawner.spawnCreep(creepRequest).then(async (creepName: string | false) => {
          logger.log("Spawned creep", creepName);
          if (creepName) {
            logger.log("Waiting for creep to exist", creepName);
            await sleepUntilCreepExists(creepName);
            logger.log("Creep exists", creepName);
            this.isSpawning = false;
            let creep = Game.creeps[creepName];
            // let creepWrapper = creep.getWrapper<CreepWrapper>();
            // this.assignObject(creepWrapper);
          }
        }).finally(() => {
          this.isSpawning = false;
        });

      }
    }
  };
  private getTotalDemand(): { totalDemand: ActionDemand; demandPos: false | WorldPosition; } {
    return getTotalDemand(this.primaryActions.getAll());
  }

  getCreepRequestFromDemand(totalDemand: ActionDemand, demandPos: WorldPosition): CreepRequest {
    let parts = Object.keys(totalDemand);
    let demands = Object.values(totalDemand);

    let maxDemand = Math.max(...demands);
    let secondMaxDemand = Math.max(...demands.filter((demand, index) => index !== demands.indexOf(maxDemand)));
    let primaryPart = this.creepRequestOptions.primaryPart || parts[demands.indexOf(maxDemand)] as BodyPartConstant;
    let secondaryPart = this.creepRequestOptions.secondaryPart || parts[demands.indexOf(secondMaxDemand)] as BodyPartConstant | false;


    let requestOptions: CreepRequestOptions = {
      name: this.creepRequestOptions.name || this.id,
      primaryPart,
      secondaryPart,
      secondaryPerPrimary: this.creepRequestOptions.secondaryPerPrimary || 1,
      fatness: this.creepRequestOptions.fatness || 1,
      toughness: this.creepRequestOptions.toughness || 0,
      maxLevel: this.creepRequestOptions.maxLevel || 1000,
      minLevel: this.creepRequestOptions.minLevel || 1,
      priority: this.creepRequestOptions.priority || 0,
      memory: this.creepRequestOptions.memory,

    }

    return new CreepRequest(demandPos, requestOptions);
  }

  numActions(): number {
    return this.primaryActions.size + this.secondaryActions.size;
  }

  syncActions(newPrimaryActions: BaseAction<any, any>[], newSecondaryActions?: BaseAction<any, any>[]) {
    this.syncActionCollection(this.primaryActions, newPrimaryActions);
    if (newSecondaryActions) {
      this.syncActionCollection(this.secondaryActions, newSecondaryActions);
    }
  }

  private syncActionCollection(collection: MemoryGroupedCollection<BaseAction<any, any>>, newActions: BaseAction<any, any>[]) {
    for(let action of newActions) {
      if(!collection.hasId(action.id)) {
        collection.add(action);
      }
    }
    for(let action of collection.getAll()) {
      if(!newActions.some(newAction=>newAction.id === action.id)) {
        collection.removeById(action.id);
      }
    }
  }

  addPrimaryAction(action: BaseAction<any, any>) {
    this.primaryActions.add(action);
  }

  addSecondaryAction(action: BaseAction<any, any>) {
    this.secondaryActions.add(action);
  }

  removeAction(action: BaseAction<any, any>) {
    if (this.primaryActions.hasId(action.id)) {
      this.primaryActions.removeById(action.id);
    } else if (this.secondaryActions.hasId(action.id)) {
      this.secondaryActions.removeById(action.id);
    }
  }

  hasAction(action: BaseAction<any, any>) {
    return this.primaryActions.hasId(action.id) || this.secondaryActions.hasId(action.id);
  }

  forEachAction(callback: (action: BaseAction<any, any>, id: string, collection: MemoryGroupedCollection<BaseAction<any, any>>) => void) {
    this.primaryActions.forEach(callback);
    this.secondaryActions.forEach(callback);
  }

  assignObject(object: canHazJob) {
    if (this.maxAssignedObjects > 0 && this.assignedObjects.size >= this.maxAssignedObjects) {
      throw new Error(`Cannot assign object ${object.id} to job ${this.id}: maximum number of assigned objects (${this.maxAssignedObjects}) reached`);
    }
    //@ts-ignore
    if (object.wrapperType === "CreepWrapper" && !String(object.name).includes(this.creepRequestOptions.name)) {
      //@ts-ignore
      throw new Error(`Cannot assign object ${object.name} to job ${this.id}: creep request name does not match`);
    }
    this.assignedObjects.add(object);
    if (object.assignedJob) {
      object.assignedJob.unassignObject(object);
    }
    object.assignedJob = this;
    logger.log("assigned object", object.id, "to job", this.id, this.assignedObjects.size, "assigned objects");
  }
  unassignObject(object: canHazJob) {
    this.assignedObjects.delete(object);
    object.assignedJob = false;
    logger.log("unassigned object", object.id, "from job", this.id, this.assignedObjects.size, "assigned objects");
  }

  canDo(object: canHazJob) {
    return this.canDoInCollection(object, this.primaryActions) || this.canDoInCollection(object, this.secondaryActions);
  }

  private canDoInCollection(object: canHazJob, collection: MemoryGroupedCollection<BaseAction<any, any>>) {
    for (let action of collection.getAll()) {
      if (action.canDo(object)) {
        return true;
      }
    }
    return false;
  }

  needsObject(object: canHazJob, useName: boolean = true) {
    if (useName) {
      if (object.wrapperType === "CreepWrapper" && (this.maxAssignedObjects === 0 || this.assignedObjects.size < this.maxAssignedObjects)) {
        let creepWrapper = object as CreepWrapper;
        if (creepWrapper.name && creepWrapper.name.includes(this.creepRequestOptions.name)) {
          logger.log("creep name includes job name", creepWrapper.name, this.creepRequestOptions.name);
          return true;
        }
        //@ts-ignore
        logger.log("creep name does not include job name", object.name, this.creepRequestOptions.name, object.wrapperType);
        return false;
      }
      logger.log("object does not have a name", object.constructor.name);
      return false;
    }
    logger.log("not using name, checking if object needs to be assigned");
    throw new Error("How did we get here?");
    //@ts-ignore
    // if (this.id.includes("hauler")) {
    //   logger.enabled = true;
    // } else {
    //   logger.enabled = false;
    // }
    if (this.maxAssignedObjects > 0 && this.assignedObjects.size >= this.maxAssignedObjects) {
      logger.log(`Cannot assign object ${object.id} to job ${this.id}: maximum number of assigned objects (${this.maxAssignedObjects}) reached`);
      return false;
    }
    //reject creeps with parts we don't need
    if (object.wrapperType == "CreepWrapper") {
      let creepWrapper = object as CreepWrapper;
      let bodyClassification = creepWrapper.getBodyClassification();
      let demand = this.getTotalDemand().totalDemand;
      logger.log(this.id, "checking creep", creepWrapper.name, "demand", demand, "body classification", bodyClassification.demand);
      for (let part in bodyClassification.demand) {
        if (part === "move") {
          continue;
        }
        //@ts-ignore
        if (bodyClassification.demand[part as BodyPartConstant] === 0) {
          logger.log(this.id, "skipping part", part, "demand", demand[part as BodyPartConstant], "body classification", bodyClassification.demand[part as BodyPartConstant]);
          continue;
        }
        //@ts-ignore
        if (!(demand[part as BodyPartConstant] > 0)) {
          logger.log(this.id, "creep has part wo don't need", part, "demand", demand[part as BodyPartConstant], "body classification", bodyClassification.demand[part as BodyPartConstant]);
          return false;
        }
        logger.log(this.id, "creep has part we need", part, "demand", demand[part as BodyPartConstant], "body classification", bodyClassification.demand[part as BodyPartConstant]);
      }
    }
    return this.needsObjectInCollection(object, this.primaryActions) || this.needsObjectInCollection(object, this.secondaryActions);
  }

  private needsObjectInCollection(object: canHazJob, collection: MemoryGroupedCollection<BaseAction<any, any>>) {
    for (let action of collection.getAll()) {
      if (!action.canDo(object)) {
        continue;
      }
      let demand = action.currentDemand;
      let totalDemand = _.sum(Object.values(demand));
      if (totalDemand > 0) {
        return true;
      }
    }
    return false;
  }

  findActionForObject(object: canHazJob) {
    logger.log("finding action for object", object.id, this.id);

    let allActions = [...this.primaryActions.getAll(), ...this.secondaryActions.getAll()];
    logger.log("allActions", allActions.map(action=>action.id));
    let validActions = allActions.filter(action => (
      action.canDo(object) && action.hasDemand() && action.shouldDo(object)
    ));
    logger.log("validActions", validActions.map(action=>action.id));
    let sortedActions = validActions.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.wpos.getRangeTo(object.wpos) - b.wpos.getRangeTo(object.wpos);
    });

    return sortedActions[0] || false;
  }

}
