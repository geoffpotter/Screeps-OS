import { AnyGameObjectWrapper, GameObject, GameObjectWrapper } from "../../wrappers/base/GameObjectWrapper";
import CreepWrapper from "../../wrappers/creep/CreepWrapper";
import { HasStorage, HasStorageWrapper } from "../../wrappers/base/HasStorageWrapper";
import { BodyPartInfoCollection, BodyPartInfoCollectionJSON } from "shared/utils/Collections/BodyInfoCollection";
import { baseActionAssignment, BaseAction, AnyAction, BaseActionMemory, baseActionAssignmentMemory } from "./BaseAction";
import { StorableClass } from "shared/utils/memory/MemoryManager";
import { ActionDemand } from "./ActionHelpers";
import WorldPosition from "shared/utils/map/WorldPosition";

export interface BasePartActionAssignmentMemory extends baseActionAssignmentMemory {
}
export class BasePartActionAssignment<AssignedWrapperType extends CreepWrapper,
                              ActionType extends AnyAction
                              > extends baseActionAssignment<AssignedWrapperType, ActionType>
                              implements StorableClass<BasePartActionAssignment<any, any>, typeof BasePartActionAssignment, BasePartActionAssignmentMemory> {
  static fromJSON(json: BasePartActionAssignmentMemory, action?: BasePartActionAssignment<any, any>): BasePartActionAssignment<any, any> {
    if (!action) {
      throw new Error("Cannot instantiate abstract BasePartActionAssignment directly. Please provide an instance.");
    }
    action.partAmounts = json.partAmounts;
    return action;
  }

  constructor(action: ActionType, assigned: AssignedWrapperType, priority: number = 0, partAmounts: ActionDemand = {}) {
    super(action, assigned, priority, partAmounts)
  }
}


export interface BasePartActionMemory extends BaseActionMemory {
  requiredParts: BodyPartInfoCollectionJSON;
}
export abstract class BasePartAction<
  TargetWrapperType extends AnyGameObjectWrapper = AnyGameObjectWrapper,
  AssignedWrapperType extends CreepWrapper = CreepWrapper
> extends BaseAction<TargetWrapperType, AssignedWrapperType, BasePartActionAssignment<AssignedWrapperType, BasePartAction<AssignedWrapperType>>> {
  static fromJSON(json: BasePartActionMemory, action?: BasePartAction<any, any>): BasePartAction<any, any> {
    if (!action) {
      throw new Error("Cannot instantiate abstract BasePartAction directly. Please provide an instance.");
    }
    BaseAction.fromJSON(json, action, BasePartActionAssignment);
    // Deserialize `requiredParts` if necessary
    action.requiredParts = BodyPartInfoCollection.fromJSON(json.requiredParts);
    return action;
  }

  requiredParts: BodyPartInfoCollection;

  constructor(actionType:string, target:TargetWrapperType, requiredParts?:BodyPartConstant[]) {
    super(actionType, target, BasePartActionAssignment);
    this.requiredParts = new BodyPartInfoCollection()
    if(requiredParts) {
      for(let part of requiredParts) {
        this.requiredParts.setMin(part, 1);
      }
    }
  }
  calculateDemand(): ActionDemand {
    const demand: ActionDemand = {};
    this.requiredParts.getTypes().forEach(part => {
      demand[part] = this.requiredParts.getAmount(part);
    });
    let assigned = this.getCurrentAssignedParts();
    for(let part in demand) {
      //@ts-ignore
      demand[part as BodyPartConstant] -= assigned[part as BodyPartConstant] || 0;
    }
    return demand;
  }
  canDo(object: AssignedWrapperType): boolean {
    if(!super.canDo(object)) return false;
    let hasRequiredParts = false;
    this.requiredParts.getTypes().forEach(part=>{
      if(object.hasBodyPart(part))
        hasRequiredParts = true;
    })
    // console.log("canDo?", hasRequiredParts)
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



  doAction(object:HasStorageWrapper<Creep>): boolean {
    throw new Error("BasePartAction.doAction is abstract and must be implemented by a subclass");
  }

  getAmountRemainingByPriorityAndLocation(priority: number, pos: WorldPosition): ActionDemand {
    const remainingDemand = super.getAmountRemainingByPriorityAndLocation(priority, pos);

    // Additional logic specific to BasePartAction if needed
    // For example, we might want to limit the remaining demand to the required parts
    for (const part in remainingDemand) {
      if (!this.requiredParts.has(part as BodyPartConstant)) {
        delete remainingDemand[part as BodyPartConstant];
      }
    }

    return remainingDemand;
  }
}

