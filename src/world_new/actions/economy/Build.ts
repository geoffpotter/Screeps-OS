import { BaseAction, BaseActionMemory } from "../base/BaseAction";
import { ConstructionSiteWrapper } from "../../wrappers/ConstructionSiteWrapper";
import CreepWrapper from "../../wrappers/creep/CreepWrapper";
import { StorableClass, baseStorable } from "shared/utils/memory/MemoryManager";
import { getGameObjectWrapperById } from "world_new/wrappers/base/AllGameObjects";
import { ActionDemand } from "../base/ActionHelpers";

export interface BuildMemory extends BaseActionMemory {
}

export class Build extends BaseAction<ConstructionSiteWrapper, CreepWrapper>
  implements StorableClass<Build, typeof Build, BuildMemory> {

  static fromJSON(json: BuildMemory, action?: Build): Build {
    if (!action) {
      const target = getGameObjectWrapperById(json.targetId) as ConstructionSiteWrapper;
      action = new Build(target);
    }
    BaseAction.fromJSON(json, action);
    return action;
  }

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

  calculateDemand(): ActionDemand {
    const site = this.target.getObject();
    if (!site) return {};
    const workNeeded = Math.ceil(site.progressTotal - site.progress);
    return {
      [WORK]: Math.ceil(workNeeded / BUILD_POWER),
      [CARRY]: Math.ceil(workNeeded / CARRY_CAPACITY),
    };
  }
}
