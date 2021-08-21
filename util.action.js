let logger = require("screeps.logger");
logger = new logger("util.actions");
//logger.color = COLOR_GREY;

let processClass = require("INeRT.process");
let threadClass = require("INeRT.thread");

let IndexingCollection = global.utils.array.classes.IndexingCollection

let intelClass = require("pr.intel");




//actions
let pickup = "📤";
let dropoff = "📥";
let feed = "👨‍🍳"; 
let eat = "🍴";

//places/things
let controller = "⛪";
let storage = "🛄";
let terminal = "📈";
let container = "🔋";
let spawns = "🏠";
let creep = "💃";


class actionTypes {
        // general tasks
        static get MINE() { return "⛏" };
        static get PRAISE() { return "🙌" };
        static get BUILD() { return "🔨️" };
        static get REPAIR() { return "🔧" };
        static get FILLTOWERS() { return "🗼" };
        static get DROP() { return "🚯" };

        //resource tasks
        static get PICKUP() { return pickup };
        static get PICKUP_STORAGE() { return pickup + storage };
        static get PICKUP_TERMINAL() { return pickup + terminal };
        static get PICKUP_CONTAINER() { return pickup + container };
        static get PICKUP_SPAWN() { return pickup + spawns };
        static get PICKUP_CREEP() { return pickup + creep };

        static get DROPOFF() { return dropoff };
        static get DROPOFF_STORAGE() { return dropoff + storage };
        static get DROPOFF_TERMINAL() { return dropoff + terminal };
        static get DROPOFF_CONTAINER() { return dropoff + container };
        static get DROPOFF_SPAWN() { return dropoff + spawns };
        static get DROPOFF_CREEP() { return dropoff + creep };
        
        //feed/eat
        static get FEED_CONTROLLER() { return feed + controller };
        static get FEED_SPAWN() { return feed + spawns };

        static get EAT_CONTROLLER() { return eat + controller };
        static get EAT_SPAWN() { return eat + spawns };


}

class actionOptIn {
    constructor(actionType, range, priority, filterFN = false, sortFN = false) {
        this.actionType = actionType;
        this.range = range;
        this.priority = priority;
        this.filterFN = filterFN;
        if (!sortFN) {
            this.sortFN = (creep, action) => {
                let range = global.utils.pStar.findDistance(creep.pos, action.pos);
                return range;
            }
        } else {
            this.sortFN = sortFN;
        }
    }
}

class actionAssignment {
    constructor(taskId, assignedId, resourceAmounts, priority) {
        this.taskId = taskId;
        this.assignedId = assignedId;
        this.resourceAmounts = resourceAmounts;
        this.priority = priority;
    }

    get id() {
        return this.taskId + "-" + this.assignedId;
    }
}

class baseAction {
    constructor(targetId, pos, resourceAmounts) {
        this.targetId = targetId;
        this.pos = pos;
        /** @type {String} */
        this.actionType = false;
        this.resourceAmounts = resourceAmounts;

        this.assignments = new IndexingCollection("id", ["priority"], [100000]);

        //position control
        this.targetRange = 1; // start out trying to get within this range, if we're within max range, then don't bother re-pathing
        this.maxRange = 1; // if we're farther out than this, then try to get within target range.
        
        this.maxAssignments = 1000;
        this.displayTask = false;
        this.init();
    }
    /**
     * To be overriden by implementation classes to set this.actionType and inject/change vars
     */
    init() {

    }

    instCanDo(creep) {
        //logger.log(this.constructor);
        //logger.log(this.constructor.canDo)
        return this.constructor.canDo(creep);
    }
    getTarget() {
        let obj = Game.getObjectById(this.targetId);
        if(!obj) 
            return false;

        return obj;
    }


    get id() {
        //return `${this.actionType}-${this.targetId}`;
        return `${this.actionType}-${this.pos.x}-${this.pos.y}-${this.pos.roomName}`;
    }

    get amount() {
        let totalWork = _.reduce(this.resourceAmounts, (sum, ra) => {
            return sum + ra;
        })
        return totalWork ? totalWork : 0;
    }

