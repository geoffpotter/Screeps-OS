/*
 * Module code goes here. Use 'module.export const to export things:
 * module.export constthing = 'a thing';
 *
 * You can import it from another modules like this:
 * import mod  from "pr.role.transporter";
 * mod.thing == 'a thing'; // true
 */

import logger_import from "./screeps.logger";
let logger = new logger_import("pr.role.transporter");

import processClass from "./INeRT.process";
import threadClass from "./INeRT.thread";
import worker from "./pr.role.worker";

class transporter extends worker {
  init() {
    super.init();
    this.allowRefils = false;
    let defaultRange = 300;
    this.enabledEnergyTasks = [
      new global.TaskOptIn([global.Task.PICKUP, global.Task.PICKUPENERGYCONT], defaultRange, true),
      // new global.TaskOptIn(global.Task.PICKUP, 20, true),
      // new global.TaskOptIn(global.Task.PICKUPENERGYCONT, 20, true),
      // new global.TaskOptIn(global.Task.PICKUP, defaultRange, true),
      // new global.TaskOptIn(global.Task.PICKUPENERGYCONT, defaultRange, true),
    ];
    this.enabledWorkTasks = [

      new global.TaskOptIn(global.Task.FEEDSPAWNS, 20, false),
      new global.TaskOptIn(global.Task.FILLSPAWNS, 20, false),
      new global.TaskOptIn(global.Task.FEEDUPGRADERS, 20, false),
      new global.TaskOptIn(global.Task.DELIVERENERGY, 20, true),

      new global.TaskOptIn(global.Task.FEEDSPAWNS, defaultRange, false),
      new global.TaskOptIn(global.Task.FILLSPAWNS, defaultRange, false),
      new global.TaskOptIn(global.Task.FEEDUPGRADERS, defaultRange, false),
      new global.TaskOptIn(global.Task.DELIVERENERGY, defaultRange, true),
    ];

    this.creepClass = "transporter";
    this.creepRole = "transporter";
    this.spawnPriority = 4;
    this.requiredParts = {
      CARRY: 10
    };
    this.priorityIncresePerCreep = 10;
  }
}



export default transporter;