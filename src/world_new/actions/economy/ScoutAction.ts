import { BaseAction, BaseActionMemory } from "../base/BaseAction";
import { SourceWrapper } from "../../wrappers/source";
import CreepWrapper from "../../wrappers/creep/CreepWrapper";
import type { RoomWrapper } from "world_new/wrappers/room/RoomWrapper";
import { ActionTypes } from "../base/BaseAction";
import { StorableClass, baseStorable } from "shared/utils/memory/MemoryManager";
import { ActionDemand } from "../base/ActionHelpers";

export interface ScoutActionMemory extends BaseActionMemory {
}

export class ScoutAction extends BaseAction<RoomWrapper, CreepWrapper>
  implements StorableClass<ScoutAction, typeof ScoutAction, ScoutActionMemory> {

  static fromJSON(json: ScoutActionMemory, action?: ScoutAction): ScoutAction {
    if (!action) {
      //@ts-ignore
      const target = getRoomWrapper(json.targetId);
      action = new ScoutAction(target);
    }
    super.fromJSON(json, action);
    return action;
  }

  constructor(target: RoomWrapper) {
    super(ActionTypes.SCOUT, target);
    this.maxRange = 24; // Target should be in the middle of the room, max range should put creep just inside the room
  }

  valid(): boolean {
    // A room can always be scouted
    return true;
  }

  calculateDemand(): ActionDemand {
    return {
      [MOVE]: 1,
    };
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
}
