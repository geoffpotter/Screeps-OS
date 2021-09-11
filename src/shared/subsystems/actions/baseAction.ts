
import loggerClass from "utils/logger";

logger = new loggerClass("util.actions");
//logger.color = COLOR_GREY;

import { IndexingCollection } from "utils/indexingCollection";
import _ from "lodash";

import { FakeGameObject } from "utils/settings";
import { getSettings } from "utils/settings";
import { Creep } from "game/prototypes";

let settings = getSettings();


class actionAssignment {
    taskId: string;
    assignedId: string;
    resourceAmounts: {};
    priority: number;
    constructor(taskId: string, assignedId: string, resourceAmounts: {}, priority: number) {
        this.taskId = taskId;
        this.assignedId = assignedId;
        this.resourceAmounts = resourceAmounts;
        this.priority = priority;
    }

    get id() {
        return this.taskId + "-" + this.assignedId;
    }
}

interface ResourceAmounts {
    [id:string]: number
}

class baseAction {
    targetId: string;
    pos: any;
    actionType: string;
    resourceAmounts: ResourceAmounts;
    assignments: IndexingCollection<actionAssignment>;
    targetRange: number;
    maxRange: number;
    maxAssignments: number;
    displayTask: boolean;
    constructor(targetId: string, pos: any, resourceAmounts: ResourceAmounts, actionType = "not implemented!!!") {
        this.targetId = targetId;
        this.pos = pos;
        this.actionType = actionType;
        this.resourceAmounts = resourceAmounts;

        this.assignments = new IndexingCollection<actionAssignment>("id", ["priority"], [100000]);

        //position control
        this.targetRange = 1; // start out trying to get within this range, if we're within max range, then don't bother re-pathing
        this.maxRange = 1; // if we're farther out than this, then try to get within target range.

        this.maxAssignments = 1000;
        this.displayTask = false;
    }

    getTarget():any {
        let obj = settings.getObjectById(this.targetId);
        if(!obj)
            return false;

        return obj;
    }


    get id() {
        //return `${this.actionType}-${this.targetId}`;
        return `${this.actionType}-${this.pos.x}-${this.pos.y}-${this.pos.roomName}`;
    }

    get amount() {
        let totalWork = _.reduce<number, number>(this.resourceAmounts, (sum, ra) => {
            return sum + ra;
        })
        return totalWork ? totalWork : 0;
    }

    get amountAssigned() {
        let total = _.reduce<actionAssignment, number>(this.assignments.getAll(), (sum, a) => {
            let assignmentSum = _.reduce<number, number>(a.resourceAmounts, (sum, ra) => {
                return sum + ra;
            });
            return sum + assignmentSum;
        });

        return total ? total : 0;
    }

    get amountRemaining() {
        return Math.max(this.amount - this.amountAssigned, 0);
    }

    amountRemainingByPriority(priority: number) {
        if (this.assignments.getAll().length >= this.maxAssignments) {
            return 0;
        }
        let amountRemaining = this.amount;

        this.assignments.forEach((assignment: actionAssignment) => {
            //logger.log(assignment.priority, priority)
            if (assignment.priority >= priority) {
                amountRemaining -= _.reduce<number, number>(assignment.resourceAmounts, (sum, ra) => {
                    return sum + ra;
                });
            }
        });
        return amountRemaining;
    }

    amountRemainingByPriorityAndPos(priority: number, pos: any) {
        let start = Game.cpu.getUsed();
        let log = (...args: any[]) => {
            let usedNow = Game.cpu.getUsed();
            let used = usedNow - start;
            logger.log("cpu used:", used, ...args);
            start = usedNow;
        }

        let amountRemaining = this.amount;
        let assignmentsCounted = 0;
        let targetRange = settings.getRange(pos, this.pos);
        //log("got target range:" + targetRange)
        //logger.log(this.id, this.assignments.getAll().length)
        this.assignments.forEach((assignment: actionAssignment) => {
            let assignedObj = settings.getObjectById(assignment.assignedId);
            //logger.log("ajsdflakjsd--------------",assignedObj)
            let range;
            if (assignedObj) {

                range =  settings.getRange(this.pos, assignedObj);
                //range = this.pos.toWorldPosition().getRangeTo(assignedObj.pos);
            } else {
                range = 1000000;
            }
            //logger.log(assignment.id, assignment.priority, priority, range, targetRange)
            //log("found range:" + range)
            if (assignment.priority >= priority && range <= targetRange) {
                amountRemaining -= _.reduce<number, number>(assignment.resourceAmounts, (sum, ra) => {
                    return sum + ra;
                });
                assignmentsCounted++;
            }
            //log("asignment assessed:"+ amountRemaining)
        });
        logger.log(this.id, 'remaining amount:', amountRemaining, assignmentsCounted, this.maxAssignments)
        return assignmentsCounted >= this.maxAssignments ? 0 : amountRemaining;
    }