    get amountAssigned() {
        let total = _.reduce(this.assignments, (sum, a) => {
            let assignmentSum = _.reduce(a.resourceAmounts, (sum, ra) => {
                return sum + ra;
            });
            return sum + assignmentSum;
        });

        return total ? total : 0;
    }

    get amountRemaining() {
        return Math.max(this.amount - this.amountAssigned, 0);
    }

    amountRemainingByPriority(priority) {
        if (this.assignments.getAll().length >= this.maxAssignments) {
            return 0;
        }
        let amountRemaining = this.amount;

        this.assignments.forEach((assignment) => {
            //logger.log(assignment.priority, priority)
            if (assignment.priority >= priority) {
                amountRemaining -= _.reduce(assignment.resourceAmounts, (sum, ra) => {
                    return sum + ra;
                });
            }
        });
        return amountRemaining;
    }

    amountRemainingByPriorityAndPos(priority, pos) {
        let start = Game.cpu.getUsed();
        let log = (...args) => {
            let usedNow = Game.cpu.getUsed();
            let used = usedNow - start;
            logger.log("cpu used:", used, ...args);
            start = usedNow;
        }

        let amountRemaining = this.amount;
        let assignmentsCounted = 0;
        let targetRange = global.utils.pStar.findDistance(pos, this.pos);
        //log("got target range:" + targetRange)
        //logger.log(this.id, this.assignments.getAll().length)
        this.assignments.forEach((assignment) => {
            let assignedObj = Game.getObjectById(assignment.assignedId);
            //logger.log("ajsdflakjsd--------------",assignedObj)
            let range;
            if (assignedObj) {

                range = global.utils.pStar.findDistance(this.pos, assignedObj.pos);
                //range = this.pos.toWorldPosition().getRangeTo(assignedObj.pos);
            } else {
                range = 1000000;
            }
            //logger.log(assignment.id, assignment.priority, priority, range, targetRange)
            //log("found range:" + range)
            if (assignment.priority >= priority && range <= targetRange) {
                amountRemaining -= _.reduce(assignment.resourceAmounts, (sum, ra) => {
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
        global.utils.visual.drawText(this.actionType + "(" + Object.keys(this.assignments.getAll()).length + ")", this.pos);
    }

    isCreepAssigned(creep) {
        let testAssignment = new actionAssignment(this.id, creep.id, {}, 0);
        return this.assignments.has(testAssignment);
    }

    assignCreep(creep, priority=1) {
        if (this.amountRemaining <= 0) {
            throw new Error("assigning creep to a task with no room!");
        }
        let amt = this.getAssignmentAmount(creep);
        let assignment = new actionAssignment(this.id, creep.id, amt, priority);
        
        if (this.assignments.getAll().length >= this.maxAssignments) {
            let assignmentsByPriority = this.assignments.getGroup("priority");
            let priorities = Object.keys(assignmentsByPriority).sort();
            let lowestPriority = priorities[0];

            if (priority == lowestPriority) {
                logger.log(creep, this.id, "distance lookup");
                let allAssignments = _.sortBy(this.assignments.getAll(), (a) => {
                    let assignmentObj = Game.getObjectById(a.assignedId);
                    if (!assignmentObj) {
                        return 1000000;
                    }
                    return global.utils.pStar.findDistance(this.pos, assignmentObj.pos)
                }).reverse();
                /** @type {actionAssignment} */
                let farthestAssignment = allAssignments[0];
                let farthestAssignedObj = Game.getObjectById(farthestAssignment.assignedId);
                if (farthestAssignedObj) {
                    logger.log(this.pos, farthestAssignedObj.pos, creep.pos)
                    logger.log(creep, "stealin jobs", this.id, global.utils.pStar.findDistance(this.pos, farthestAssignedObj.pos), global.utils.pStar.findDistance(this.pos, creep.pos))
                    if (
                        global.utils.pStar.findDistance(this.pos, farthestAssignedObj.pos) 
                            > global.utils.pStar.findDistance(this.pos, creep.pos)
                        ) {
                            
                            this.unassignCreep(farthestAssignedObj);
                    } else {
                        return false;
                        //throw new Error("trying to assign a shit creep when there's better options closer by already, fix yo shit")    
                    }
                }
                
            } else if (priority <= lowestPriority) {
                logger.log(creep, this.id);
                this.assignments.forEach((a) => {
                    logger.log(a.id)
                })
                throw new Error("trying to assign a shit creep when there's better options already, fix yo shit")
            }

            let shitAssignments = assignmentsByPriority[lowestPriority];
            let theLoserId = shitAssignments[0];
            let theLoser = this.assignments.getById(theLoserId);
            if (theLoser) {
                this.assignments.remove(theLoser);
            }
            
        }

        this.assignments.add(assignment);
    }

    unassignCreep(creep) {
        let assignment = new actionAssignment(this.id, creep.id, {}, 1);
        assignment = this.assignments.getById(assignment.id);
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
     * @param {Creep} creep 
     * 
     * @returns {Boolean}
     */
    static canDo(creep) {
        return false;
    }

    /**
     * Get the amount for the assignment for this creep
     * @param {Creep} creep 
     * 
     * @returns {number} the amount for this creep/job
     */
    getAssignmentAmount(creep) {
        logger.log(this.name, "has no assignCreep implementation!");
        throw new Error(this.name + "has no assignCreep implementation!");
    }
    /**
     * Move into position to do the job
     * @param {Creep} creep 
     */
    moveToPosition(creep) {
        if (!this.pos.inRangeTo(creep, this.targetRange)) {
            global.utils.pStar.inst.moveTo(creep, {pos:this.pos, range: this.targetRange});
        }
        
    }
    /**
     * Do the job, if in range
     * @param {Creep} creep
     * 
     * @returns {Boolean} True for Creep should consider itself done with job. 
     */
    preformJob(creep) {
        logger.log(this.name, "has no preformJob implementation!");
        throw new Error(this.name + "has no preformJob implementation!");
    }

}

class mineAction extends baseAction {
    /**
    * Creep could possibly do this job type
    * @param {Creep} creep 
    * 
    * @returns {Boolean}
    */
    static canDo(creep) {
        return creep.numParts(WORK) > 0 && creep.store.getFreeCapacity() > 0;
    }


    init() {
        this.actionType = actionTypes.MINE;
    }
    getAssignmentAmount(creep) {
        return {
            RESOURCE_ENERGY: creep.store.getFreeCapacity()
        }
    }

    /**
     * 
     * @param {Creep} creep 
     */
    preformJob(creep) {
        /** @type {Source} */
        let target = this.getTarget();
        if (!target) {
            throw new Error("I dunno man.. wtf.  no target?  why isn't the creep right next to it?")
        }

        let ret = creep.harvest(target);
        //logger.log(creep, "did the Action!", this.actionType, ret);
        return creep.store.getFreeCapacity() == 0;
    }
}

class praiseAction extends baseAction {
    /**
        * Creep could possibly do this job type
        * @param {Creep} creep 
        * 
        * @returns {Boolean}
        */
    static canDo(creep) {
        return creep.numParts(WORK) > 0 && creep.store[RESOURCE_ENERGY] > 0;
    }


    init() {
        this.actionType = actionTypes.PRAISE;
    }
    getAssignmentAmount(creep) {
        return {
            RESOURCE_ENERGY: creep.store[RESOURCE_ENERGY]
        }
    }

    /**
     * 
     * @param {Creep} creep 
     */
    preformJob(creep) {
        /** @type {Source} */
        let target = this.getTarget();
        if (!target) {
            throw new Error("I dunno man.. wtf.  no target?  why isn't the creep right next to it?")
        }

        let ret = creep.upgradeController(target);
        //logger.log(creep, "did the Action!", this.actionType, ret);
        return creep.store[RESOURCE_ENERGY] == 0;
    }
}


class pickupAction extends baseAction {
    /**
    * Creep could possibly do this job type
    * @param {Creep} creep 
    * 
    * @returns {Boolean}
    */
    static canDo(creep) {
        if (creep.store.getFreeCapacity() == 0) {
            return false;
        }

        return true;
    }

    init() {
        this.actionType = actionTypes.PICKUP;
    }
    getAssignmentAmount(creep) {
        let assignment = {};
        for(let r in creep.store) {
            if (this.resourceAmounts[r] > 0) {
                assignment[r] = Math.min(this.resourceAmounts[r], creep.store.getFreeCapacity(r));
            }
        }
        return assignment;
    }
    /**
     * 
     * @param {Creep} creep 
     */
    preformJob(creep) {
        /** @type {Source} */
        let target = this.getTarget();
        if (!target) {
            return true;
        }
        let res = creep.pickup(target);
        if (res === OK) {
            return true;
        }
        return false;
    }

}

class dropAction extends baseAction {
    /**
    * Creep could possibly do this job type
    * @param {Creep} creep 
    * 
    * @returns {Boolean}
    */
    static canDo(creep) {
        if (creep.store.getUsedCapacity() == 0) {
            return false;
        }

        return true;
    }
    init() {
        this.actionType = actionTypes.DROP;
    }
    getAssignmentAmount(creep) {
        let assignment = {};
        for(let r in creep.store) {
            if (this.resourceAmounts[r] > 0) {
                assignment[r] = Math.min(this.resourceAmounts[r], creep.store[r]);
            }
        }
        return assignment;
    }
    /**
     * 
     * @param {Creep} creep 
     */
    preformJob(creep) {
        /** @type {Source} */
        let target = this.getTarget();
        if (!target) {
            throw new Error("I dunno man.. wtf.  no target?  why isn't the creep right next to it?")
        }
        for(let r in creep.store) {
            if (this.resourceAmounts[r] > 0) {
                creep.drop(r, Math.min(this.resourceAmounts[r], creep.store[r]));
                return false;
            }
        }
        return Object.keys(creep.store).length <= 1;
    }

}

class dropoffAction extends baseAction {
    /**
    * Creep could possibly do this job type
    * @param {Creep} creep 
    * 
    * @returns {Boolean}
    */
    static canDo(creep) {
        if (creep.store.getUsedCapacity() == 0) {
            return false;
        }

        return true;
    }


    init() {
        this.actionType = actionTypes.DROPOFF
    }
    getAssignmentAmount(creep) {
        let assignment = {};
        for(let r in creep.store) {
            if (this.resourceAmounts[r] > 0) {
                assignment[r] = Math.min(this.resourceAmounts[r], creep.store[r]);
            }
        }
        return assignment;
    }
    /**
     * 
     * @param {Creep} creep 
     */
    preformJob(creep) {
        /** @type {Source} */
        let target = this.getTarget();
        if (!target) {
            throw new Error("I dunno man.. wtf.  no target?  why isn't the creep right next to it?")
        }
        for(let r in creep.store) {
            if (this.resourceAmounts[r] > 0) {
                creep.transfer(target, r, Math.min(this.resourceAmounts[r], creep.store[r]));
                return false;
            }
        }
        return Object.keys(creep.store).length <= 1;
    }
}

class dropoffSpawn extends dropoffAction {
    init() {
        this.actionType = actionTypes.DROPOFF_SPAWN;
    }
}


let allActions = [
    mineAction,
    pickupAction,
    dropAction,
    dropoffAction,
    dropoffSpawn,
    praiseAction,
]


let actionMap = {};
for(let a in allActions) {
    let actionClass = allActions[a];
    let inst = new actionClass('asdfasd', Game.spawns[Object.keys(Game.spawns)[0]].pos, {});
    actionMap[inst.actionType] = actionClass;
}

module.exports = {
    classes: {
        actionTypes,
        baseAction,
        actionOptIn
    },
    createAction(actionType, targetId, pos, resourceAmounts) {
        let actionClass = actionMap[actionType];
        if (!actionClass) {
            throw new Error("Action type not defined")
        }
        let action = new actionClass(targetId, pos, resourceAmounts);
        return action;
    },
    getActionClass(actionType) {
        let actionClass = actionMap[actionType];
        if (!actionClass) {
            throw new Error("Action type not defined")
        }
        return actionClass;
    }

}