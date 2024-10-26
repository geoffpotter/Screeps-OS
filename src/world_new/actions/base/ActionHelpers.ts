
import WorldPosition from "shared/utils/map/WorldPosition";
import { BaseAction } from "./BaseAction";
import { ActionDemand, DemandType } from "./ActionDemand";
import Logger from "shared/utils/logger";
import { BaseResourceAction } from "./BaseResourceAction";
import { BaseCreepAction } from "./BaseCreepAction";

let logger = new Logger("ActionHelpers");

export interface CanHazAction {
  currentAction: BaseAction<any, any> | false;
}

export function getTotalDemand(actions: BaseAction<any, any>[]): { totalDemand: ActionDemand; demandPos: false | WorldPosition; } {
    let totalDemand: ActionDemand = new ActionDemand();
    let demandPos: WorldPosition | false = false;
    let demandPosPriority: number = -Infinity;
    logger.log("getting total demand", actions.map(action => action.id));
    actions.forEach(action => {
      let actionDemand: ActionDemand<BodyPartConstant> = new ActionDemand();
      if (action instanceof BaseResourceAction) {
        let totalResourceDemand = action.demand.getTotal();
        actionDemand.set(CARRY, Math.ceil(totalResourceDemand / CARRY_CAPACITY));
      } else if (action instanceof BaseCreepAction) {
        actionDemand.addAll(action.demand);
      }
      if (!demandPos || action.priority > demandPosPriority) {
        logger.log("updating demandPos");
        demandPos = action.wpos;
        demandPosPriority = action.priority;
      }
      totalDemand.addAll(actionDemand);
    });
    logger.log("totalDemand", totalDemand.getTotal(), demandPos);
    return { totalDemand, demandPos };
  }
