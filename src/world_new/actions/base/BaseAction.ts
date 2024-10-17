import loggerClass from "utils/logger";
import { GameObjectWrapper, type AnyGameObjectWrapper } from "../../wrappers/base/GameObjectWrapper";
import { getGameObjectWrapperById } from "../../wrappers/base/AllGameObjects";
import { CachedValue } from "shared/utils/caching/CachedValue";
import WorldPosition from "shared/utils/map/WorldPosition";
import MemoryMap from "shared/utils/memory/MemoryMap";
import { baseStorable } from "shared/utils/memory";
import visual from "utils/visual";
import NodeNetwork from "shared/subsystems/NodeNetwork/nodeNetwork";
import { constructorTypeOf, StaticImplements } from "shared/utils/types";
import MemoryManager, { StorableClass } from "shared/utils/memory/MemoryManager";
import type { RoomWrapper } from "world_new/wrappers/room/RoomWrapper";
import { setInterval } from "shared/polyfills/setInterval";
import { CreepWrapper } from "world_new/wrappers";
import { priority } from "shared/utils/priority";
import { ActionDemand } from "./ActionHelpers";
const logger = new loggerClass("BaseAction");
logger.enabled = false;

// Define actions types
export class ActionTypes {
  static HARVEST = "⛏";
  static PRAISE = "🙌";
  static BUILD = "🔨️";
  static REPAIR = "🔧";
  static FILLTOWERS = "🗼";
  static DROP = "🚯";

  static PICKUP = "📤";
  static DROPOFF = "📥";

  static KILL = "🔪";
  static KILLBUILDING = "🔪🏢";

  static SCOUT = "👀";
}

export interface CanHazAction {
  currentAction: AnyAction | false;
}

export function findClosestAction<ActionType extends AnyAction>(actions: AnyAction[], obj: AnyGameObjectWrapper, types: Function[]): ActionType | false {
  let closestAction: ActionType | false = false;
  let closestActionDist = Infinity;

  for (const action of actions) {
    if (!action.canDo(obj) || !types.some(type => action instanceof type)) continue;

    const actionDist = obj.wpos.getRangeTo(action.target.wpos);
    logger.log(obj.id, "checking action", action.id, actionDist, closestActionDist);

    if (actionDist < closestActionDist) {
      closestAction = action as ActionType;
      closestActionDist = actionDist;
      logger.log(obj.id, "found closer action", action.id, actionDist);
    }
  }

  logger.log('found closest Action:', closestAction && closestAction.id, "at range", closestActionDist);
  return closestAction;
}

export type AnyActionAssignment = baseActionAssignment<AnyGameObjectWrapper, AnyAction>;


export interface baseActionAssignmentMemory {
  actionId: string;
  assignedId: string;
  priority: number;
  partAmounts: ActionDemand;
}
export class baseActionAssignment<AssignedWrapperType extends AnyGameObjectWrapper = AnyGameObjectWrapper, ActionType extends AnyAction = AnyAction> extends baseStorable implements StorableClass<baseActionAssignment, typeof baseActionAssignment, baseActionAssignmentMemory> {
  static fromJSON(json: baseActionAssignmentMemory, wrapper?: baseActionAssignment<any, any>, action?: AnyAction) {
    if(!wrapper) {
      if (!action) {
        throw new Error("action not found in action assignment " + json.actionId);
      }
      let assigned = getGameObjectWrapperById(json.assignedId);
      if (!assigned) {
        throw new Error("assigned object not found in action assignment " + json.assignedId);
      }
      wrapper = new baseActionAssignment(action, assigned, json.priority) as baseActionAssignment<any, any>;
    }
    wrapper.priority = json.priority;
    return wrapper;
  }
  private _distanceToTarget: CachedValue<number>;
  constructor(
    public action: ActionType,
    public assigned: AssignedWrapperType,
    public priority: number = 0,
    public partAmounts: ActionDemand = {}
  ) {
    super(`${action.id}-${assigned.id}`);
    this._distanceToTarget = new CachedValue<number>(() =>
      this.action.target.wpos.getRangeTo(this.assigned.wpos),
      1
    );
  }

  get distanceToTarget() { return this._distanceToTarget.get(); }
}

export type AnyAction<AssignedWrapperType extends AnyGameObjectWrapper = AnyGameObjectWrapper> = BaseAction<AnyGameObjectWrapper, AssignedWrapperType>;




export interface BaseActionMemory {
  targetId: string;
  assignments: Map<string, baseActionAssignmentMemory>;
  maxRange: number;
  maxAssignments: number;
  priority: number;
  currentDemand: ActionDemand;
}
export abstract class BaseAction<
  TargetWrapperType extends AnyGameObjectWrapper | RoomWrapper | WorldPosition,
  AssignedWrapperType extends AnyGameObjectWrapper,
  AssignmentType extends baseActionAssignment<AssignedWrapperType> = baseActionAssignment<AssignedWrapperType>
