import { BaseCreepAction } from "../base/BaseCreepAction";
import { ControllerWrapper } from "../../wrappers/ControllerWrapper";
import CreepWrapper from "../../wrappers/creep/CreepWrapper";
import { StorableClass } from "shared/utils/memory/MemoryManager";
import { getGameObjectWrapperById } from "world_new/wrappers/base/AllGameObjects";
import { ActionDemand } from "../base/ActionDemand";

export class AttackController extends BaseCreepAction<ControllerWrapper> {


  static actionType = "⚔️🏛️";

  constructor(target: ControllerWrapper) {
    super(AttackController.actionType, target);
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
        let result = creep.attackController(controller);
        return result === OK;
      }
    }
    return false;
  }

  calculateDemand(): ActionDemand<BodyPartConstant> {
    let demand = new ActionDemand<BodyPartConstant>();
    demand.set(CLAIM, 1);
    return demand;
  }
}
