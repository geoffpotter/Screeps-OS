
import WorldPosition from "shared/utils/map/WorldPosition";
import { BaseAction } from "./BaseAction";

export type ActionDemand = {
    [K in BodyPartConstant]?: number;
};

export function getTotalDemand(actions: BaseAction<any, any>[]): { totalDemand: ActionDemand; demandPos: false | WorldPosition; } {
    let totalDemand: ActionDemand = {};
    let demandPos: WorldPosition | false = false;
    let demandPosPriority: number = 0;
    // logger.log("getting total demand", this.actions.getAll().map(action=>action.id));
    actions.forEach(action => {
      _.forEach(action.currentDemand, (value, key) => {
        // logger.log("wtf", key, value);
        if (!key) {
          return;
        }
        // logger.log("looking at action for spawning", action.id, action.wpos, action.priority, action.actionType, action.currentDemand);
        if (!demandPos || action.priority > demandPosPriority) {
          demandPos = action.wpos;
          demandPosPriority = action.priority;
        }
        totalDemand[key as BodyPartConstant] = (totalDemand[key as BodyPartConstant] || 0) + value;
      });
    });
    return { totalDemand, demandPos };
  }
