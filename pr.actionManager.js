let logger = require("screeps.logger");
logger = new logger("pr.actionManager");
//logger.color = COLOR_GREY;

let processClass = require("INeRT.process");
let threadClass = require("INeRT.thread");

let IndexingCollection = global.utils.array.classes.IndexingCollection

let intelClass = require("pr.intel");


global.RESOURCE_SPACE = "space";

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


class actionAssignment {
    constructor(taskId, assignedId, resourceAmounts, priority) {
        this.taskId = taskId;
        this.assignedId = assignedId;
        this.resourceAmounts = resourceAmounts;
        this.priority = priority;
    }
}

class baseAction {
    constructor(targetId, pos, actionType, resourceAmounts) {
        this.targetId = targetId;
        this.pos = pos;
        this.actionType = actionType;
        this.resourceAmounts = resourceAmounts;

        this.assignments = new IndexingCollection("id", [], [100000]);

        //position control
        this.targetRange = 1; // start out trying to get within this range, if we're within max range, then don't bother re-pathing
        this.maxRange = 1; // if we're farther out than this, then try to get within target range.
        
        this.displayTask = false;
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

    display() {
        global.utils.visual.drawText(this.actionType + "(" + Object.keys(this.assignments).length + ")", this.pos);
    }

        
    /******************************************************************************
     * virtual methods
     * 
     * these will generally need to be overriden by the task class to provide task specific implementations
     * 
     */


    /**
     * Get the priority that should be used for this creeps assignment, or 0 if it shouldn't be assigned to this job type
     * @param {Creep} creep 
     * 
     * @returns {number} the priority to use for this creep/job pair, or 0 of this creep shouldn't do this job type
     */
    static getCreepPriority(creep) {
        return creep.numParts(WORK);
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
            global.creepActions.moveTo(creep, this.pos, this.targetRange);
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
    getAssignmentAmount(creep) {
        return {
            RESOURCE_SPACE: 1,
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
        logger.log(creep, "did the Action!", this.actionType, ret);
    }
}

class fillSpawnAction extends baseAction {
    getAssignmentAmount(creep) {
        return {
            RESOURCE_SPACE: 1,
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
        creep.transfer(target, RESOURCE_ENERGY);
    }
}

class actionManager extends processClass {
    init() {

    }

    initThreads() {
        return [
            this.createThread("tickInit", "init"),
            this.createThread("")
        ]
    }
    tickInit() {
        logger.log("in tick init")
    }
}

module.exports = actionManager;