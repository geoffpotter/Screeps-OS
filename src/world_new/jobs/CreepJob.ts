import { BaseJob, canHazJob } from "./BaseJob";
import { CanSpawnCreeps, CreepRequest, CreepRequestOptions } from "../wrappers/creep/CreepRequest";
import CreepWrapper from "../wrappers/creep/CreepWrapper";
import { ActionDemand, DemandType } from "../actions/base/ActionDemand";
import { getTotalDemand } from "../actions/base/ActionHelpers";
import WorldPosition from "shared/utils/map/WorldPosition";
import { sleepUntilCreepExists } from "shared/polyfills/sleep";
import Logger from "shared/utils/logger";
import { BaseAction } from "world_new/actions/base/BaseAction";

const logger = new Logger("CreepJob");
logger.color = COLOR_CYAN;


type CreepRequestOptionsWithName = Partial<CreepRequestOptions> & Pick<CreepRequestOptions, "name">;

export class CreepJob extends BaseJob<CreepWrapper> {
  allowSpawning: boolean = true;
  protected spawner: CanSpawnCreeps;
  protected creepRequestOptions: CreepRequestOptionsWithName;
  isSpawning: boolean = false;

  constructor(
    id: string,
    spawner: CanSpawnCreeps,
    creepRequestOptions: CreepRequestOptionsWithName,
  ) {
    super(id);
    this.spawner = spawner;
    this.creepRequestOptions = creepRequestOptions;
    this.setupCreepRequestOptions();
  }

  private setupCreepRequestOptions() {
    this.creepRequestOptions.memory = this.creepRequestOptions.memory || {};
    if (!this.creepRequestOptions.memory.jobId) {
      this.creepRequestOptions.memory.jobId = this.id;
    }
  }

  update() {
    logger.log("update", this.id, "#assigned", this.assignedObjects.size, "#actions", this.primaryActions.size, this.secondaryActions.size, "maxAssignedObjects", this.maxAssignedObjects);
  }

  act() {
    this.updateMaxAssignments();

    if (this.isAtMaxCapacity()) {
      return;
    }

    const demandInfo = this.calculateCurrentDemand();
    if (!demandInfo) return;

    const { totalDemand, currentPartsAssigned, remainingDemand, demandPos } = demandInfo;

    this.handleCreepSpawning(remainingDemand, demandPos);
  }

  needsObject(object: CreepWrapper, checkParts: boolean): boolean {
    let overMax = this.maxAssignedObjects > 0 && this.assignedObjects.size >= this.maxAssignedObjects;
    if (overMax) {
      return false;
    }
    return object.name !== false && object.name.includes(this.creepRequestOptions.name);
  }

  private updateMaxAssignments() {
    const allActions = [...this.primaryActions.getAll(), ...this.secondaryActions.getAll()];

    if (this.maxAssignedObjects !== 0 || !this.allActionsHaveMaxAssignments(allActions)) {
      return;
    }

    this.maxAssignedObjects = this.calculateTotalMaxAssignments(allActions);
    this.logMaxAssignments(allActions);
  }

  private allActionsHaveMaxAssignments(actions: BaseAction<any, any>[]): boolean {
    return actions.every(action => action.maxAssignments > 0);
  }

  private calculateTotalMaxAssignments(actions: BaseAction<any, any>[]): number {
    return actions.reduce((total, action) => total + action.maxAssignments, 0);
  }

  private calculateCurrentDemand() {
    const { totalDemand, demandPos } = this.getTotalDemand();
    if (!demandPos) return false;

    const currentPartsAssigned = this.calculateCurrentPartsAssigned();
    const remainingDemand = this.calculateRemainingDemand(
      totalDemand as ActionDemand<any>,
      currentPartsAssigned as ActionDemand<any>
    );

    this.logDemandInfo(totalDemand, currentPartsAssigned, remainingDemand);

    return { totalDemand, currentPartsAssigned, remainingDemand, demandPos };
  }

  private calculateCurrentPartsAssigned(): ActionDemand<BodyPartConstant> {
    const currentPartsAssigned = new ActionDemand<BodyPartConstant>();

    this.assignedObjects.forEach(assignedObject => {
      if (assignedObject.wrapperType !== "CreepWrapper") return;

      const creepWrapper = assignedObject as CreepWrapper;
      const body = creepWrapper.getObject()?.body || [];
      body.forEach(part => {
        currentPartsAssigned.add(part.type, 1);
      });
    });

    return currentPartsAssigned;
  }

