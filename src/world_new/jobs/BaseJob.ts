import { BaseAction } from "../actions/base/BaseAction";
import { ActionDemand } from "world_new/actions/base/ActionDemand";
import { baseStorable, MemorySet, MemoryGroupedCollection } from "shared/utils/memory";
import { GameObjectWrapper } from "world_new/wrappers/base/GameObjectWrapper";
import Logger from "shared/utils/logger";
import WorldPosition from "shared/utils/map/WorldPosition";

const logger = new Logger("BaseJob");
logger.color = COLOR_CYAN;

export interface canHazJob extends GameObjectWrapper<any> {
    assignedJob: BaseJob<canHazJob> | false;
    currentAction: BaseAction<GameObjectWrapper<any>, any, any> | false;
}

export abstract class BaseJob<AssignedType extends canHazJob = canHazJob> extends baseStorable {
    protected assignedObjects: MemorySet<AssignedType>;
    protected primaryActions: MemoryGroupedCollection<BaseAction<any, any>>;
    protected secondaryActions: MemoryGroupedCollection<BaseAction<any, any>>;
    maxAssignedObjects: number;
    priority: number;

    constructor(id: string) {
        super(id);
        this.assignedObjects = new MemorySet<AssignedType>(this.fullId + "_assignedObjects");
        this.primaryActions = new MemoryGroupedCollection<BaseAction<any, any>>(
            this.fullId + "_primaryActions",
            "id",
            ["actionType"],
            undefined,
            false
        );
        this.secondaryActions = new MemoryGroupedCollection<BaseAction<any, any>>(
            this.fullId + "_secondaryActions",
            "id",
            ["actionType"],
            undefined,
            false
        );
        this.maxAssignedObjects = 0;
        this.priority = 0;
    }

    abstract update(): void;
    abstract act(): void;
    abstract needsObject(object: canHazJob, checkParts: boolean): boolean;

    // Action Management Methods
    syncActions(newPrimaryActions: BaseAction<any, any>[], newSecondaryActions?: BaseAction<any, any>[]) {
        this.syncActionCollection(this.primaryActions, newPrimaryActions);
        if (newSecondaryActions) {
            this.syncActionCollection(this.secondaryActions, newSecondaryActions);
        }
    }

    protected syncActionCollection(collection: MemoryGroupedCollection<BaseAction<any, any>>, newActions: BaseAction<any, any>[]) {
        for (let action of newActions) {
            if (!collection.hasId(action.id)) {
                collection.add(action);
            }
        }
        for (let action of collection.getAll()) {
            if (!newActions.some(newAction => newAction.id === action.id)) {
                collection.removeById(action.id);
            }
        }
    }

    addPrimaryAction(action: BaseAction<any, any>) {
        logger.log(this.id, "added primary action", action.id)
        this.primaryActions.add(action);
    }

    addSecondaryAction(action: BaseAction<any, any>) {
        logger.log(this.id, "added secondary action", action.id)
        this.secondaryActions.add(action);
    }

    removeAction(action: BaseAction<any, any>) {
        if (this.primaryActions.hasId(action.id)) {
            this.primaryActions.removeById(action.id);
        } else if (this.secondaryActions.hasId(action.id)) {
            this.secondaryActions.removeById(action.id);
        }
    }

    hasAction(action: BaseAction<any, any>) {
        return this.primaryActions.hasId(action.id) || this.secondaryActions.hasId(action.id);
    }

    getAction(actionId: string) {
        return this.primaryActions.getById(actionId) || this.secondaryActions.getById(actionId);
    }

    forEachAction(callback: (action: BaseAction<any, any>, id: string, collection: MemoryGroupedCollection<BaseAction<any, any>>) => void) {
        this.primaryActions.forEach(callback);
        this.secondaryActions.forEach(callback);
    }

    // Base object assignment methods
    protected isAtMaxCapacity(): boolean {
        return this.maxAssignedObjects > 0 && this.assignedObjects.size >= this.maxAssignedObjects;
    }

    unassignObject(object: AssignedType) {
        this.assignedObjects.delete(object);
        object.assignedJob = false;
        logger.log("unassigned object", object.id, "from job", this.id, this.assignedObjects.size, "assigned objects");
    }

    numActions(): number {
        return this.primaryActions.size + this.secondaryActions.size;
    }

    findActionForObject(object: canHazJob) {
        let allActions = [...this.primaryActions.getAll(), ...this.secondaryActions.getAll()];
        let validActions = allActions.filter(action => action.canDo(object));
        let sortedActions = validActions.sort((a, b) => {
            if (a.priority !== b.priority) {
                return b.priority - a.priority;
            }
            return a.wpos.getRangeTo(object.wpos) - b.wpos.getRangeTo(object.wpos);
        });

        for (let action of sortedActions) {
            if (action.shouldDo(object, this.priority)) {
                return action;
            }
        }
        return false;
    }
}
