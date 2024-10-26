import { BaseAction } from "../base/BaseAction";
import { ControllerWrapper } from "../../wrappers/ControllerWrapper";
import CreepWrapper from "../../wrappers/creep/CreepWrapper";
import { ActionDemand } from "../base/ActionDemand";
import { BaseCreepAction } from "../base/BaseCreepAction";


export class UpgradeController extends BaseCreepAction<ControllerWrapper> {

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
  calculateDemand(): ActionDemand<BodyPartConstant> {
    const controller = this.target.getObject();
    let demand = new ActionDemand<BodyPartConstant>();
    if (!controller) return demand;
    const energyNeeded = 38;
    demand.set(WORK, Math.ceil(energyNeeded / UPGRADE_CONTROLLER_POWER));
    demand.set(CARRY, 1);
    return demand;
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