  private calculateRemainingDemand<T extends DemandType>(
    totalDemand: ActionDemand<T>,
    currentPartsAssigned: ActionDemand<T>
  ): ActionDemand<T> {
    const remainingDemand = new ActionDemand<T>();
    remainingDemand.addAll(totalDemand);
    remainingDemand.subtractAll(currentPartsAssigned);
    return remainingDemand;
  }

  private handleCreepSpawning(
    remainingDemand: ActionDemand<BodyPartConstant>,
    demandPos: WorldPosition
  ) {
    if (!this.shouldSpawnCreep(remainingDemand)) return;

    const creepRequest = this.getCreepRequestFromDemand(remainingDemand, demandPos);
    if (!creepRequest) return;

    this.spawnCreep(creepRequest);
  }

  private shouldSpawnCreep(remainingDemand: ActionDemand<BodyPartConstant>): boolean {
    return (
      this.allowSpawning &&
      !this.isSpawning &&
      remainingDemand.getTotal() > 0 &&
      (this.maxAssignedObjects == 0 || this.assignedObjects.size < this.maxAssignedObjects)
    );
  }

  private async spawnCreep(creepRequest: CreepRequest) {
    logger.log("Spawning creep", creepRequest);
    this.isSpawning = true;

    try {
      const creepName = await this.spawner.spawnCreep(creepRequest);
      if (creepName) {
        await this.handleSuccessfulSpawn(creepName);
      }
    } finally {
      this.isSpawning = false;
    }
  }

  private async handleSuccessfulSpawn(creepName: string) {
    logger.log("Waiting for creep to exist", creepName);
    await sleepUntilCreepExists(creepName);
    logger.log("Creep exists", creepName);
  }

  private getTotalDemand(): { totalDemand: ActionDemand; demandPos: false | WorldPosition; } {
    return getTotalDemand(this.primaryActions.getAll());
  }

  getCreepRequestFromDemand(totalDemand: ActionDemand, demandPos: WorldPosition): CreepRequest {
    let parts = Array.from(totalDemand.demand.keys());
    let demands = Array.from(totalDemand.demand.values());

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

  assignObject(object: CreepWrapper) {
    if (this.maxAssignedObjects > 0 && this.assignedObjects.size >= this.maxAssignedObjects) {
      // throw new Error(`Cannot assign object ${object.id} to job ${this.id}: maximum number of assigned objects (${this.maxAssignedObjects}) reached`);
      logger.log(this.id, "ignoring assignment of", object.name, "to job", this.id, "because max assigned objects reached");
      return;
    }
    //@ts-ignore deosnt get that wrpperType == constructor.name
    if (object.wrapperType === "CreepWrapper" && !String(object.name).includes(this.creepRequestOptions.name)) {
        //@ts-ignore deosnt get that wrpperType == constructor.name
        // throw new Error(`Cannot assign object ${object.name} to job ${this.id}: creep request name does not match`);
        logger.log(this.id, "ignoring assignment of", object.name, "to job", this.id, "because name does not match");
        return;
    }
    this.assignedObjects.add(object);
    if (object.assignedJob) {
      object.assignedJob.unassignObject(object);
    }
    object.assignedJob = this;
    logger.log("assigned object", object.id, "to job", this.id, this.assignedObjects.size, "assigned objects");
  }

  private logMaxAssignments(actions: BaseAction<any, any>[]) {
    logger.log(
      "Max assignments calculated:",
      "total:", this.maxAssignedObjects,
      "actions:", actions.map(a => `${a.id}:${a.maxAssignments}`).join(', ')
    );
  }

  private logDemandInfo(
    totalDemand: ActionDemand<any>,
    currentPartsAssigned: ActionDemand<any>,
    remainingDemand: ActionDemand<any>
  ) {
    logger.log(
      "Demand info:", this.id,
      "\nTotal:", totalDemand.toString(),
      "\nAssigned:", currentPartsAssigned.toString(),
      "\nRemaining:", remainingDemand.toString()
    );
  }
}
