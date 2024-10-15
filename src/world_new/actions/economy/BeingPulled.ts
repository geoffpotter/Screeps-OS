import { BaseAction, BaseActionMemory } from "../base/BaseAction";
import CreepWrapper from "../../wrappers/creep/CreepWrapper";
import { StorableClass, baseStorable } from "shared/utils/memory/MemoryManager";
import { getGameObjectWrapperById } from "world_new/wrappers/base/AllGameObjects";
import { ActionDemand } from "../base/ActionHelpers";

export interface BeingPulledMemory extends BaseActionMemory {
}

export class BeingPulled extends BaseAction<CreepWrapper, CreepWrapper>
  implements StorableClass<BeingPulled, typeof BeingPulled, BeingPulledMemory> {

  static fromJSON(json: BeingPulledMemory, action?: BeingPulled): BeingPulled {
    if (!action) {
      const target = getGameObjectWrapperById(json.targetId) as CreepWrapper;
      action = new BeingPulled(target);
    }
    BaseAction.fromJSON(json, action);
    return action;
  }

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

  calculateDemand(): ActionDemand {
    return {}; // No specific demand for being pulled
  }
}
