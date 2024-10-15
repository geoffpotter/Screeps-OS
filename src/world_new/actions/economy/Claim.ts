import { BaseAction, BaseActionMemory } from "../base/BaseAction";
import { ControllerWrapper } from "../../wrappers/ControllerWrapper";
import CreepWrapper from "../../wrappers/creep/CreepWrapper";
import { StorableClass, baseStorable } from "shared/utils/memory/MemoryManager";
import { getGameObjectWrapperById } from "world_new/wrappers/base/AllGameObjects";
import { ActionDemand } from "../base/ActionHelpers";

export interface ClaimMemory extends BaseActionMemory {
}

export class Claim extends BaseAction<ControllerWrapper, CreepWrapper>
  implements StorableClass<Claim, typeof Claim, ClaimMemory> {

  static fromJSON(json: ClaimMemory, action?: Claim): Claim {
    if (!action) {
      const target = getGameObjectWrapperById(json.targetId) as ControllerWrapper;
      action = new Claim(target);
    }
    BaseAction.fromJSON(json, action);
    return action;
  }

  static actionType = "🚩";

  constructor(target: ControllerWrapper) {
    super(Claim.actionType, target);
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
        let result = creep.claimController(controller);
        return result === OK;
      }
    }
    return false;
  }

  calculateDemand(): ActionDemand {
    return {
      [CLAIM]: 1,
    };
  }
}