> extends baseStorable {
  static fromJSON<assignType extends typeof baseActionAssignment<any, any>>(json: BaseActionMemory, action?: BaseAction<any, any, any>, assignmentType?: assignType): BaseAction<any, any, any> {
    if (!action || !assignmentType) {
      // Cannot instantiate an abstract class; derived classes should handle instantiation
      throw new Error("Cannot instantiate abstract BaseAction directly. Please provide an instance and assignment type.");
    }
    action.maxRange = json.maxRange;
    action.maxAssignments = json.maxAssignments;
    action.priority = json.priority;
    action.currentDemand = json.currentDemand;
    // Deserialize assignments if necessary
    for (const [assignedId, assignmentJSON] of json.assignments) {
      const assignment = assignmentType.fromJSON(assignmentJSON, undefined, action);
      action.assignments.set(assignedId, assignment);
    }
    return action;
  }
  toJSON(): BaseActionMemory {
    return {
      targetId: this.target.id,
      assignments: this.assignments as unknown as Map<string, baseActionAssignmentMemory>,
      maxRange: this.maxRange,
      maxAssignments: this.maxAssignments,
      priority: this.priority,
      currentDemand: this.currentDemand,
    };
  }
  wpos: WorldPosition;
  assignments: Map<string, AssignmentType> = new Map();
  maxRange: number = 1;
  maxAssignments: number = 0;
  priority: number = priority.NORMAL;
  /**
   * The current demand for this action.  Units will depend on the final action type.
   * For example a BasePartAction will be in body part units, while a BaseResourceAction will be in resource units.
   */
  currentDemand: ActionDemand = {};
  get assignmentAdjustedDemand() {
    let demand = this.currentDemand;
    let assignedParts = this.getCurrentAssignedParts();
    for(let part in assignedParts) {
      if(!demand[part as BodyPartConstant]) {
        demand[part as BodyPartConstant] = 0;
      }
      //@ts-ignore
      demand[part as BodyPartConstant] -= assignedParts[part as BodyPartConstant];
    }
    return demand;
  }
  constructor(
    public actionType: string,
    public target: TargetWrapperType,
    protected assignmentConstructor:constructorTypeOf<baseActionAssignment<AssignedWrapperType>> = baseActionAssignment
  ) {
    super(actionType + ":" + target.id);
    this.target = target;
    if(target instanceof GameObjectWrapper) {
      this.wpos = target.wpos;
    } else if(target instanceof WorldPosition) {
      this.wpos = target;
    } else {
      this.wpos = target.wpos;
    }
  }

  assign(obj: AssignedWrapperType & CanHazAction, priority = 1): boolean {
    obj.currentAction = this as AnyAction<AssignedWrapperType>;
    // logger.log("assigning", obj.id, "to", this.id);
    this.clearLosers(obj, priority);
    let assignAmount = this.getAssignmentAmount(obj, priority);
    // logger.log("assignAmount?", this.id, obj.id, assignAmount);
    const assignment = new this.assignmentConstructor(this, obj, priority, assignAmount) as AssignmentType;
    this.assignments.set(obj.id, assignment as AssignmentType);
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

  abstract doAction(object: AssignedWrapperType): boolean;

  canDo(object: AssignedWrapperType): boolean {
    return object.id !== this.target.id;
  }
  shouldDo(object: AssignedWrapperType, priority:number): boolean {
    let assignmentAmount = this.getAssignmentAmount(object, priority);
    logger.log("should do", this.id, object.id, assignmentAmount);
    return Object.values(assignmentAmount).some(value => value > 0);
  }
  hasDemand() {
    return Object.values(this.currentDemand).some(value => value > 0);
  }

  getCurrentAssignedParts(): ActionDemand {
    const demand: ActionDemand = {};
    for(let assignment of this.assignments.values()) {
      let body = [];
      let assigned = assignment.assigned.getObject();
      if(!(assigned instanceof Creep)) continue;
      for(let part in assigned.body) {

        if(!demand[part as BodyPartConstant]) {
          demand[part as BodyPartConstant] = 0;
        }
        //@ts-ignore
        demand[part as BodyPartConstant] += assigned.body.filter(p=>p.type == part).length;
      }
    }
    return demand;
  }

  get roomName() {
    return this.wpos.roomName;
  }

  display() {
    if (this.target instanceof GameObjectWrapper && this.target.wrapperType == "CreepWrapper") {
      return;
    }
    // logger.enabled = true;
    // logger.log("display", this.id, this.actionType, this.currentDemand, this.assignments.size, new Error().stack);
    // logger.enabled = false;
    // if (this.hasDemand()) {
    visual.drawText(`${this.actionType}(${JSON.stringify(this.currentDemand)})(${this.assignments.size})`, this.wpos.toRoomPosition());
    // }
  }

  isAssigned(obj: AssignedWrapperType) {
    return this.assignments.has(obj.id);
  }

  valid() {
    if (this.target instanceof WorldPosition) {
      return true;
    }
    return this.target.exists;
  }

  clearLosers(obj: AssignedWrapperType, priority: number) {
    let wpos = this.target instanceof WorldPosition ? this.target : this.target.wpos;
    const newObjRange = obj.wpos.getRangeTo(wpos);
    const loserAssignments = Array.from(this.assignments.values()).filter((assignment) => {
      const newObjCloser = assignment.distanceToTarget > newObjRange;
      const samePriority = priority === assignment.priority;
      const higherPriority = priority > assignment.priority;
      return higherPriority || (newObjCloser && samePriority);
    }).sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return b.distanceToTarget - a.distanceToTarget;
    });
    while (this.overAllowedAssignments()) {
      const loser = loserAssignments.shift();
      if (!loser) break;
      //@ts-ignore
      loser.assigned.currentAction = false;
      this.unassign(loser.assigned as AssignedWrapperType & CanHazAction);
    }
  }

  overAllowedAssignments() {
    return this.maxAssignments > 0 && this.assignments.size >= this.maxAssignments;
  }

  predictedDoneTick(object: AssignedWrapperType): number {
    const currentTick = Game.time;
    let wpos = this.target instanceof WorldPosition ? this.target : this.target.wpos;
    // const pathToTarget = NodeNetwork.findPath(wpos, object.wpos);
    const pathToTarget = PathFinder.search(wpos.toRoomPosition(), object.wpos.toRoomPosition());
    if (!pathToTarget) return Infinity;
    const ticksFromTarget = pathToTarget.cost;
    return currentTick + ticksFromTarget;
  }

  abstract calculateDemand(): ActionDemand;

  getAmountRemainingByPriorityAndLocation(priority: number, pos: WorldPosition): ActionDemand {
    const remainingDemand: ActionDemand = this.calculateDemand();
    const targetRange = this.wpos.getRangeTo(pos);

    for (const assignment of this.assignments.values()) {
      if (assignment.priority <= priority && assignment.distanceToTarget <= targetRange) {
        for (const part in assignment.partAmounts) {
          if (remainingDemand[part as BodyPartConstant]) {
            let remainingDemandForPart = remainingDemand[part as BodyPartConstant];
            if (!remainingDemandForPart) {
              delete remainingDemand[part as BodyPartConstant];
              continue;
            }
            let assignmentAmount = assignment.partAmounts[part as BodyPartConstant] || 0;
            remainingDemandForPart -= assignmentAmount;
            if (remainingDemandForPart <= 0) {
              delete remainingDemand[part as BodyPartConstant];
            } else {
              remainingDemand[part as BodyPartConstant] = Math.max(0, remainingDemandForPart);
            }
          }
        }
      }
    }

    return remainingDemand;
  }
  getAssignmentAmount(object:AssignedWrapperType, priority:number): ActionDemand {
    let remaining = this.getAmountRemainingByPriorityAndLocation(priority, object.wpos);
    logger.log("getAssignmentAmount3", this.id, object.id, remaining);
    return remaining;
  }
  getRemainingDemandByPriority(): { [priority: number]: ActionDemand } {
    const demandByPriority: { [priority: number]: ActionDemand } = {};
    const totalDemand = this.calculateDemand();

    for (const assignment of this.assignments) {
      const priority = assignment[1].priority;
      if (!demandByPriority[priority]) {
        demandByPriority[priority] = { ...totalDemand };
      }

      for (const part in assignment[1].partAmounts) {
        const amount = assignment[1].partAmounts[part as BodyPartConstant] || 0;
        if (demandByPriority[priority][part as BodyPartConstant]) {
          demandByPriority[priority][part as BodyPartConstant]! -= amount;
        }
      }
    }

    return demandByPriority;
  }

  getRemainingDemandByLocation(): { [roomName: string]: ActionDemand } {
    const demandByLocation: { [roomName: string]: ActionDemand } = {};
    const totalDemand = this.calculateDemand();

    for (const assignment of this.assignments) {
      const roomName = assignment[1].assigned.wpos.roomName;
      if (!demandByLocation[roomName]) {
        demandByLocation[roomName] = { ...totalDemand };
      }

      for (const part in assignment[1].partAmounts) {
        const amount = assignment[1].partAmounts[part as BodyPartConstant] || 0;
        if (demandByLocation[roomName][part as BodyPartConstant]) {
          demandByLocation[roomName][part as BodyPartConstant]! -= amount;
        }
      }
    }

    return demandByLocation;
  }
}
