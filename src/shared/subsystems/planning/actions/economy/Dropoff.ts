import { CARRY } from "game/constants";
import { Creep } from "game/prototypes";
import { GameObjectWrapper } from "shared/subsystems/wrappers";
import { HasStorage, HasStorageWrapper } from "shared/subsystems/wrappers/HasStorageWrapper";
import { getSettings } from "shared/utils";
import { ResourceInfoCollection } from "shared/utils/Collections/ResourceInfoCollection";
import { Action, BaseAction } from "../BaseAction";
import { BaseResourceAction, ResourceAction } from "../BaseResourceAction";





export class Dropoff extends BaseResourceAction<HasStorageWrapper<HasStorage>> implements ResourceAction<HasStorageWrapper<HasStorage>> {
  static actionType = "📥";
  constructor(target:HasStorageWrapper<HasStorage>) {
    super(Dropoff.actionType, target);
  }
  canDo(object: HasStorageWrapper<Creep>): boolean {
    if(!super.canDo(object)) return false;
    return object.store.total > 0
  }


  getAssignmentAmount(object: HasStorageWrapper<Creep>): ResourceInfoCollection {
    console.log(this.id, "getting assign amount for", object.id)
    let assignAmts = new ResourceInfoCollection();
    let stuffInCreep = object.store.getByAmount();
    //check all the stuff in the creep and see if we have room
    console.log("stuff in creep")
    for(let resource of stuffInCreep) {
      let ourResourceInfo = this.resourceAmounts.get(resource.type);
      console.log(resource.type, ourResourceInfo, resource)
      if(ourResourceInfo.amount > 0) {
        //room for stuff
        let assignAmt = Math.min(resource.amount, ourResourceInfo.amount)
        assignAmts.setAmount(resource.type, assignAmt)
      }
    }
    return assignAmts;
  }

  // predictedDoneTick(object: GameObjectWrapper<Creep>): number {
  // }

  doJob(object:HasStorageWrapper<Creep>) {
    let assignment = this.assignments.get(object.id);
    if(!assignment) {
      return false;//error?
    }
    if(getSettings().getRange(object, this.target) <= 1) {
      let resourcesInAssignment = assignment.assignAmounts.getByAmount();
      if(resourcesInAssignment.length == 0) {
        return true;//creep empty, job done
      }

      let resourceToTransfer = resourcesInAssignment[0];

      let target = this.target.get();
      if(target instanceof Creep) {
        //@ts-ignore complaining about resource constant
        let ret = object.get().transfer(target, resourceToTransfer.type);
        console.log(object.id, "xfered to creep", target.id, "got",  ret, resourceToTransfer.type, resourceToTransfer.amount)
        if(ret!=0) {
          console.log(object.id, "got", ret, "while trying to give resource to a creep", target.id)
        }
      } else {
        //@ts-ignore complaining about target not having all the structure props
        let ret = object.get().transfer(target, resourceToTransfer.type);
        console.log(object.id, "xfered to building", target.id, "got",  ret, resourceToTransfer.type, resourceToTransfer.amount)
        if(ret!=0) {
          console.log(object.id, "got", ret, "while trying to give resource to a structure", target.id)
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

