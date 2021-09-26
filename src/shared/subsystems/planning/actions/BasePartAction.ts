import { Creep } from "game/prototypes";
import { AnyGameObjectWrapper, baseGameObject, CreepWrapper, GameObjectWrapper } from "shared/subsystems/wrappers";
import { HasStorage, HasStorageWrapper } from "shared/subsystems/wrappers/HasStorageWrapper";
import { getSettings } from "shared/utils";
import { BodyPartInfoCollection } from "shared/utils/Collections/BodyInfoCollection";
import { Action, ActionAssignment, BaseAction } from "./BaseAction";



export class BasePartActionAssignment<AssignedWrapperType extends CreepWrapper,
                              ActionType extends PartAction<AssignedWrapperType>
                              > extends ActionAssignment<AssignedWrapperType, ActionType> {
  partAmounts: BodyPartInfoCollection;

  constructor(action: ActionType, assigned: AssignedWrapperType, priority: number = 0) {
    super(action, assigned, priority)
    this.partAmounts = new BodyPartInfoCollection();
  }
}

export interface PartAction<AssignedWrapperType extends AnyGameObjectWrapper> extends Action<AssignedWrapperType> {
  canDo(object: AssignedWrapperType): boolean;
  getAssignmentAmount(object: AssignedWrapperType): BodyPartInfoCollection
  predictedDoneTick(object: AssignedWrapperType): number
  doJob(object: AssignedWrapperType): boolean
}

export class BasePartAction<TargetWrapperType extends AnyGameObjectWrapper = AnyGameObjectWrapper,
                            AssignedWrapperType extends CreepWrapper = CreepWrapper
                            > extends BaseAction<TargetWrapperType, AssignedWrapperType, BasePartActionAssignment<AssignedWrapperType, PartAction<AssignedWrapperType>>,
                                  { new(action:PartAction<AssignedWrapperType>,assigned:AssignedWrapperType,priority?:number):  BasePartActionAssignment<AssignedWrapperType,  PartAction<AssignedWrapperType>> }> {

  requiredParts: BodyPartInfoCollection;

  constructor(actionType:string, target:TargetWrapperType, requiredParts:BodyPartConstant[]) {
    super(actionType, BasePartActionAssignment, target);
    this.requiredParts = new BodyPartInfoCollection()
    for(let part of requiredParts) {
      this.requiredParts.setMin(part, 1);
    }
  }
  canDo(object: AssignedWrapperType): boolean {
    if(!super.canDo(object)) return false;
    let hasRequiredParts = false;
    this.requiredParts.getTypes().forEach(part=>{
      if(object.hasBodyPart(part))
        hasRequiredParts = true;
    })
    //console.log("basePartAction canDo?", hasRequiredParts)
    return hasRequiredParts;
  }

  overAllowedAssignments() {
    if(super.overAllowedAssignments()) return true; // no assign slots left
    //one of our resources is over assigned
    for(let info of this.requiredParts.getInfos()) {
      if(info.max != 0 && info.amountOverMax > 0) {
        console.log("action over allowed part limit", this.id, info.type, info.amountOverMax)
        return true;
      }
    }

    return false;
  }

  getAssignmentAmount(object:AssignedWrapperType): BodyPartInfoCollection {
    let matchingParts = new BodyPartInfoCollection();

    return matchingParts;
  }


  doJob(object:HasStorageWrapper<Creep>) {
    return false;
  }

}

