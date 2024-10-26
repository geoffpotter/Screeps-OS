import { BaseCreepAction } from "../base/BaseCreepAction";
import { KillableWrapper } from "../../wrappers/base/KillableWrapper";
import CreepWrapper from "../../wrappers/creep/CreepWrapper";
import { ActionDemand } from "../base/ActionDemand";

export class Dismantle extends BaseCreepAction<KillableWrapper<Structure>> {
  static actionType = "🔨";

  constructor(target: KillableWrapper<Structure>) {
    super(Dismantle.actionType, target);
    this.maxRange = 1;
  }

  canDo(object: CreepWrapper): boolean {
    return super.canDo(object) && object.hasBodyPart(WORK);
  }

  doAction(actor: CreepWrapper): boolean {
    if (actor.wpos.getRangeTo(this.target.wpos) <= this.maxRange) {
      let creep = actor.getObject();
      let structure = this.target.getObject();
      if (creep && structure) {
        let result = creep.dismantle(structure);
        return result === OK;
      }
    }
    return false;
  }

  calculateDemand(): ActionDemand<BodyPartConstant> {
    const structure = this.target.getObject();
    if (!structure) return new ActionDemand<BodyPartConstant>();
    let demand = new ActionDemand<BodyPartConstant>();
    demand.set(WORK, Math.ceil(structure.hits / DISMANTLE_POWER));
    return demand;
  }
}
