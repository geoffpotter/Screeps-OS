import { AnyGameObjectWrapper } from "world_new/wrappers/base/GameObjectWrapper";
import { BaseAction } from "./BaseAction";
import { CreepWrapper, RoomWrapper } from "world_new/wrappers";
import { Priority } from "shared/utils/priority";
import { ActionDemand, DemandType } from "./ActionDemand";
import WorldPosition from "shared/utils/map/WorldPosition";



export abstract class BaseCreepAction<
        TargetWrapperType extends AnyGameObjectWrapper | RoomWrapper | WorldPosition = AnyGameObjectWrapper
    > extends BaseAction<TargetWrapperType, CreepWrapper, BodyPartConstant> {



    constructor(id: string, target: TargetWrapperType, priority: number = Priority.NORMAL) {
        super(id, target, priority);
    }

    canDo(creep: CreepWrapper): boolean {
        for (const part in this.demand.demand) {
            if (!creep.hasBodyPart(part as BodyPartConstant)) {
                return false;
            }
        }
        return true;
    }

    shouldDo(creep: CreepWrapper, priority: number): boolean {
        let assignmentAmount = this.getAssignmentAmount(creep, priority);
        return assignmentAmount.getTotal() > 0;
    }

    getAssignmentAmount(creep: CreepWrapper, priority: number): ActionDemand<BodyPartConstant> {
        let amountRemaining = this.getAmountRemainingByPriorityAndLocation(priority, creep.wpos) as ActionDemand<BodyPartConstant>;
        //limit by the number of parts creep has
        for (const part in amountRemaining) {
            amountRemaining.set(part as BodyPartConstant, Math.min(amountRemaining.get(part as BodyPartConstant), creep.getNumBodyParts(part as BodyPartConstant)));
        }
        return amountRemaining;
    }

}
