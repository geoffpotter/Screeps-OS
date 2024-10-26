import { BaseCreepAction } from "../base/BaseCreepAction";
import CreepWrapper from "../../wrappers/creep/CreepWrapper";
import { StorableClass } from "shared/utils/memory/MemoryManager";
import { getGameObjectWrapperById } from "world_new/wrappers/base/AllGameObjects";
import { ActionDemand } from "../base/ActionDemand";

export class BeingPulled extends BaseCreepAction<CreepWrapper> {
  static actionType = "🚶‍♂️➡️";

  constructor(target: CreepWrapper) {
    super(BeingPulled.actionType, target);
    this.maxRange = 1;
  }

  canDo(object: CreepWrapper): boolean {
    return super.canDo(object);
  }

  doAction(actor: CreepWrapper): boolean {
    // The creep being pulled doesn't need to do anything
    return true;
  }

  calculateDemand(): ActionDemand<BodyPartConstant> {
    let demand = new ActionDemand<BodyPartConstant>();
    demand.set(MOVE, 1);
    return demand;
  }
}
