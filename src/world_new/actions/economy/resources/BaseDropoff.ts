import { HasStorage, HasStorageWrapper } from "../../../wrappers/base/HasStorageWrapper";
import { ResourceInfoCollection } from "shared/utils/Collections/ResourceInfoCollection";
import CreepWrapper from "../../../wrappers/creep/CreepWrapper";
import Logger from "shared/utils/logger";
import WorldPosition from "shared/utils/map/WorldPosition";
import { BaseResourceAction } from "world_new/actions/base/BaseResourceAction";
import { ActionDemand } from "world_new/actions/base/ActionDemand";

let logger = new Logger("Dropoff");
logger.color = COLOR_GREEN;
logger.enabled = false;

export abstract class BaseDropoff extends BaseResourceAction<HasStorageWrapper<HasStorage> | WorldPosition> {
  static actionType = "⬇";

  constructor(target: HasStorageWrapper<HasStorage> | WorldPosition, resourceDemand: ResourceInfoCollection) {
    super(BaseDropoff.actionType, target, resourceDemand);
  }

  shouldDo(object: CreepWrapper, priority: number): boolean {
    if (!super.shouldDo(object, priority)) return false;
    // return true if creep has a resource we need
    return this.resourceDemand.getTypes().some(resourceType =>
      object.store.getAmount(resourceType as ResourceConstant) > 0
    );
  }

  doAction(actor: CreepWrapper): boolean {
    logger.log(actor.id, "doing action", this.id);
    let assignment = this.assignments.get(actor.id);
    if (!assignment) {
      throw new Error("no assignment for " + actor.id + " on " + this.id);
    }
    let target = this.target;
    let targetWpos = target instanceof WorldPosition ? target : target.wpos;
    let creep = actor.getObject();
    if (!target) {
      throw new Error("no target for " + this.id);
    }
    if (!creep) {
      throw new Error("no creep for " + actor.id);
    }
    if (actor.wpos.getRangeTo(targetWpos) <= this.maxRange) {
      logger.log(actor.id, "in range");
      let resourcesInAssignment = assignment.amount.getTypes();
      if (resourcesInAssignment.length == 0) {
        logger.log(actor.id, "assignment empty, job done");
        return true;
      }

      let resourceToTransfer = resourcesInAssignment[0] as ResourceConstant;

      let result;
      if (target instanceof WorldPosition) {
        result = this.dropOnGround(actor, resourceToTransfer);
      } else if (target instanceof Creep) {
        result = this.transferToCreep(actor, target, resourceToTransfer);
      } else if (target.wrapperType == "RoomPositionWrapper") {
        result = this.dropOnPosition(actor, targetWpos, resourceToTransfer);
      } else {
        result = this.transferToStructure(actor, target, resourceToTransfer);
      }

      if (result == OK) {
        assignment.amount.delete(resourceToTransfer);
        logger.log(assignment.amount.getTotal(), "total");
        return assignment.amount.getTotal() == 0;
      } else {
        logger.log(actor.id, `Failed to transfer ${resourceToTransfer}. Error: ${result}`);
        return true;
      }
    } else {
      logger.log(actor.id, "job not in range", actor.wpos.getRangeTo(targetWpos));
    }
    return false;
  }

  private dropOnGround(actor: CreepWrapper, resourceType: ResourceConstant): ScreepsReturnCode {
    let ret = actor.getObject()!.drop(resourceType);
    logger.log(actor.id, "dropped on ground", "got", ret, resourceType);
    return ret;
  }

  private transferToCreep(actor: CreepWrapper, target: Creep, resourceType: ResourceConstant): ScreepsReturnCode {
    let ret = actor.getObject()!.transfer(target, resourceType);
    logger.log(actor.id, "transferred to creep", target.id, "got", ret, resourceType);
    return ret;
  }

  private dropOnPosition(actor: CreepWrapper, targetWpos: WorldPosition, resourceType: ResourceConstant): ScreepsReturnCode {
    if (targetWpos.isEqualTo(actor.getObject()!.pos.toWorldPosition())) {
      let ret = actor.getObject()!.drop(resourceType);
      logger.log(actor.id, "dropped on position", "got", ret, resourceType);
      return ret;
    }
    return ERR_NOT_IN_RANGE;
  }

  private transferToStructure(actor: CreepWrapper, target: HasStorageWrapper<HasStorage>, resourceType: ResourceConstant): ScreepsReturnCode {
    let ret = actor.getObject()!.transfer(target.getObject() as AnyStructure, resourceType);
    logger.log(actor.id, "transferred to building", target.id, "got", ret, resourceType);
    return ret;
  }

  getAssignmentAmount(object: HasStorageWrapper<HasStorage>, priority: number): ActionDemand<ResourceConstant> {
    let availableResources = object.store.total;
    const demand = this.getAmountRemainingByPriorityAndLocation(priority, object.wpos);
    const assignment = new ActionDemand<ResourceConstant>();

    if (availableResources <= 0) return assignment;

    for (const resourceType of demand.getTypes()) {
      const amountInStore = object.store.get(resourceType as ResourceConstant).amount || 0;
      const amountNeeded = demand.get(resourceType);
      const amount = Math.min(amountInStore, amountNeeded);

      if (amount > 0) {
        assignment.set(resourceType as ResourceConstant, amount);
        availableResources -= amount;
      }

      if (availableResources <= 0) break;
    }

    return assignment;
  }
}
