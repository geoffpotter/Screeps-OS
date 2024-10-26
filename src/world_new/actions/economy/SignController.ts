import { BaseCreepAction } from "../base/BaseCreepAction";
import { ControllerWrapper } from "../../wrappers/ControllerWrapper";
import CreepWrapper from "../../wrappers/creep/CreepWrapper";
import { ActionDemand } from "../base/ActionDemand";


export class SignController extends BaseCreepAction<ControllerWrapper> {
  static actionType = "✍️🏛️";
  private text: string;

  constructor(target: ControllerWrapper, text: string) {
    super(SignController.actionType, target);
    this.maxRange = 1;
    this.text = text;
  }

  calculateDemand(): ActionDemand<BodyPartConstant> {
    let demand = new ActionDemand<BodyPartConstant>();
    demand.set(MOVE, 1);
    return demand;
  }

  canDo(object: CreepWrapper): boolean {
    return super.canDo(object);
  }

  doAction(actor: CreepWrapper): boolean {
    if (actor.wpos.getRangeTo(this.target.wpos) <= this.maxRange) {
      let creep = actor.getObject();
      let controller = this.target.getObject();
      if (creep && controller) {
        let result = creep.signController(controller, this.text);
        return result === OK;
      }
    }
    return false;
  }
}
