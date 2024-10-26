import { BaseAction } from "./BaseAction";
import { ResourceInfoCollection } from "shared/utils/Collections/ResourceInfoCollection";
import { ActionDemand } from "./ActionDemand";
import CreepWrapper from "../../wrappers/creep/CreepWrapper";
import { AnyGameObjectWrapper } from "world_new/wrappers/base/GameObjectWrapper";
import { RoomWrapper } from "world_new/wrappers";
import WorldPosition from "shared/utils/map/WorldPosition";
import { HasStorage, HasStorageWrapper } from "world_new/wrappers/base/HasStorageWrapper";
import Logger from "shared/utils/logger";

let logger = new Logger("BaseResourceAction");

export abstract class BaseResourceAction<TargetType extends AnyGameObjectWrapper | RoomWrapper | WorldPosition> extends BaseAction<TargetType, HasStorageWrapper<HasStorage>, ResourceConstant> {
  protected resourceDemand: ResourceInfoCollection;

  constructor(
    id: string,
    target: TargetType,
    resourceDemand: ResourceInfoCollection,
    priority?: number
  ) {
    super(id, target, priority);
    this.resourceDemand = resourceDemand;
  }

  canDo(object: HasStorageWrapper<HasStorage>): boolean {
    return object.store.maxTotal > 0;
  }
  shouldDo(object: HasStorageWrapper<HasStorage>, priority: number): boolean {
    let assignments = this.getAssignmentAmount(object, priority);
    if (assignments.getTotal() > 0) {
      // logger.log("should do", this.id, object.id, object.store.totalFree * 0.7, object.store.totalFree, this.resourceDemand.total, object.store.totalFree * 0.7 < this.resourceDemand.total);
      logger.log("assignments", assignments.toString());
      return assignments.getTotal() > 0;
    }
    return false;
  }

  getPartsDemand(): ActionDemand<BodyPartConstant> {
    let demand = new ActionDemand<BodyPartConstant>();
    let totalResourceDemand = this.resourceDemand.total;
    demand.set("carry", totalResourceDemand / CARRY_CAPACITY);
    return demand;
  }

  abstract getAssignmentAmount(object: HasStorageWrapper<HasStorage>, priority: number): ActionDemand<ResourceConstant>;
}
