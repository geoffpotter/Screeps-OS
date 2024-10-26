import { BaseAction } from "world_new/actions/base/BaseAction";
import { BaseJob, canHazJob } from "./BaseJob";
import Logger from "shared/utils/logger";

const logger = new Logger("StructureJob");
logger.color = COLOR_CYAN;

export class StructureJob extends BaseJob {
  constructor(id: string) {
    super(id);
  }

  update() {
    logger.log("update", this.id, "#assigned", this.assignedObjects.size, "#actions", this.primaryActions.size, this.secondaryActions.size);
  }

  act() {
    this.updateMaxAssignments();
  }

  needsObject(object: canHazJob, checkParts: boolean): boolean {
    if (object.wrapperType === "CreepWrapper") {
        return false;
    }
    return true;
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

  assignObject(object: canHazJob) {
    if (this.maxAssignedObjects > 0 && this.assignedObjects.size >= this.maxAssignedObjects) {
      throw new Error(`Cannot assign object ${object.id} to job ${this.id}: maximum number of assigned objects (${this.maxAssignedObjects}) reached`);
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
}
