/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * import mod  from "pr.init";
 * mod.thing == 'a thing'; // true
 */

import logger_import from "./screeps.logger";
let logger = new logger_import("pr.init");


import processClass from "./INeRT.process";
import threadClass from "./INeRT.thread";


import statsProcClass from "./pr.stats";

import empireProcClass from "./pr.empire";
import intelProcClass from "./pr.empire.intel";
import creepManagerProcClass from "./pr.empire.creepManager";
import taskManagerProcClass from "./pr.empire.taskManager";
import jobManagerProcClass from "./pr.empire.jobManager";

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

    let jobManager = new jobManagerProcClass("jobManager");
    this.kernel.startProcess(jobManager);

    let intel = new intelProcClass("intel");
    this.kernel.startProcess(intel);


    let statsProc = new statsProcClass("stats");
    this.kernel.startProcess(statsProc);

    //global.empire = this.kernel.startProcess("empire", "empire", this.kernel.pri("EMPIRE"), false, false, true);

    return threadClass.DONE;
  }
}



export default initProc;