import { HasStorage, HasStorageWrapper } from "world_new/wrappers/base/HasStorageWrapper";
import { ResourceInfoCollection } from "shared/utils/Collections/ResourceInfoCollection";
import { BaseCreepAction } from "../../base/BaseCreepAction";
import CreepWrapper from "../../../wrappers/creep/CreepWrapper";
import Logger from "shared/utils/logger";
import { ActionDemand, DemandType } from "../../base/ActionDemand";
import WorldPosition from "shared/utils/map/WorldPosition";
import { ResourceWrapper } from "world_new/wrappers";
import { BaseResourceAction } from "world_new/actions/base/BaseResourceAction";

let logger = new Logger("Pickup");
// logger.enabled = false;

export abstract class BasePickup extends BaseResourceAction<HasStorageWrapper<HasStorage> | WorldPosition> {
  static actionType = "⬆";

  constructor(target: HasStorageWrapper<HasStorage> | WorldPosition, resourceDemand: ResourceInfoCollection) {
    super(BasePickup.actionType, target, resourceDemand);
    this.maxRange = 1;
  }

  shouldDo(object: CreepWrapper, priority: number): boolean {
    if (!super.shouldDo(object, priority)) return false;
    return object.store.totalFree > 0;
  }


  doAction(actor: CreepWrapper): boolean {
    let target = this.target;
    let targetWpos = target instanceof WorldPosition ? target : target.wpos;
    if (!target) return false;

    let assignment = this.assignments.get(actor.id);
    if (!assignment) {
      logger.log(actor.id, "no valid assignment for this creep, wtf bro?")
      return false;
    }

    if (actor.wpos.getRangeTo(targetWpos) <= this.maxRange) {
      let resourcesInAssignment = assignment.amount.getTypes();
      if (resourcesInAssignment.length == 0) {
        logger.log(actor.id, "no assignments left for this creep, wtf bro?!!?!?")
        return true;
      }

      let resourceToTransfer = resourcesInAssignment[0];
      let amountToTransfer = assignment.amount.get(resourceToTransfer);

      let result;
      if (target instanceof WorldPosition) {
        result = this.pickupFromGround(actor, targetWpos, resourceToTransfer as ResourceConstant);
      } else if (target.wrapperType == "ResourceWrapper") {
        result = this.pickupResource(actor, target.getObject() as unknown as Resource);
      } else if (target instanceof Creep) {
        result = this.transferFromCreep(actor, target, resourceToTransfer as ResourceConstant, amountToTransfer);
      } else {
        result = this.withdrawFromStructure(actor, target, resourceToTransfer as ResourceConstant, amountToTransfer);
      }

      if (result == OK) {
        assignment.amount.delete(resourceToTransfer as DemandType);
        logger.log(actor.id, "assignment amount", assignment.amount.demand);
        return assignment.amount.getTotal() == 0;
      } else {
        logger.log(actor.id, `Failed to pickup/withdraw ${resourceToTransfer}. Error: ${result}`);
        return true;
      }
    } else {
      logger.log(actor.id, "moving to pickup", this.target.id);
    }
    return false;
  }

  private pickupFromGround(actor: CreepWrapper, targetWpos: WorldPosition, resourceType: ResourceConstant): ScreepsReturnCode {
    let resourcesInArea = targetWpos.toRoomPosition().findInRange(FIND_DROPPED_RESOURCES, 1);
    let resource = resourcesInArea.find(r => r.resourceType == resourceType);
    if (resource) {
      return actor.getObject()!.pickup(resource);
    }
    return ERR_NOT_FOUND;
  }

  private pickupResource(actor: CreepWrapper, resource: Resource): ScreepsReturnCode {
    return actor.getObject()!.pickup(resource);
  }

  private transferFromCreep(actor: CreepWrapper, target: Creep, resourceType: ResourceConstant, amount?: number): ScreepsReturnCode {
    return target.transfer(actor.getObject()!, resourceType, amount);
  }

  private withdrawFromStructure(actor: CreepWrapper, target: HasStorageWrapper<HasStorage>, resourceType: ResourceConstant, amount?: number): ScreepsReturnCode {
    return actor.getObject()!.withdraw(target.getObject() as AnyStructure, resourceType, amount);
  }

  getAssignmentAmount(object: HasStorageWrapper<HasStorage>, priority: number): ActionDemand<ResourceConstant> {
    let availableCapacity = object.store.totalFree;
    const demand = this.getAmountRemainingByPriorityAndLocation(priority, object.wpos);
    const assignment = new ActionDemand<ResourceConstant>();
    if (availableCapacity <= 0) return assignment;
    for (const resourceType of demand.getTypes()) {
      const amount = Math.min(availableCapacity, demand.get(resourceType));
      if (amount > 0) {
        assignment.set(resourceType as ResourceConstant, amount);
        availableCapacity -= amount;
      }
      if (availableCapacity <= 0) break;
    }

    return assignment;
  }
}
