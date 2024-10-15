import { getGameObjectWrapperById } from "../../wrappers/base/AllGameObjects";
import { HasStorage, HasStorageWrapper } from "../../wrappers/base/HasStorageWrapper";

import { ResourceInfoCollection } from "shared/utils/Collections/ResourceInfoCollection";
import { BaseAction, BaseActionMemory } from "../base/BaseAction";
import { BaseResourceAction, BaseResourceActionMemory } from "../base/BaseResourceAction";
import { StorableClass, baseStorable } from "shared/utils/memory/MemoryManager";
import WorldPosition from "shared/utils/map/WorldPosition";
import Logger from "shared/utils/logger";
import { ActionDemand } from "../base/ActionHelpers";

let logger = new Logger("Dropoff");
logger.color = COLOR_GREEN;
logger.enabled = false;

export interface DropoffMemory extends BaseResourceActionMemory {
}

export class Dropoff extends BaseResourceAction<HasStorageWrapper<HasStorage>>
  implements StorableClass<Dropoff, typeof Dropoff, DropoffMemory> {

  static fromJSON(json: DropoffMemory, action?: Dropoff): Dropoff {
    if (!action) {
      const target = getGameObjectWrapperById(json.targetId) as HasStorageWrapper<HasStorage>;
      action = new Dropoff(target);
    }
    BaseResourceAction.fromJSON(json, action);
    return action;
  }

  static actionType = "⬇";

  constructor(target: HasStorageWrapper<HasStorage>) {
    super(Dropoff.actionType, target);
  }

  shouldDo(object: HasStorageWrapper<Creep>): boolean {
    if (!super.shouldDo(object)) return false;
    logger.log("shouldDo", object.id, object.store.total, object.store.total > 0);
    return object.store.total > 0;
  }

  calculateDemand(): ActionDemand {
    const demand: ActionDemand = {};
    // logger.log("calculateDemand", this.id, this.target.store.totalFree, this.target.store.getTypesByAmountAllowed(), this.wpos.toRoomPosition());
    for (const info of this.resourceAmounts.getInfos()) {
      // logger.log("access type", info.type, info.amount)
      const amount = this.resourceAmounts.getAmount(info.type as ResourceConstant);
      demand[CARRY] = (demand[CARRY] || 0) + Math.ceil(amount / CARRY_CAPACITY) as number;
    }
    return demand;
  }

  getAssignmentAmountInResources(object: HasStorageWrapper<Creep>): ResourceInfoCollection {
    logger.log(this.id, "getting assign amount for", object.id);
    let assignAmts = new ResourceInfoCollection();
    let stuffInCreep = object.store.getByAmount();
    //check all the stuff in the creep and see if we have room
    logger.log("stuff in creep");
    for (let resource of stuffInCreep) {
      let ourResourceInfo = this.resourceAmounts.get(resource.type);
      logger.log(resource.type, JSON.stringify(ourResourceInfo), JSON.stringify(resource));
      if (ourResourceInfo.amount > 0) {
        //room for stuff
        let assignAmt = Math.min(resource.amount, ourResourceInfo.amount);
        assignAmts.setAmount(resource.type, assignAmt);
      }
    }
    logger.log(assignAmts.total, "total");
    return assignAmts;
  }

  // predictedDoneTick(object: GameObjectWrapper<Creep>): number {
  // }

  doAction(object: HasStorageWrapper<Creep>) {
    logger.log(object.id, "doing action", this.id);
    let assignment = this.assignments.get(object.id);
    if (!assignment) {
      throw new Error("no assignment for " + object.id + " on " + this.id);
    }
    let target = this.target.getObject();
    let creep = object.getObject();
    if (!target) {
      throw new Error("no target for " + this.id);
    }
    if (!creep) {
      throw new Error("no creep for " + object.id);
    }
    if (object.wpos.getRangeTo(this.target.wpos) <= 1) {
      logger.log(object.id, "in range");
      let resourcesInAssignment = assignment.assignAmounts.getByAmount();
      if (resourcesInAssignment.length == 0) {
        logger.log(object.id, "assignment empty, job done");
        return true; //creep empty, job done
      }

      let resourceToTransfer = resourcesInAssignment[0];

      if (target instanceof Creep) {
        //@ts-ignore complaining about resource constant
        let ret = creep.transfer(target, resourceToTransfer.type);
        logger.log(object.id, "xfered to creep", target.id, "got", ret, resourceToTransfer.type, resourceToTransfer.amount);
        if (ret != 0) {
          logger.log(object.id, "got", ret, "while trying to give resource to a creep", target.id);
        }
      } else if (this.target.wrapperType == "RoomPositionWrapper") {
        if (this.wpos.isEqualTo(creep.pos.toWorldPosition())) {
          let ret = creep.drop(resourceToTransfer.type);
          logger.log(object.id, "xfered dropped on gorund", target.id, "got", ret, resourceToTransfer.type, resourceToTransfer.amount);
          if (ret != 0) {
            logger.log(object.id, "got", ret, "while trying to give resource to a structure", target.id);
          }
        }

      } else {
        //@ts-ignore complaining about target not having all the structure props
        let ret = creep.transfer(target, resourceToTransfer.type);
        logger.log(object.id, "xfered to building", target.id, "got", ret, resourceToTransfer.type, resourceToTransfer.amount);
        if (ret != 0) {
          logger.log(object.id, "got", ret, "while trying to give resource to a structure", target.id);
        }
      }

      assignment.assignAmounts.delete(resourceToTransfer.type);
      //we're done
      logger.log(assignment.assignAmounts.total, "total");
      if (assignment.assignAmounts.total == 0) {
        logger.log(object.id, "job done");
        return true;
      }
    } else {
      logger.log(object.id, "job not in range", object.wpos.getRangeTo(this.target.wpos));
    }
    return false;
  }

}

