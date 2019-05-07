/*
 * 
 */


var logger = require("screeps.logger");
logger = new logger("lib.jobManager");
//logger.enabled = false;
logger.color = COLOR_PURPLE;

let processClass = require("INeRT.process");
let threadClass = require("INeRT.thread");

var job = require("jobs.base");

var jobTypes = require("jobs.all");

class jobManager extends processClass {
    init() {
        this.jobsById = {};
        this.jobsByType = {};
        this.jobsByResource = {};
        this.jobsByRoom = {};

        global.jobManager = this;
    }
    
    initThreads() {
        return [
            //this.createThread("cullAssignments", "work"),
            //this.createThread("cullTasks", "work"),
            ];
    }

    getJobById(jobId) {
        return this.jobsById[jobId];
    }
}

module.exports = jobManager;