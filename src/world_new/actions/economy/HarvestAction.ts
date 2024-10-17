import { BaseAction, BaseActionMemory } from "../base/BaseAction";
import { SourceWrapper } from "../../wrappers/source";
import CreepWrapper from "../../wrappers/creep/CreepWrapper";
import { ActionTypes } from "../base/BaseAction";
import { MineralWrapper } from "../../wrappers/MineralWrapper";
import { DepositWrapper } from "world_new/wrappers";
import { StorableClass, baseStorable } from "shared/utils/memory/MemoryManager";
import { getGameObjectWrapperById } from "world_new/wrappers/base/AllGameObjects";
import { BasePartAction, BasePartActionMemory } from "../base/BasePartAction";
import Logger from "shared/utils/logger";
import { ActionDemand } from "../base/ActionHelpers";
let logger = new Logger("HarvestAction");

export interface HarvestActionMemory extends BasePartActionMemory {
}

type harvestable = SourceWrapper | MineralWrapper | DepositWrapper;
export class HarvestAction extends BasePartAction<harvestable, CreepWrapper>
  implements StorableClass<HarvestAction, typeof HarvestAction, HarvestActionMemory> {

  static fromJSON(json: HarvestActionMemory, action?: HarvestAction): HarvestAction {
    if (!action) {
      const target = getGameObjectWrapperById(json.targetId) as harvestable;
      action = new HarvestAction(target, []);
      BasePartAction.fromJSON(json, action);
    }
    BaseAction.fromJSON(json, action);
    return action;
  }

  constructor(target: harvestable, requiredParts?: BodyPartConstant[]) {
    super(ActionTypes.HARVEST, target, requiredParts);
    this.maxRange = 1; // Harvesting requires being adjacent to the source
    this.requiredParts.setAmount(WORK, 5);
  }

  valid(): boolean {
    return this.target.canBeHarvested();
  }

  doAction(actor: CreepWrapper): boolean {
    if (actor.wpos.getRangeTo(this.target.wpos) <= this.maxRange) {
      let creep = actor.getObject();
      let source = this.target.getObject();
      if (creep && source) {
        let result = creep.harvest(source);
        if (result !== OK) {
          logger.log("HarvestAction", "doAction", "failed", result, creep.id, source.id);
          return true;
        }
        // logger.log("HarvestAction", "doAction", "creepIsFull", actor.id, actor.store.totalFree, actor.store.total, actor.hasBodyPart(CARRY) && actor.store.totalFree == 0);
        let creepIsFull = actor.hasBodyPart(CARRY) && actor.store.totalFree == 0;
        if (creepIsFull) {
          return true;
        }
      }
    }
    return false;
  }

  shouldDo(object: CreepWrapper, priority:number): boolean {
    if (!super.shouldDo(object, priority)) return false;
    return object.store.total == 0 || object.store.totalFree > 0;
  }

  calculateDemand(): ActionDemand {
    const source = this.target.getObject();
    if (!source) return {};
    if (source instanceof Source) {
    return {
      [WORK]: Math.min(5, Math.ceil(source.energyCapacity / HARVEST_POWER))
      };
    }
    if (source instanceof Mineral) {
      return {
        [WORK]: Math.min(5, Math.ceil(source.mineralAmount / HARVEST_POWER))
      };
    }
    if (source instanceof Deposit) {
      return {
        [WORK]: 10
      };
    }
    return {};
  }
}
