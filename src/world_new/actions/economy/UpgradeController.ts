import { BaseAction, BaseActionMemory } from "../base/BaseAction";
import { ControllerWrapper } from "../../wrappers/ControllerWrapper";
import CreepWrapper from "../../wrappers/creep/CreepWrapper";
import { StorableClass, baseStorable } from "shared/utils/memory/MemoryManager";
import { getGameObjectWrapperById } from "world_new/wrappers/base/AllGameObjects";
import { ActionDemand } from "../base/ActionHelpers";

export interface UpgradeControllerMemory extends BaseActionMemory {
}

export class UpgradeController extends BaseAction<ControllerWrapper, CreepWrapper>
  implements StorableClass<UpgradeController, typeof UpgradeController, UpgradeControllerMemory> {

  static fromJSON(json: UpgradeControllerMemory, action?: UpgradeController): UpgradeController {
    if (!action) {
      const target = getGameObjectWrapperById(json.targetId) as ControllerWrapper;
      action = new UpgradeController(target);
    }
    BaseAction.fromJSON(json, action);
    return action;
  }

  static actionType = "⬆️🏛️";

  constructor(target: ControllerWrapper) {
    super(UpgradeController.actionType, target);
    this.maxRange = 3;
  }

  canDo(object: CreepWrapper): boolean {
    return super.canDo(object) && object.hasBodyPart(WORK) && object.hasBodyPart(CARRY);
  }

  shouldDo(object: CreepWrapper, priority:number): boolean {
    if (!super.shouldDo(object, priority)) return false;
    return object.store.getAmount(RESOURCE_ENERGY) > 0;
  }
  calculateDemand(): ActionDemand {
    const controller = this.target.getObject();
    if (!controller) return {};
    const energyNeeded = 38;
    return {
      [WORK]: Math.ceil(energyNeeded / UPGRADE_CONTROLLER_POWER),
      [CARRY]: 1,
    };
  }
  doAction(actor: CreepWrapper): boolean {
    if (actor.wpos.getRangeTo(this.target.wpos) <= this.maxRange) {
      let creep = actor.getObject();
      let controller = this.target.getObject();
      if (creep && controller) {
        let result = creep.upgradeController(controller);
        let creepIsEmpty = actor.store.total == 0;
        if (result !== OK || creepIsEmpty) {
          return true;
        }
      }
    }
    return false;
  }
}
