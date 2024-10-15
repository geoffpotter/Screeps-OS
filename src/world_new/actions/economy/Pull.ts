import { BaseAction, BaseActionMemory } from "../base/BaseAction";
import CreepWrapper from "../../wrappers/creep/CreepWrapper";
import { StorableClass, baseStorable } from "shared/utils/memory/MemoryManager";
import { getGameObjectWrapperById } from "world_new/wrappers/base/AllGameObjects";
import { ActionDemand } from "../base/ActionHelpers";

export interface PullMemory extends BaseActionMemory {
}

export class Pull extends BaseAction<CreepWrapper, CreepWrapper>
  implements StorableClass<Pull, typeof Pull, PullMemory> {

  static fromJSON(json: PullMemory, action?: Pull): Pull {
    if (!action) {
      const target = getGameObjectWrapperById(json.targetId) as CreepWrapper;
      action = new Pull(target);
    }
    BaseAction.fromJSON(json, action);
    return action;
  }

  static actionType = "🚶‍♂️⬅️";

  constructor(target: CreepWrapper) {
    super(Pull.actionType, target);
    this.maxRange = 1;
  }

  canDo(object: CreepWrapper): boolean {
    return super.canDo(object);
  }

  doAction(actor: CreepWrapper): boolean {
    if (actor.wpos.getRangeTo(this.target.wpos) <= this.maxRange) {
      let creep = actor.getObject();
      let targetCreep = this.target.getObject();
      if (creep && targetCreep) {
        let result = creep.pull(targetCreep);
        return result === OK;
      }
    }
    return false;
  }

  calculateDemand(): ActionDemand {
    return {
      [MOVE]: 1,
    };
  }
}
