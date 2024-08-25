/*
 * Module code goes here. Use 'module.export const to export things:
 * module.export constthing = 'a thing';
 *
 * You can import it from another modules like this:
 * import mod  from "pr.role.upgrader";
 * mod.thing == 'a thing'; // true
 */


import logger_import from "./screeps.logger";
let logger = new logger_import("pr.role.upgrader");

import processClass from "./INeRT.process";
import threadClass from "./INeRT.thread";
import worker from "./pr.role.worker";

class upgrader extends worker {
  init() {
    super.init();
    let defaultRange = 50;
    this.enabledEnergyTasks = [

      new global.TaskOptIn([global.Task.PICKUPENERGYCONTROLLER, global.Task.PICKUPATCONTROLLER], defaultRange, false),
      new global.TaskOptIn([global.Task.PICKUP, global.Task.PICKUPENERGYCONT], defaultRange, false),
      new global.TaskOptIn(global.Task.MINING, defaultRange, false),
    ];
    this.enabledWorkTasks = [
      new global.TaskOptIn(global.Task.PRAISE, defaultRange, false),
    ];

    this.creepClass = "builder";
    this.creepRole = "upgrader";
    this.spawnPriority = 6;
    this.requiredParts = {
      WORK: 20
    };
    this.priorityIncresePerCreep = 11;
  }

}



export default upgrader;