/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('pr.init');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("pr.init");


let processClass = require("INeRT.process");
let threadClass = require("INeRT.thread");


let statsProcClass = require("pr.stats");

let empireProcClass = require("pr.empire");
let intelProcClass = require("pr.empire.intel");
let creepManagerProcClass = require("pr.empire.creepManager");
let taskManagerProcClass = require("pr.empire.taskManager");

class initProc extends processClass {
    initThreads() {
        return [this.createThread("run", "init")];
    }
    run() {
        logger.log(this.name, "init")
        
        
        let empireProc = new empireProcClass("empire");
        this.kernel.startProcess(empireProc);
        
        let creepManager = new creepManagerProcClass("creepManager");
        this.kernel.startProcess(creepManager);
        
        let taskManager = new taskManagerProcClass("taskManager");
        this.kernel.startProcess(taskManager);
        
        let intel = new intelProcClass("intel");
        this.kernel.startProcess(intel);
        
        
        let statsProc = new statsProcClass("stats");
        this.kernel.startProcess(statsProc);
        
        //global.empire = this.kernel.startProcess("empire", "empire", this.kernel.pri("EMPIRE"), false, false, true);
        
        return threadClass.DONE;
    }
}



module.exports = initProc;