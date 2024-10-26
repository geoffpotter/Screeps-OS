

import { AnyGameObjectWrapper, GameObjectWrapper } from "../../wrappers/base/GameObjectWrapper";
import { RoomWrapper } from "../../wrappers/room/RoomWrapper";
import WorldPosition from "shared/utils/map/WorldPosition";
import { baseStorable, StorableClass } from "shared/utils/memory/MemoryManager";
import { ActionDemand } from "./ActionDemand";
import { Priority } from "shared/utils/priority";
import { getGameObjectWrapperById } from "world_new/wrappers/base/AllGameObjects";
import { CanHazAction } from "./ActionHelpers";
import Logger from "shared/utils/logger";
import visual from "shared/utils/visual";
import { CachedValue } from "shared/utils/caching/CachedValue";
import { isString } from "lodash";
let logger = new Logger("BaseAction");

export interface ActionAssignment {
    assigned: AnyGameObjectWrapper;
    amount: ActionDemand;
    priority: number;
}

export abstract class BaseAction<
  TargetWrapperType extends AnyGameObjectWrapper | RoomWrapper | WorldPosition,
  AssignedWrapperType extends AnyGameObjectWrapper,
  DemandType extends BodyPartConstant | ResourceConstant = BodyPartConstant | ResourceConstant
> extends baseStorable {
  wpos: WorldPosition;
  assignments: Map<string, ActionAssignment> = new Map();
  maxRange: number = 1;
  maxAssignments: number = 0;
  actionType: string;

  protected _demandCache: CachedValue<ActionDemand<DemandType>> = new CachedValue(this.calculateDemand.bind(this), 1);
  get demand() {
    return this._demandCache.get();
  }

  constructor(
    id: string,
    public target: TargetWrapperType,
    public priority: number = Priority.NORMAL
  ) {
    super(id + "_" + target.id);
    // console.log("----------------------creating action", this.id, this.target.id, this.id);
    this.wpos = this.target instanceof WorldPosition ? this.target : this.target.wpos;
    this.actionType = this.constructor.name;
  }

  abstract canDo(object: AssignedWrapperType): boolean;
  abstract shouldDo(object: AssignedWrapperType, priority: number): boolean;
  abstract doAction(object: AssignedWrapperType): boolean;
  abstract calculateDemand(): ActionDemand<DemandType>;
  abstract getAssignmentAmount(object:AssignedWrapperType, priority:number): ActionDemand<DemandType>;


  assign(obj: AssignedWrapperType & CanHazAction, priority = Priority.NORMAL): boolean {
    obj.currentAction = this;
    // logger.log("assigning", obj.id, "to", this.id);
    this.clearLosers(obj, priority);
    let assignAmount = this.getAssignmentAmount(obj, priority);
    // logger.log("assignAmount?", this.id, obj.id, assignAmount);
    const assignment: ActionAssignment = {assigned: obj, amount: assignAmount, priority};
    this.assignments.set(obj.id, assignment);
    // logger.log("assigned", obj.id, "to", this.id, assignment.partAmounts);
    return true;
  }

  unassign(obj: AssignedWrapperType & CanHazAction) {
    logger.log("-----------------------unassigning------------------------------------------");
    if (!this.assignments.has(obj.id)) {
      throw new Error("trying to unassign object that isn't assigned. " + this.id + " " + obj.id);
    }
    this.assignments.delete(obj.id);
    obj.currentAction = false;
    logger.log("unassigned", obj.id, "from", this.id, this.assignments.size);
  }
  unassignAll() {
    for(let assignment of this.assignments.values()) {
      this.unassign(assignment.assigned as AssignedWrapperType & CanHazAction);
    }
    this.assignments.clear();
  }

  clearLosers(obj: AssignedWrapperType, priority: number) {
    let wpos = this.target instanceof WorldPosition ? this.target : this.target.wpos;
    const newObjRange = obj.wpos.getRangeTo(wpos);
    const loserAssignments = Array.from(this.assignments.values()).filter((assignment) => {
      const newObjCloser = assignment.assigned.wpos.getRangeTo(wpos) > newObjRange;
      const samePriority = priority === assignment.priority;
      const higherPriority = priority > assignment.priority;
      return higherPriority || (newObjCloser && samePriority);
    }).sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return b.assigned.wpos.getRangeTo(wpos) - a.assigned.wpos.getRangeTo(wpos);
    });
    while (this.overAllowedAssignments) {
      const loser = loserAssignments.shift();
      if (!loser) break;
      //@ts-ignore
      loser.assigned.currentAction = false;
      this.unassign(loser.assigned as AssignedWrapperType & CanHazAction);
    }
  }

  get overAllowedAssignments() {
    return this.maxAssignments > 0 && this.assignments.size >= this.maxAssignments;
  }

  valid() {
    return this.target instanceof WorldPosition || this.target.exists;
  }

  getAmountRemainingByPriorityAndLocation(priority: number, pos: WorldPosition): ActionDemand<DemandType> {
    const remainingDemand: ActionDemand<DemandType> = this.demand.clone() as ActionDemand<DemandType>;
    const targetRange = this.wpos.getRangeTo(pos);

    for (const assignedId in this.assignments) {
      const assignment = this.assignments.get(assignedId)!;
      if (assignment.priority <= priority && assignment.assigned.wpos.getRangeTo(pos) <= targetRange) {
        for (const demandType in assignment.amount) {
          if (remainingDemand.has(demandType as DemandType)) {
            let remainingDemandForType = remainingDemand.get(demandType as DemandType);
            if (!remainingDemandForType) {
              remainingDemand.delete(demandType as DemandType);
              continue;
            }
            let assignmentAmount = assignment.amount.get(demandType as DemandType) || 0;
            remainingDemandForType -= assignmentAmount;
            if (remainingDemandForType <= 0) {
              remainingDemand.delete(demandType as DemandType);
            } else {
              remainingDemand.set(demandType as DemandType, Math.max(0, remainingDemandForType));
            }
          }
        }
      }
    }

    return remainingDemand;
  }


  display() {
    // if (this.target instanceof GameObjectWrapper && this.target.wrapperType == "CreepWrapper") {
    //   return;
    // }
    // logger.enabled = true;
    // logger.log("display", this.id, this.actionType, this.currentDemand, this.assignments.size, new Error().stack);
    // logger.enabled = false;
    // if (this.hasDemand()) {
    visual.drawText(`${this.actionType}(${JSON.stringify(this.calculateDemand())})(${this.assignments.size})`, this.wpos.toRoomPosition());
    // }
  }

  //iterator for demand
  [Symbol.iterator](): Iterator<[DemandType, number]> {
    return this.demand.demand[Symbol.iterator]();
  }
}
