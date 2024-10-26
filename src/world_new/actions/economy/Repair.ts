import { BaseCreepAction } from "../base/BaseCreepAction";
import { KillableWrapper } from "../../wrappers/base/KillableWrapper";
import CreepWrapper from "../../wrappers/creep/CreepWrapper";
import { ActionDemand } from "../base/ActionDemand";

export class Repair extends BaseCreepAction<KillableWrapper<Structure>> {
  static actionType = "🔧";

  constructor(target: KillableWrapper<Structure>) {
    super(Repair.actionType, target);
    this.maxRange = 3;
  }

  canDo(object: CreepWrapper): boolean {
    return super.canDo(object) && object.hasBodyPart(WORK);
  }

  doAction(actor: CreepWrapper): boolean {
    if (actor.wpos.getRangeTo(this.target.wpos) <= this.maxRange) {
      let creep = actor.getObject();
      let structure = this.target.getObject();
      if (creep && structure) {
        let result = creep.repair(structure);
        return result === OK;
      }
    }
    return false;
  }

  calculateDemand(): ActionDemand<BodyPartConstant> {
    const structure = this.target.getObject();
    if (!structure) return new ActionDemand<BodyPartConstant>();
    const repairNeeded = structure.hitsMax - structure.hits;
    let demand = new ActionDemand<BodyPartConstant>();
    demand.set(WORK, Math.ceil(repairNeeded / REPAIR_POWER));
    return demand;
  }
}
