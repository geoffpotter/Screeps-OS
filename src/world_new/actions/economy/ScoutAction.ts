import { BaseCreepAction } from "../base/BaseCreepAction";
import CreepWrapper from "../../wrappers/creep/CreepWrapper";
import type { RoomWrapper } from "world_new/wrappers/room/RoomWrapper";
import { ActionDemand } from "../base/ActionDemand";

export class ScoutAction extends BaseCreepAction<RoomWrapper> {
  static actionType = "🔍";

  constructor(target: RoomWrapper) {
    super(ScoutAction.actionType, target);
    this.maxRange = 24; // Target should be in the middle of the room, max range should put creep just inside the room
  }

  canDo(object: CreepWrapper): boolean {
    return super.canDo(object);
  }

  doAction(actor: CreepWrapper): boolean {
    let creep = actor.getObject();
    if (!creep) {
      throw new Error("no creep?!! wtf");
    }
    if (this.target.room) {
      return true;
    }
    return false;
  }

  calculateDemand(): ActionDemand<BodyPartConstant> {
    let demand = new ActionDemand<BodyPartConstant>();
    demand.set(MOVE, 1);
    return demand;
  }
}
