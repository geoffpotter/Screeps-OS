import { BaseCreepAction } from "../base/BaseCreepAction";
import { ConstructionSiteWrapper } from "../../wrappers/ConstructionSiteWrapper";
import CreepWrapper from "../../wrappers/creep/CreepWrapper";
import { StorableClass } from "shared/utils/memory/MemoryManager";
import { getGameObjectWrapperById } from "world_new/wrappers/base/AllGameObjects";
import { ActionDemand } from "../base/ActionDemand";

export class Build extends BaseCreepAction<ConstructionSiteWrapper> {
  static actionType = "🏗️";

  constructor(target: ConstructionSiteWrapper) {
    super(Build.actionType, target);
    this.maxRange = 3; // Building can be done from up to 3 squares away
  }

  canDo(object: CreepWrapper): boolean {
    return super.canDo(object) && object.hasBodyPart(WORK);
  }

  doAction(actor: CreepWrapper): boolean {
    if (actor.wpos.getRangeTo(this.target.wpos) <= this.maxRange) {
      let creep = actor.getObject();
      let site = this.target.getObject();
      if (creep && site) {
        let result = creep.build(site);
        return result === OK;
      }
    }
    return false;
  }

  calculateDemand(): ActionDemand<BodyPartConstant> {
    const site = this.target.getObject();
    if (!site) return new ActionDemand<BodyPartConstant>();
    const workNeeded = Math.ceil(site.progressTotal - site.progress);
    let demand = new ActionDemand<BodyPartConstant>();
    demand.set(WORK, Math.ceil(workNeeded / BUILD_POWER));
    demand.set(CARRY, Math.ceil(workNeeded / CARRY_CAPACITY));
    return demand;
  }
}