    display() {
        settings.drawText(this.actionType + "(" + Object.keys(this.assignments.getAll()).length + ")", this.pos);
    }

    isCreepAssigned(creep: { id: any; }) {
        let testAssignment = new actionAssignment(this.id, creep.id, {}, 0);
        return this.assignments.has(testAssignment);
    }

    assignObject(object: FakeGameObject, priority=1):boolean {
        if (this.amountRemaining <= 0) {
            throw new Error("assigning creep to a task with no room!");
        }
        let amt = this.getAssignmentAmount(object);
        let assignment = new actionAssignment(this.id, object.id, amt, priority);

        if (this.assignments.getAll().length >= this.maxAssignments) {
            let assignmentsByPriority = this.assignments.getGroup("priority");
            let priorities = Object.keys(assignmentsByPriority).sort();
            let lowestPriority = Number.parseFloat(priorities[0]);

            if (priority == lowestPriority) {
                logger.log(object, this.id, "distance lookup");
                let allAssignments = _.sortBy(this.assignments.getAll(), (a) => {
                    let assignmentObj = settings.getObjectById(a.assignedId);
                    if (!assignmentObj) {
                        return 1000000;
                    }
                    return settings.getRange(this.pos, assignmentObj)
                }).reverse();
                /** @type {actionAssignment} */
                let farthestAssignment = allAssignments[0];
                let farthestAssignedObj = settings.getObjectById(farthestAssignment.assignedId);
                if (farthestAssignedObj) {
                    logger.log(this.pos, farthestAssignedObj, object)
                    logger.log(object, "stealin jobs", this.id, settings.getRange(this.pos, farthestAssignedObj), settings.getRange(this.pos, object))
                    if (
                        settings.getRange(this.pos, farthestAssignedObj)
                            > settings.getRange(this.pos, object)
                        ) {

                            this.unassignCreep(farthestAssignedObj);
                    } else {
                        return false;
                        //throw new Error("trying to assign a shit creep when there's better options closer by already, fix yo shit")
                    }
                }

            } else if (priority <= lowestPriority) {
                logger.log(object, this.id);
                this.assignments.forEach((a:actionAssignment) => {
                    logger.log(a.id)
                });
                return false;
                //throw new Error("trying to assign a shit creep when there's better options already, fix yo shit")
            }

            let shitAssignments = assignmentsByPriority[lowestPriority];
            let theLoserId = shitAssignments[0];
            let theLoser = this.assignments.getById(theLoserId);
            if (theLoser) {
                this.assignments.remove(theLoser);
            }

        }

        this.assignments.add(assignment);
        return true
    }

    unassignCreep(object: FakeGameObject) {
        let tempAssignment = new actionAssignment(this.id, object.id, {}, 1);
        let assignment = this.assignments.getById(tempAssignment.id);
        if(!assignment) {
            //object isn't assigned.. maybe should throw error..
            logger.log("trying to unassign object that isn't assigned.", this.id, object.id);
            return;
        }
        // logger.log(creep.id, "unassigning");
        // this.assignments.forEach((a) => {
        //     logger.log(a.id, a.priority)
        // })
        this.assignments.remove(assignment);
    }

    /******************************************************************************
     * virtual methods
     *
     * these will generally need to be overriden by the task class to provide task specific implementations
     *
     */


    /**
     * Creep could possibly do this job type
     */
    canDo(object: FakeGameObject):boolean {
        return false;
    }

    /**
     * Get the amount for the assignment for this creep
     */
    getAssignmentAmount(object: FakeGameObject):number {
        logger.log(this.id, "has no assignCreep implementation!");
        throw new Error(this.id + "has no assignCreep implementation!");
    }

    /**
     * Move into position to do the job
     * @param {FakeGameObject} creep
     */
    moveToPosition(creep: Creep) {
        if ( settings.getDistance(this.pos, creep) > this.targetRange) {
            creep.moveTo(this.pos);

            //global.utils.pStar.inst.moveTo(creep, {pos:this.pos, range: this.targetRange});
        }

    }
    /**
     * Do the job, if in range
     * @param {Creep} creep
     *
     *
     *
     *
     * @returns {Boolean} True for Creep should consider itself done with job.
     */
    preformJob(creep: any) {
        logger.log(this.id, "has no preformJob implementation!");
        throw new Error(this.id + "has no preformJob implementation!");
    }

}
