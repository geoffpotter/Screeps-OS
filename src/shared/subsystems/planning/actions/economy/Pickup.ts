import { CARRY } from "game/constants";
import { Creep } from "game/prototypes";
import { GameObjectWrapper } from "shared/subsystems/wrappers";
import { HasStorage, HasStorageWrapper } from "shared/subsystems/wrappers/HasStorageWrapper";
import { getSettings } from "shared/utils";
import { ResourceInfoCollection } from "shared/utils/Collections/ResourceInfoCollection";
import { Action, BaseAction } from "../BaseAction";
import { PartAction } from "../BasePartAction";
import { BaseResourceAction, ResourceAction } from "../BaseResourceAction";




export class Pickup extends BaseResourceAction<HasStorageWrapper<HasStorage>> implements ResourceAction<HasStorageWrapper<HasStorage>> {
  static actionType = "📤";
  constructor(target:HasStorageWrapper<HasStorage>) {
    super(Pickup.actionType, target);
  }
  canDo(object: HasStorageWrapper<Creep>): boolean {
    if(!super.canDo(object)) return false;
    return object.store.totalFree > 0
  }


  getAssignmentAmount(object: HasStorageWrapper<Creep>): ResourceInfoCollection {
    if(!object.store) {
      console.log('why is there no store? its defined in the constructor', object)
    }
    let roomInCreep = object.store.totalFree;
    let assignAmts = new ResourceInfoCollection();
    let overMax = this.target.store.getTypesByAmountOverMax();
    let i=0;
    let overMaxTypes = overMax.getTypes();
    //console.log("getting assign amt", object.id, object.constructor.name, roomInCreep, overMaxResources);
    while (assignAmts.total < roomInCreep && i < overMaxTypes.length) {
      let typeKey = overMaxTypes[i++];
      let type = overMax.get(typeKey);
      let assignAmt = Math.min(type.amountOverMax, roomInCreep-assignAmts.total);
      assignAmts.setAmount(type.type, assignAmt);

    }
    //console.log(object.id, "got assignments:", assignAmts)
    return assignAmts;
  }

  // predictedDoneTick(object: GameObjectWrapper<Creep>): number {
  // }

  doJob(object:HasStorageWrapper<Creep>) {
    //console.log("doing job", this.id, "with", object.id);
    //console.log("assigns", this.assignments)
    let assignment = this.assignments.get(object.id);
    if(!assignment) {
      console.log(object.id, "no valid assignment for this creep, wtf bro?")
      return false;//error?
    }
    if(getSettings().getRange(object, this.target) <= 1) {
      let resourcesInAssignment = assignment.assignAmounts.getByAmount();
      if(resourcesInAssignment.length == 0) {
        console.log("no assignments left for this creep, wtf bro?!!?!?")
        return true;//creep empty, job done
      }

      let resourceToTransfer = resourcesInAssignment[0];

      //update pickup amount incase there's less stuff there now than when we assigned.
      resourceToTransfer.amount = Math.min(resourceToTransfer.amount, this.target.store.getAmount(resourceToTransfer.type));

      let target = this.target.get();
      if(target instanceof Creep) {
        console.log(object.id, "pulling from creep", target.id)
        //@ts-ignore complaining about resource constant
        let ret = target.transfer(object.get(), resourceToTransfer.type, resourceToTransfer.amount);
        //let ret = object.get().withdraw(target, resourceToTransfer.type, resourceToTransfer.amount);
        console.log(object.id, "pulled from creep", target.id, "got",  ret, resourceToTransfer.type, resourceToTransfer.amount)
        if(ret!=0) {
          console.log(object.id, "got", ret, "while trying to get energy from creep", target.id)
        }
      } else {
        console.log(object.id, "pulling from building", target.id)
        //@ts-ignore complaining about target not having all the structure props
        let ret = object.get().withdraw(target, resourceToTransfer.type, resourceToTransfer.amount);
        console.log(object.id, "pulled from building", target.id, "got",  ret, resourceToTransfer.type, resourceToTransfer.amount)
        if(ret!=0) {
          console.log(object.id, "got", ret, "while trying to get energy from structure", target.id)
        }
      }

      assignment.assignAmounts.delete(resourceToTransfer.type);
      //we're done
      if(assignment.assignAmounts.total == 0) {
        return true;
      }
    }
    return false;
  }

}

