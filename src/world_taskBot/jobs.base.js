/*
 * Base Job class
 */

import logger_import from "./screeps.logger";
let logger = new logger_import("jobs.base");
//logger.enabled = false;
logger.color = COLOR_PURPLE;

import stat from "./util.stat";
//import processClass  from "INeRT.process";


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


class jobTypes {
  // general tasks
  static get MINE() {
    return "⛏"
  };
  static get PRAISE() {
    return "🙌"
  };
  static get BUILD() {
    return "🔨️"
  };
  static get REPAIR() {
    return "🔧"
  };
  static get FILLTOWERS() {
    return "🗼"
  };
  static get DROP() {
    return "🚯"
  };

  //resource tasks
  static get PICKUP() {
    return pickup
  };
  static get PICKUP_STORAGE() {
    return pickup + storage
  };
  static get PICKUP_TERMINAL() {
    return pickup + terminal
  };
  static get PICKUP_CONTAINER() {
    return pickup + container
  };
  static get PICKUP_SPAWN() {
    return pickup + spawns
  };
  static get PICKUP_CREEP() {
    return pickup + creep
  };

  static get DROPOFF() {
    return dropoff
  };
  static get DROPOFF_STORAGE() {
    return dropoff + storage
  };
  static get DROPOFF_TERMINAL() {
    return dropoff + terminal
  };
  static get DROPOFF_CONTAINER() {
    return dropoff + container
  };
  static get DROPOFF_SPAWN() {
    return dropoff + spawns
  };
  static get DROPOFF_CREEP() {
    return dropoff + creep
  };

  //feed/eat
  static get FEED_CONTROLLER() {
    return feed + controller
  };
  static get FEED_SPAWN() {
    return feed + spawns
  };

  static get EAT_CONTROLLER() {
    return eat + controller
  };
  static get EAT_SPAWN() {
    return eat + spawns
  };


}

class jobAssignment {
  constructor(creepId, jobId) {
    this.creepId = creepId;
    this.jobId = jobId;
    this.amount = false;
    this.priority = 100;
    this.inPosition = false;
  }
  fromMem(mem) {
    for (let f in mem) {
      this[f] = mem[f];
    }
  }
}


//  add some helper functions to creep.prototype
/**
 * Gets all this creeps jobs
 * @returns {Job}
 */
Creep.prototype.getJob = function() {
  let assignment = this.getAssignment();

  global.jobManager.getJob(assignment.jobId)
}

/**
 * gets the creeps assignment object
 * @return {Creep}
 */
Creep.prototype.getAssignment = function() {
  let assignment = new JobAssignment(null, null);
  assignment.fromMem(this.memory.assignment);
  return assignment;
}

Creep.prototype.setJob = function(job) {
  job.assignCreep(this);
}


Creep.prototype.removeJob = function(job) {
  if (this.memory.assignment && this.memory.assignment.jobId == job.id) {
    delete this.memory.assignment;
  } else {
    throw new Error(this.name + " Removing Job that Creep isn't assigned too" + job.id)
  }
}




class baseJob {
  init(parentProc, targetId, pos, jobType, resourceType = RESOURCE_ENERGY) { // class constructor
    this.targetId = targetId;
    this.parentProcName = parentProc.name;
    this.jobType = jobType;
    this.resourceType = resourceType;
    this.pos = pos;
    this.roomName = pos.roomName;
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
    let amt = _.reduce(this.assignments, (sum, a) => {
      sum + a.amount;
    });

    return amt ? amt : 0;
  }

  get workLeft() {
    //logger.log('???', this.amount, this.amountAssigned)
    return this.amount === false || (this.amount > this.amountAssigned);
  }

  get amountRemaining() {
    return Math.max(this.amount - this.amountAssigned, 0);
  }

  getTarget() {
    let target = Game.getObjectById(this.targetId);
    if (target)
      return target;
    return false;
  }

  getCreepPriority(creep) {
    return this.constructor.getCreepPriority(creep);
  }

  displayJob(creep = false) {
    logger.log(this.jobType, "display?", this.displayTask, this.jobType + " " + this.amount + " " + this.amountAssigned)
    if (!this.displayTask /*&& creep === false*/ ) {
      //return false;
    }
    if (this.amount == 0) {
      return false;
    }
    let creepMode = creep !== false;
    let pos = creepMode ? creep.pos : this.pos;
    let t = creepMode ? this.jobType : this.jobType + " " + this.amount + " " + this.amountAssigned;

    global.utils.drawText(t, pos);
  }

  assignCreep(creep) {
    logger.log("assigning", creep, "to", this.id);
    let assignment = new JobAssignment(creep.id, this.id);
    assignment.priority = this.getCreepPriority(creep);
    assignment.amount = this.getAssignmentAmount(creep);
    return assignment;
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
    throw new Error(this + ".getCreepPriority - Not Implemented");
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

//let Job = baseJob;
export let Job = baseJob;

export let myVariable = Math.sqrt(2);
export let JobTypes = jobTypes;
export let JobAssignment = jobAssignment;