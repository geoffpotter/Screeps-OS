import { getGameObjectWrapperById } from "world_new/wrappers/base/AllGameObjects";
import { HasStorage, HasStorageWrapper } from "world_new/wrappers/base/HasStorageWrapper";
import { ResourceInfoCollection } from "shared/utils/Collections/ResourceInfoCollection";
import { BasePartAction } from "../base/BasePartAction";
import { BaseResourceAction, BaseResourceActionMemory } from "../base/BaseResourceAction";
import { StorableClass, baseStorable } from "shared/utils/memory/MemoryManager";
import { BaseAction, BaseActionMemory } from "../base/BaseAction";
import Logger from "shared/utils/logger";
import { ActionDemand } from "../base/ActionHelpers";
let logger = new Logger("Pickup");
logger.enabled = false;

export interface PickupMemory extends BaseResourceActionMemory {
}

export class Pickup extends BaseResourceAction<HasStorageWrapper<HasStorage>>
  implements StorableClass<Pickup, typeof Pickup, PickupMemory> {

  static fromJSON(json: PickupMemory, action?: Pickup): Pickup {
    if (!action) {
      const target = getGameObjectWrapperById(json.targetId) as HasStorageWrapper<HasStorage>;
      action = new Pickup(target);
    }
    BaseResourceAction.fromJSON(json, action);
    return action;
  }

  static actionType = "⬆";

  constructor(target: HasStorageWrapper<HasStorage>) {
    super(Pickup.actionType, target);
    this.maxRange = 1;
  }

  shouldDo(object: HasStorageWrapper<Creep>, priority:number): boolean {
    if (!super.shouldDo(object, priority)) return false;
    let assignments = this.getAssignmentAmount(object, priority);
    if (Object.values(assignments).some(amount => amount > 0)) {
      logger.log("should do", this.id, object.id, object.store.totalFree * 0.7, object.store.totalFree, this.resourceAmounts.total, object.store.totalFree * 0.7 < this.resourceAmounts.total);
      logger.log("assignments", assignments)
      let totalAssignedResources = this.getAssignmentAmountInResources(object).getByAmount().reduce((sum, resource) => sum + resource.amount, 0);
      logger.log("assign resource amounts", totalAssignedResources, object.store.totalFree, totalAssignedResources)
      return object.store.totalFree > 0 && object.store.totalFree * 0.2 < totalAssignedResources;
    }
    logger.log("no assignments", assignments)
    return false;
  }

  calculateDemand(): ActionDemand {
    const demand: ActionDemand = {};
    // logger.log("calculateDemand", this.id, this.resourceAmounts.getInfos(), this.resourceAmounts.get(RESOURCE_ENERGY))
    let infos = this.resourceAmounts.getInfos();
    for (const info of infos) {
      // logger.log("access type", info.type, info.amount)
      const amount = this.resourceAmounts.getAmount(info.type as ResourceConstant);
      demand[CARRY] = (demand[CARRY] || 0) + Math.ceil(amount / CARRY_CAPACITY) as number;
    }
    // logger.log("calculateDemand", demand);
    return demand;
  }

  getAssignmentAmountInResources(object: HasStorageWrapper<Creep>): ResourceInfoCollection {
    if (!object.store) {
      logger.log('why is there no store? its defined in the constructor', object)
    }
    let roomInCreep = object.store.totalFree;
    let assignAmts = new ResourceInfoCollection();
    let overMax = this.resourcesRemaining;
    let i = 0;
    let overMaxTypes = overMax.getTypes();
    //logger.log("getting assign amt", object.id, object.constructor.name, roomInCreep, overMaxResources);
    while (assignAmts.total < roomInCreep && i < overMaxTypes.length) {
      let typeKey = overMaxTypes[i++];
      let type = overMax.get(typeKey);
      let assignAmt = Math.min(type.amountOverMax, roomInCreep - assignAmts.total);
      assignAmts.setAmount(type.type, assignAmt);

    }
    // logger.log(object.id, "got assignments:", assignAmts)
    return assignAmts;
  }

  // predictedDoneTick(object: GameObjectWrapper<Creep>): number {
  // }

  doAction(objectWrapper: HasStorageWrapper<Creep>) {
    let target: HasStorage = this.target.getObject()!;
    if (!target) {
      return false;
    }
    let assignedObject = objectWrapper.getObject();
    if (!assignedObject) {
      throw new Error("no assigned object for " + this.id + "something has gone wrong")
    }
    logger.log("doing job", this.id, "with", assignedObject.id);
    //logger.log("assigns", this.assignments)
    let assignment = this.assignments.get(objectWrapper.id);
    if (!assignment) {
      logger.log(objectWrapper.id, "no valid assignment for this creep, wtf bro?")
      return false;//error?
    }
    let object = objectWrapper.getObject();
    if (!object) {
      throw new Error("no object for " + this.id + "something has gone wrong")
    }
    if (objectWrapper.wpos.getRangeTo(this.target.wpos) <= this.maxRange) {
      let resourcesInAssignment = assignment.assignAmounts.getByAmount();
      if (resourcesInAssignment.length == 0) {
        logger.log(object.id, "no assignments left for this creep, wtf bro?!!?!?")
        return true;//creep empty, job done
      }

      let resourceToTransfer = resourcesInAssignment[0];

      //update pickup amount incase there's less stuff there now than when we assigned.
      resourceToTransfer.amount = Math.min(resourceToTransfer.amount, this.target.store.getAmount(resourceToTransfer.type));

      if (target instanceof Creep) {
        logger.log(objectWrapper.id, "pulling from creep", target.id)
        //@ts-ignore complaining about resource constant
        let ret = target.transfer(objectWrapper.getObject(), resourceToTransfer.type, resourceToTransfer.amount);
        //let ret = object.get().withdraw(target, resourceToTransfer.type, resourceToTransfer.amount);
        logger.log(objectWrapper.id, "pulled from creep", target.id, "got", ret, resourceToTransfer.type, resourceToTransfer.amount)
        if (ret != 0) {
          logger.log(objectWrapper.id, "got", ret, "while trying to get energy from creep", target.id)
        }
      } else if (this.target.wrapperType == "ResourceWrapper") {
        //@ts-ignore
        logger.log(objectWrapper.id, "picking up resource", this.target.id)
        let ret = assignedObject.pickup(target as any);
        //@ts-ignore
        logger.log(objectWrapper.id, "picked up resource", this.target.id, "got", ret, resourceToTransfer.type, resourceToTransfer.amount)
        if (ret != 0) {
          //@ts-ignore
          logger.log(objectWrapper.id, "got", ret, "while trying to get energy from resource", this.target.id)
        }
      } else if (this.target.wrapperType == "ControllerWrapper" || this.target.wrapperType == "RoomPositionWrapper") {
        //@ts-ignore
        logger.log(objectWrapper.id, "picking up resource", this.target.id)
        // look for resources in the area
        let resourcesInArea = this.target.wpos.toRoomPosition().lookFor(LOOK_RESOURCES);
        if (resourcesInArea.length > 0 && resourcesInArea.some(r => r.resourceType == resourceToTransfer.type)) {
          let resource = resourcesInArea.find(r => r.resourceType == resourceToTransfer.type);
          if (resource) {
            let ret = assignedObject.pickup(resource as any);
            //@ts-ignore
            logger.log(objectWrapper.id, "picked up resource", this.target.id, "got", ret, resourceToTransfer.type, resourceToTransfer.amount)
            if (ret != 0) {
              //@ts-ignore
              logger.log(objectWrapper.id, "got", ret, "while trying to get energy from resource", this.target.id)
            }
          }
        }
      } else {
        logger.log(objectWrapper.id, "pulling from building", target.id, this.target.wrapperType)

        let ret = assignedObject.withdraw(target as any, resourceToTransfer.type, resourceToTransfer.amount);
        logger.log(objectWrapper.id, "pulled from building", target.id, "got", ret, resourceToTransfer.type, resourceToTransfer.amount)
        if (ret != 0) {
          logger.log(objectWrapper.id, "got", ret, "while trying to get energy from structure", target.id)
        }
      }

      assignment.assignAmounts.delete(resourceToTransfer.type);
      //we're done
      if (assignment.assignAmounts.total == 0) {
        return true;
      }
    } else {
      logger.log(objectWrapper.id, "moving to pickup", this.target.id)
    }
    return false;
  }

}

