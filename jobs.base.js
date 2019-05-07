/*
 * Base Job class
 */

let logger = require("screeps.logger");
logger = new logger("jobs.base");
//logger.enabled = false;
logger.color = COLOR_PURPLE;

let stat = require("util.stat");
//let processClass = require("INeRT.process");


//actions
let pickup = "📤";
let dropoff = "📥";
let feed = "🍴";

//places/things
let controller = "⛪";
let storage = "🛄";
let terminal = "📈";
let container = "🔋";
let spawns = "🏠";
let creep = "💃";

class jobTypes {
        // general tasks
        static get MINE() { return "⛏" };
        static get PRAISE() { return "🙌" };
        static get BUILD() { return "🔨️" };
        static get REPAIR() { return "🔧" };
        static get FILLTOWERS() { return "🗼" };
        static get DROP() { return "🚯" };

        //resource tasks
        static get PICKUP() { return pickup };
        static get PICKUP_CONTROLLER() { return pickup + controller };
        static get PICKUP_STORAGE() { return pickup + storage };
        static get PICKUP_TERMINAL() { return pickup + terminal };
        static get PICKUP_CONTAINER() { return pickup + container };
        static get PICKUP_SPAWN() { return pickup + spawns };
        static get PICKUP_CREEP() { return pickup + creep };

        static get DROPOFF() { return pickup };
        static get DROPOFF_CONTROLLER() { return pickup + controller };
        static get DROPOFF_STORAGE() { return pickup + storage };
        static get DROPOFF_TERMINAL() { return pickup + terminal };
        static get DROPOFF_CONTAINER() { return pickup + container };
        static get DROPOFF_SPAWN() { return pickup + spawns };
        static get DROPOFF_CREEP() { return pickup + creep };
        
        static get FEED_CONTROLLER() { return feed + controller };
        static get FEED_SPAWN() { return pickup + spawns };
/*
        static get MINING() { return "⛏" }
        static get PICKUP() { return "🆙" }
        static get PICKUPATCONTROLLER() { return "🆙⛪" }
        static get PICKUPENERGYCONT() { return "📦" }
        static get PICKUPENERGYSTORAGE() { return "📦🛄" }
        static get PICKUPENERGYSPAWN() { return "📦🏠" }
        static get PICKUPENERGYCONTROLLER() { return "📦⛪" }
        
        static get FILLSPAWNS() { return "🏠" }
        static get PRAISE() { return "🙌" }
        static get FEEDUPGRADERS() { return "🍴⛪" }
        static get FEEDSPAWNS() { return "🍴🏠" }
        static get DUMPINSTORAGE() { return "🛄" }
        static get BUILD() { return "🔨️" }
        static get REPAIR() { return "🔧" }
        static get DELIVERENERGY() { return "🔋" }
        static get FILLTOWERS() { return "🗼" }
        static get DROP() { return "🚯" }
*/


}

class jobAssignment {
    constructor(creepId, jobId) {
        this.creepId = creepId;
        this.jobId = jobId;
        this.amount = false;
        this.priority = 100;
        this.inPosition = false;
    }
}


//  add some helper functions to creep.prototype
/**
 * Gets all this creeps jobs
 * @returns {Job[]}
 */
Creep.prototype.getJobs = function() {
    let jobs = {};
    let jobIds = Object.keys(this.memory.assignments);
    for(let j in jobIds) {
        let jobId = jobIds[j];
        let job = global.jobManager.getJobById(jobId);
        if (job) {
            jobs[jobId] = job;
        } else {
            logger.log(this.name, "assigned job doesn't exist, removing:", jobId);
            delete this.memory.jobs[j];
        }
        
    }
    return jobs;
}
Creep.prototype.getAssignments = function() {
    
}
Creep.prototype.addJob = function(job, priority) {
    if (!this.memory.assignments) {
        this.memory.assignments = {};
    }
    let assignment = new JobAssignment(this.id, job.id);
    assignment.priority = priority;
    if (this.memory.assignments[job.id]) {
        throw new Error("Adding Job " + job.id + " Creep is already assigned to it:" + this.name)
    } else {
        this.memory.assignments[job.id] = true;
    }
}


Creep.prototype.removeJob = function(job) {
    if (this.memory.assignments[job.id]) {
        delete this.memory.assignments[job.id];
    } else {
        throw new Error(this.name + " Removing Job that Creep isn't assigned too" + job.id)
    }
}






class baseJob {
    constructor() { // class constructor
        this.targetId = false;
        this.parentProcName = false;
        this.jobType = false;
        this.resourceType = false;
        this.pos = false;
        this.roomName = false;
        this.amount = false;
        this.assignments = {};
        /*
        creepId: jobAssignment
        */
        
        //position control
        this.targetRange = 1; // start out trying to get within this range, if we're within max range, then don't bother re-pathing
        this.maxRange = 1; // if we're farther out than this, then try to get within target range.
        
        this.displayTask = false;
    }
    
    get id() {
        return `${this.type}-${this.resourceType}-${this.pos.x}-${this.pos.y}-${this.pos.roomName}`; 
    }

    get amountAssigned() {
        return _.reduce(this.assignments, (sum, a) => {
            sum + a.amount;
        })
    }
    
    get workLeft() {
        //logger.log('???', this.amount, this.amountAssigned)
        return this.amount === false || (this.amount > this.amountAssigned);
    }
    
    get amountRemaining() {
        return Math.max(this.amount - this.amountAssigned, 0);
    }
    
    getTarget() {
        let target =  Game.getObjectById(this.targetId);
        if(target)
            return target;
        return false;
    }

    displayTask(creep = false) {
        //logger.log(this.name, "display?", this.displayThisTask)
        if (!this.displayThisTask /*&& creep === false*/) {
            //return false;
        }
        if (this.amount == 0) {
             return false;
        }
        let creepMode = creep == false;
        let pos = creep ? creep.pos : this.pos;
        let t = creep ? this.name : this.name + " " + this.amount + " " + this.amountAssigned;

        global.utils.drawText(t, pos);
    }
    
    assignCreep(creep, priority) {

        let assignment = new JobAssignment(creep.id);
        assignment.priority = priority;
    }

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

module.exports = {
    Job: baseJob,
    JobTypes: jobTypes,
    JobAssignment: jobAssignment
};