import { BaseAction, BaseActionMemory } from "../base/BaseAction";
import { KillableWrapper } from "../../wrappers/base/KillableWrapper";
import CreepWrapper from "../../wrappers/creep/CreepWrapper";
import { StorableClass, baseStorable } from "shared/utils/memory/MemoryManager";
import { getGameObjectWrapperById } from "world_new/wrappers/base/AllGameObjects";
import { ActionDemand } from "../base/ActionHelpers";

export interface RepairMemory extends BaseActionMemory {
}

export class Repair extends BaseAction<KillableWrapper<Structure>, CreepWrapper>
  implements StorableClass<Repair, typeof Repair, RepairMemory> {

  static fromJSON(json: RepairMemory, action?: Repair): Repair {
    if (!action) {
      const target = getGameObjectWrapperById(json.targetId) as KillableWrapper<Structure>;
      action = new Repair(target);
    }
    BaseAction.fromJSON(json, action);
    return action;
  }

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

  calculateDemand(): ActionDemand {
    const structure = this.target.getObject();
    if (!structure) return {};
    const repairNeeded = structure.hitsMax - structure.hits;
    return {
      [WORK]: Math.ceil(repairNeeded / REPAIR_POWER)
    };
  }
}
