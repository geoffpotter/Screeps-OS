import loggerClass from "utils/logger";

let logger = new loggerClass("baseResourceAction");
logger.enabled = false;
import { GameObject, GameObjectWrapper } from "../../wrappers/base/GameObjectWrapper";
import { CachedValue } from "shared/utils/caching/CachedValue";

import { ResourceInfoCollection, ResourceInfoCollectionJSON } from "shared/utils/Collections/ResourceInfoCollection";
import { BodyPartInfoCollection } from "shared/utils/Collections/BodyInfoCollection";
import { HasStorage, HasStorageWrapper } from "../../wrappers/base/HasStorageWrapper";
import { baseActionAssignment, BaseAction, AnyAction, BaseActionMemory, CanHazAction } from "./BaseAction";
import { ActionDemand } from "./ActionHelpers";
import WorldPosition from "shared/utils/map/WorldPosition";
import type { CreepWrapper } from "world_new/wrappers";




class BaseResourceActionAssignment<AssignedWrapperType extends HasStorageWrapper<HasStorage>,
                                    ActionType extends BaseResourceAction<AssignedWrapperType>
                                    > extends baseActionAssignment<AssignedWrapperType, ActionType> {
  assignAmounts: ResourceInfoCollection;

  constructor(action: ActionType, assigned: AssignedWrapperType, priority: number = 0, partAmounts: ActionDemand = {}) {
    super(action, assigned, priority, partAmounts)
    let assignAmts = action.getAssignmentAmountInResources(assigned);
    this.assignAmounts = assignAmts
  }
}

export interface BaseResourceActionMemory extends BaseActionMemory {
  resourceAmounts: ResourceInfoCollectionJSON;
}

export abstract class BaseResourceAction<TargetWrapperType extends HasStorageWrapper<any> = HasStorageWrapper<any>,
                                AssignedWrapperType extends HasStorageWrapper<any> = HasStorageWrapper<any>
                                > extends BaseAction<TargetWrapperType, AssignedWrapperType, BaseResourceActionAssignment<AssignedWrapperType, BaseResourceAction<AssignedWrapperType>>>  {
  static fromJSON(json: BaseResourceActionMemory, action?: BaseResourceAction<any, any>): BaseResourceAction<any, any> {
    if (!action) {
      throw new Error("Cannot instantiate abstract BaseResourceAction directly. Please provide an instance and assignment type.");
    }
    BaseAction.fromJSON(json, action, BaseResourceActionAssignment);
    action.resourceAmounts = ResourceInfoCollection.fromJSON(json.resourceAmounts);
    return action;
  }
  resourceAmounts: ResourceInfoCollection;

  constructor(actionType = "not implemented!!!", target: TargetWrapperType) {
    super(actionType, target, BaseResourceActionAssignment);

    //@ts-ignore complaining about .store not being on t
    let targetStore = (target && target.getObject()) ? target.getObject().store : undefined;
    if(targetStore) {
      this.resourceAmounts = new ResourceInfoCollection(targetStore);
    } else {
      this.resourceAmounts = new ResourceInfoCollection();
    }
  }

  assign(obj: AssignedWrapperType & CanHazAction, priority = 1): boolean {
    obj.currentAction = this as AnyAction<AssignedWrapperType>;
    logger.log("assigning", obj.id, "to", this.id);
    this.clearLosers(obj, priority);
    let assignAmount = this.getAssignmentAmount(obj);
    logger.log("assignAmount?", this.id, obj.id, assignAmount);
    const assignment = new this.assignmentConstructor(this, obj, priority, assignAmount) as BaseResourceActionAssignment<AssignedWrapperType, BaseResourceAction<AssignedWrapperType>>;
    assignment.assignAmounts = this.getAssignmentAmountInResources(obj, priority);
    this.assignments.set(obj.id, assignment as BaseResourceActionAssignment<AssignedWrapperType, BaseResourceAction<AssignedWrapperType>>);
    logger.log("assigned", obj.id, "to", this.id, assignment.partAmounts, assignment.assignAmounts.total);
    return true;
  }

  calculateDemand(): ActionDemand {
    const demand: ActionDemand = {};
    for (const resourceType in this.resourceAmounts.getTypes()) {
      const amount = this.resourceAmounts.getAmount(resourceType as ResourceConstant);
      demand[CARRY] = Math.ceil(amount / CARRY_CAPACITY) as number;
    }
    return demand;
  }

  canDo(object: AssignedWrapperType): boolean {
    if (!super.canDo(object)) return false;
    if (object.wrapperType == "CreepWrapper") {
      let creepWrapper = object as unknown as CreepWrapper;
      // logger.log("canDo", object.id, object.wrapperType, creepWrapper.hasBodyPart(CARRY));
      return creepWrapper.hasBodyPart(CARRY);
    }
    // logger.log("canDo", object.id, object.wrapperType, true);
    return true;
  }

  overAllowedAssignments() {
    if(super.overAllowedAssignments()) return true; // no assign slots left
    //one of our resources is over assigned

    let resourcesRemaining = this.resourcesRemaining;
    let typesRemaining = resourcesRemaining.getTypes();
    for(let resource in typesRemaining) {
      //@ts-ignore resource is constant, stfu
      let info = resourcesRemaining.get(resource)
      if(info.amount < 0)
        return true;
    }
    return false;
  }
  getAssignmentAmountInResources(object: AssignedWrapperType, priority: number = 0): ResourceInfoCollection {
    return this.amountRemainingByPriorityAndLocation(priority, object.wpos);
  }

  get resourcesAssigned() {
    let total = new ResourceInfoCollection();
    this.assignments.forEach((assignment) => {
      total.add(assignment.assignAmounts);
    })
    return total;
  }

  get resourcesRemaining() {
    return this.resourceAmounts.diff(this.resourcesAssigned);
  }

  private resourcesAssignedUnderPriority(priority: number) {
    let total = new ResourceInfoCollection();
    this.assignments.forEach((assignment) => {
      if (assignment.priority < priority) {
        total.add(assignment.assignAmounts);
      }

    })
    return total;
  }
  amountRemainingByPriority(priority: number) {
    let resourcesAssignedUnderPriority = this.resourcesAssignedUnderPriority(priority);
    return this.resourceAmounts.diff(resourcesAssignedUnderPriority);
  }

  amountRemainingByPriorityAndLocation(priority: number, pos: WorldPosition): ResourceInfoCollection {


    let amountRemaining = new ResourceInfoCollection(this.resourceAmounts);
    let assignmentsCounted = 0;
    let targetRange = this.target.wpos.getRangeTo(pos);
    //log("got target range:" + targetRange)
    this.assignments.forEach((assignment) => {
      if (assignment.priority <= priority && assignment.distanceToTarget <= targetRange) {
        amountRemaining.sub(assignment.assignAmounts);
        assignmentsCounted++;
      }
      // logger.log("asignment assessed:"+ amountRemaining)
    });
    logger.log(this.id, 'remaining amount:', amountRemaining, assignmentsCounted, this.maxAssignments)
    return assignmentsCounted >= this.maxAssignments ? new ResourceInfoCollection() : amountRemaining;
  }

}



