import { BaseAction, BaseActionMemory } from "../base/BaseAction";
import { ControllerWrapper } from "../../wrappers/ControllerWrapper";
import CreepWrapper from "../../wrappers/creep/CreepWrapper";
import { StorableClass, baseStorable } from "shared/utils/memory/MemoryManager";
import { getGameObjectWrapperById } from "world_new/wrappers/base/AllGameObjects";
import { ActionDemand } from "../base/ActionHelpers";

export interface SignControllerMemory extends BaseActionMemory {
  text: string;
}

export class SignController extends BaseAction<ControllerWrapper, CreepWrapper>
  implements StorableClass<SignController, typeof SignController, SignControllerMemory> {

  static fromJSON(json: SignControllerMemory, action?: SignController): SignController {
    if (!action) {
      const target = getGameObjectWrapperById(json.targetId) as ControllerWrapper;
      action = new SignController(target, json.text);
    }
    BaseAction.fromJSON(json, action);
    return action;
  }

  static actionType = "✍️🏛️";
  private text: string;

  constructor(target: ControllerWrapper, text: string) {
    super(SignController.actionType, target);
    this.maxRange = 1;
    this.text = text;
  }

  calculateDemand(): ActionDemand {
    return {
      [MOVE]: 1,
    };
  }

  canDo(object: CreepWrapper): boolean {
    return super.canDo(object);
  }

  doAction(actor: CreepWrapper): boolean {
    if (actor.wpos.getRangeTo(this.target.wpos) <= this.maxRange) {
      let creep = actor.getObject();
      let controller = this.target.getObject();
      if (creep && controller) {
        let result = creep.signController(controller, this.text);
        return result === OK;
      }
    }
    return false;
  }
}
