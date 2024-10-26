import { BaseCreepAction } from "../base/BaseCreepAction";
import { SourceWrapper } from "../../wrappers/source";
import CreepWrapper from "../../wrappers/creep/CreepWrapper";
import { MineralWrapper } from "../../wrappers/MineralWrapper";
import { DepositWrapper } from "world_new/wrappers";
import Logger from "shared/utils/logger";
import { ActionDemand } from "../base/ActionDemand";
import { getRoomIntel } from "shared/subsystems/intel";
import { RoomMode } from "world_new/wrappers/room";

let logger = new Logger("HarvestAction");
logger.enabled = false;

type Harvestable = SourceWrapper | MineralWrapper | DepositWrapper;

export class HarvestAction extends BaseCreepAction<Harvestable> {
  static actionType = "⛏️";

  constructor(target: Harvestable) {
    super(HarvestAction.actionType, target);
    this.maxRange = 1;
  }

  shouldDo(object: CreepWrapper, priority: number): boolean {
    if (!super.shouldDo(object, priority)) return false;
    return object.store.maxTotal == 0 || object.store.totalFree > 0;
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
        let creepIsFull = actor.hasBodyPart(CARRY) && actor.store.totalFree == 0;
        if (creepIsFull) {
          return true;
        }
      }
    }
    return false;
  }

  calculateDemand(): ActionDemand<BodyPartConstant> {
    const source = this.target.getObject();
    if (!source) return new ActionDemand<BodyPartConstant>();
    let demand = new ActionDemand<BodyPartConstant>();
    if (source instanceof Source) {
      logger.log("here", this.target.roomWrapper.roomMode);
      if (this.target.roomWrapper.roomMode == RoomMode.OWNED || this.target.roomWrapper.roomMode == RoomMode.REMOTE_RESERVED) {
        demand.set(WORK, 5);
      } else if (this.target.roomWrapper.roomMode == RoomMode.REMOTE_UNOWNED) {
        demand.set(WORK, 3);
      } else {
        demand.set(WORK, 0);
      }
    } else if (source instanceof Mineral) {
      // logger.log("here2");
      if (this.target.roomWrapper.roomMode == RoomMode.OWNED || this.target.roomWrapper.roomMode == RoomMode.REMOTE_RESERVED) {
        demand.set(WORK, 10);
      } else {
        demand.set(WORK, 0);
      }
    } else if (source instanceof Deposit) {
      // logger.log("here3");
      demand.set(WORK, 10);
    }
    logger.log("HarvestAction", "calculateDemand", demand.getTotal());
    return demand;
  }
}
