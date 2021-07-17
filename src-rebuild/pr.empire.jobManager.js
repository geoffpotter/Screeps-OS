/*
 * 
 */


var logger = require("screeps.logger");
logger = new logger("lib.jobManager");
//logger.enabled = false;
logger.color = COLOR_PURPLE;

let processClass = require("INeRT.process");
let threadClass = require("INeRT.thread");

let {Job, JobTypes, JobAssignment} = require("jobs.base");

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
            this.createThread("work", "work"),
            ];
    }

    work() {
        //worker thread to keep the process alive

        //make jobs display themselves
        for(let jobId in this.jobsById) {
            let job = this.jobsById[jobId];
            job.displayJob();
        }
    }

    getJobById(jobId) {
        if (!this.jobsById[jobId]) {
            return false;
        }
        return this.jobsById[jobId];
    }

    createJob(parentProc, targetId, pos, jobType, resourceType = RESOURCE_ENERGY) {
        //(parentProc, targetId, pos, jobType, resourceType = RESOURCE_ENERGY)
        let job = new Job();
        job.init(parentProc, targetId, pos, jobType, resourceType);

        return job;
    }

    registerJob(job) {
        //should prolly do some sort of validation..

        if (!this.jobsById[job.id]) {
            //job doesn't exist, add it
            this.jobsById[job.id] = job;
            
            //by type
            if (!this.jobsByType[job.jobType]) {
                this.jobsByType[job.jobType] = [];
            }
            this.jobsByType[job.jobType].push(job);

            //by resource
            if (!this.jobsByResource[job.resourceType]) {
                this.jobsByResource[job.resourceType] = [];
            }
            this.jobsByResource[job.resourceType].push(job);

            //by room
            if (!this.jobsByRoom[job.roomName]) {
                this.jobsByRoom[job.roomName] = [];
            }
            this.jobsByRoom[job.roomName] = job;


        } else {
            //job already there.. why are you calling me bro?
            logger.log("registering existing job!", job.id);
        }
    }
}

module.exports = jobManager;