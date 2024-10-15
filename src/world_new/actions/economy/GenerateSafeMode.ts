import { BaseAction, BaseActionMemory } from "../base/BaseAction";
import { ControllerWrapper } from "../../wrappers/ControllerWrapper";
import CreepWrapper from "../../wrappers/creep/CreepWrapper";
import { StorableClass, baseStorable } from "shared/utils/memory/MemoryManager";
import { getGameObjectWrapperById } from "world_new/wrappers/base/AllGameObjects";
import { ActionDemand } from "../base/ActionHelpers";

export interface GenerateSafeModeMemory extends BaseActionMemory {
}

export class GenerateSafeMode extends BaseAction<ControllerWrapper, CreepWrapper>
  implements StorableClass<GenerateSafeMode, typeof GenerateSafeMode, GenerateSafeModeMemory> {

  static fromJSON(json: GenerateSafeModeMemory, action?: GenerateSafeMode): GenerateSafeMode {
    if (!action) {
      const target = getGameObjectWrapperById(json.targetId) as ControllerWrapper;
      action = new GenerateSafeMode(target);
    }
    BaseAction.fromJSON(json, action);
    return action;
  }

  static actionType = "🛡️🏛️";

  constructor(target: ControllerWrapper) {
    super(GenerateSafeMode.actionType, target);
    this.maxRange = 1;
  }

  canDo(object: CreepWrapper): boolean {
    return super.canDo(object);
  }

  doAction(actor: CreepWrapper): boolean {
    if (actor.wpos.getRangeTo(this.target.wpos) <= this.maxRange) {
      let creep = actor.getObject();
      let controller = this.target.getObject();
      if (creep && controller) {
        let result = creep.generateSafeMode(controller);
        return result === OK;
      }
    }
    return false;
  }

  calculateDemand(): ActionDemand {
    return {
      [CARRY]: 1,
    };
  }
}
