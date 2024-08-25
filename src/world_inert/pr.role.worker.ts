/*
 * Module code goes here. Use 'module.export const to export things:
 * module.export constthing = 'a thing';
 *
 * You can import it from another modules like this:
 * import mod  from "pr.role.worker";
 * mod.thing == 'a thing'; // true
 */

import logger_import from "./screeps.logger";
let logger = new logger_import("pr.role.worker");
logger.enabled = false;
import processClass from "./INeRT.process";
import threadClass from "./INeRT.thread";
import baseRole from "./pr.role.base";
/*    
    static get MINING() { return "mining" }
    static get PRAISE() { return "praise" }
    static get PICKUP() { return "pickup" }
    static get FILLSPAWNS() { return "fillSpawns" }
    */

//constructor(taskNames, maxRange = 50, minAmount = false, useBiggestTask = false, searchData = false) {

class workerProc extends baseRole {

  init() {
    super.init();
    let defaultRange = 75;
    this.enabledEnergyTasks = [
      //new global.TaskOptIn([global.Task.PICKUP, global.Task.PICKUPATCONTROLLER, global.Task.PICKUPENERGYCONT], 10, false),
      new global.TaskOptIn([global.Task.PICKUP, global.Task.PICKUPATCONTROLLER, global.Task.PICKUPENERGYCONT], defaultRange, false),
      new global.TaskOptIn(global.Task.MINING, defaultRange, false),
    ];
    this.enabledWorkTasks = [
      new global.TaskOptIn(global.Task.FILLTOWERS, 25, false),
      new global.TaskOptIn(global.Task.FEEDSPAWNS, 25, false),
      new global.TaskOptIn(global.Task.FILLSPAWNS, 25, false),
      new global.TaskOptIn([global.Task.BUILD, global.Task.REPAIR], 25, false),
      new global.TaskOptIn(global.Task.FILLTOWERS, defaultRange, false),
      new global.TaskOptIn(global.Task.FEEDSPAWNS, defaultRange, false),
      new global.TaskOptIn(global.Task.FILLSPAWNS, defaultRange, false),
      //new global.TaskOptIn(global.Task.FEEDUPGRADERS, defaultRange, false),
      new global.TaskOptIn([global.Task.BUILD, global.Task.REPAIR], defaultRange, false),
      new global.TaskOptIn(global.Task.PRAISE, defaultRange, false),
    ];

    this.allowRefils = true;

    if (!this.requiredParts) {
      this.requiredParts = {
        WORK: 5
      };
    }
    this.creepClass = this.data.creepClass ? this.data.creepClass : "worker";
    this.creepRole = "worker";
    this.spawnPriority = 1;
    this.requiredParts = {
      WORK: 5
    };
  }

}



export default workerProc;