import { BaseAction, BaseActionMemory } from "../base/BaseAction";
import { ControllerWrapper } from "../../wrappers/ControllerWrapper";
import CreepWrapper from "../../wrappers/creep/CreepWrapper";
import { StorableClass, baseStorable } from "shared/utils/memory/MemoryManager";
import { getGameObjectWrapperById } from "world_new/wrappers/base/AllGameObjects";
import { ActionDemand } from "../base/ActionHelpers";

export interface ReserveControllerMemory extends BaseActionMemory {
}

export class ReserveController extends BaseAction<ControllerWrapper, CreepWrapper>
  implements StorableClass<ReserveController, typeof ReserveController, ReserveControllerMemory> {

  static fromJSON(json: ReserveControllerMemory, action?: ReserveController): ReserveController {
    if (!action) {
      const target = getGameObjectWrapperById(json.targetId) as ControllerWrapper;
      action = new ReserveController(target);
    }
    BaseAction.fromJSON(json, action);
    return action;
  }

  static actionType = "🔒🏛️";

  constructor(target: ControllerWrapper) {
    super(ReserveController.actionType, target);
    this.maxRange = 1;
  }

  canDo(object: CreepWrapper): boolean {
    return super.canDo(object) && object.hasBodyPart(CLAIM);
  }

  doAction(actor: CreepWrapper): boolean {
    if (actor.wpos.getRangeTo(this.target.wpos) <= this.maxRange) {
      let creep = actor.getObject();
      let controller = this.target.getObject();
      if (creep && controller) {
        let result = creep.reserveController(controller);
        return result === OK;
      }
    }
    return false;
  }

  calculateDemand(): ActionDemand {
    return {
      [CLAIM]: 2,
    };
  }
}
