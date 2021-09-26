
import loggerClass from "utils/logger";

let logger = new loggerClass("util.actions");

import { getSettings } from "shared/utils/settings";
import { baseGameObject, GameObjectWrapper } from "../../wrappers/GameObjectWrapper";
import { CachedValue } from "shared/utils/caching/CachedValue";
import { BaseJob } from "../jobs/BaseJob";
import { idType } from "shared/polyfills";
import { Location } from "shared/utils/map/Location";
import { ResourceInfoCollection } from "shared/utils/Collections/ResourceInfoCollection";
import { BodyPartInfoCollection } from "shared/utils/Collections/BodyInfoCollection";
import { HasStorage, HasStorageWrapper } from "shared/subsystems/wrappers/HasStorageWrapper";
import { Action, ActionAssignment, ActionAssignmentConstructor, assignedId, BaseAction } from "./BaseAction";




class BaseResourceActionAssignment<AssignedWrapperType extends HasStorageWrapper<HasStorage>,
                                    ActionType extends ResourceAction<AssignedWrapperType>
                                    > extends ActionAssignment<AssignedWrapperType, ActionType> {
  assignAmounts: ResourceInfoCollection;

  constructor(action: ActionType, assigned: AssignedWrapperType, priority: number = 0) {
    super(action, assigned, priority)
    let assignAmts = action.getAssignmentAmount(assigned);
    this.assignAmounts = assignAmts
  }
}


export interface ResourceAction<AssignedWrapperType extends HasStorageWrapper<HasStorage>> extends Action<AssignedWrapperType> {
  canDo(object: AssignedWrapperType): boolean;
  getAssignmentAmount(object: AssignedWrapperType): ResourceInfoCollection
  predictedDoneTick(object: AssignedWrapperType): number
  doJob(object: AssignedWrapperType): boolean
}

export class BaseResourceAction<TargetWrapperType extends HasStorageWrapper<any> = HasStorageWrapper<any>,
                                AssignedWrapperType extends HasStorageWrapper<any> = HasStorageWrapper<any>
                                > extends BaseAction<TargetWrapperType, AssignedWrapperType, BaseResourceActionAssignment<AssignedWrapperType, ResourceAction<AssignedWrapperType>>,
                                      { new(action:ResourceAction<AssignedWrapperType>,assigned:AssignedWrapperType,priority?:number):  BaseResourceActionAssignment<AssignedWrapperType, ResourceAction<AssignedWrapperType>> }> implements Action<AssignedWrapperType> {

  resourceAmounts: ResourceInfoCollection;

  constructor(actionType = "not implemented!!!", target: TargetWrapperType) {
    super(actionType, BaseResourceActionAssignment, target);

    //@ts-ignore complaining about .store not being on t
    let targetStore = target ? target.get().store : undefined;
    if(targetStore) {
      this.resourceAmounts = new ResourceInfoCollection(targetStore);
    } else {
      this.resourceAmounts = new ResourceInfoCollection();
    }
  }

  canDo(object: AssignedWrapperType): boolean {
    return super.canDo(object);
  }
  doJob(object: AssignedWrapperType): boolean {
    console.log("you forgot to implement doJob on one of your actions", this.actionType)
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

  amountRemainingByPriorityAndLocation(priority: number, pos: Location) {
    let settings = getSettings();

    let amountRemaining = new ResourceInfoCollection(this.resourceAmounts);
    let assignmentsCounted = 0;
    let targetRange = settings.getRange(pos, this.target.location);
    //log("got target range:" + targetRange)
    this.assignments.forEach((assignment) => {
      if (assignment.priority <= priority && assignment.distanceToTarget <= targetRange) {
        amountRemaining.sub(assignment.assignAmounts);
        assignmentsCounted++;
      }
      //log("asignment assessed:"+ amountRemaining)
    });
    logger.log(this.id, 'remaining amount:', amountRemaining, assignmentsCounted, this.maxAssignments)
    return assignmentsCounted >= this.maxAssignments ? 0 : amountRemaining;
  }

}



