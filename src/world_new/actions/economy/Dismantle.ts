import { BaseAction, BaseActionMemory } from "../base/BaseAction";
import { KillableWrapper } from "../../wrappers/base/KillableWrapper";
import CreepWrapper from "../../wrappers/creep/CreepWrapper";
import { StorableClass, baseStorable } from "shared/utils/memory/MemoryManager";
import { getGameObjectWrapperById } from "world_new/wrappers/base/AllGameObjects";
import { ActionDemand } from "../base/ActionHelpers";

export interface DismantleMemory extends BaseActionMemory {
}

export class Dismantle extends BaseAction<KillableWrapper<Structure>, CreepWrapper>
  implements StorableClass<Dismantle, typeof Dismantle, DismantleMemory> {

  static fromJSON(json: DismantleMemory, action?: Dismantle): Dismantle {
    if (!action) {
      const target = getGameObjectWrapperById(json.targetId) as KillableWrapper<Structure>;
      action = new Dismantle(target);
    }
    BaseAction.fromJSON(json, action);
    return action;
  }

  static actionType = "🔨";

  constructor(target: KillableWrapper<Structure>) {
    super(Dismantle.actionType, target);
    this.maxRange = 1;
  }

  calculateDemand(): ActionDemand {
    const structure = this.target.getObject();
    if (!structure) return {};
    return {
      [WORK]: Math.ceil(structure.hits / DISMANTLE_POWER),
    };
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
}
