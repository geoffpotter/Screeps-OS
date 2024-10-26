import { BaseCreepAction } from "../base/BaseCreepAction";
import { ControllerWrapper } from "../../wrappers/ControllerWrapper";
import CreepWrapper from "../../wrappers/creep/CreepWrapper";
import { ActionDemand } from "../base/ActionDemand";

export class GenerateSafeMode extends BaseCreepAction<ControllerWrapper> {
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

  calculateDemand(): ActionDemand<BodyPartConstant> {
    let demand = new ActionDemand<BodyPartConstant>();
    demand.set(CARRY, 1);
    return demand;
  }
}
