import { BaseCreepAction } from "../base/BaseCreepAction";
import CreepWrapper from "../../wrappers/creep/CreepWrapper";
import { ActionDemand } from "../base/ActionDemand";

export class Pull extends BaseCreepAction<CreepWrapper> {
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

  calculateDemand(): ActionDemand<BodyPartConstant> {
    let demand = new ActionDemand<BodyPartConstant>();
    demand.set(MOVE, 1);
    return demand;
  }
}
