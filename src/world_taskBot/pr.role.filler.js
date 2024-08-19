/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * import mod  from "pr.role.filler";
 * mod.thing == 'a thing'; // true
 */

import logger_import from "./screeps.logger";
let logger = new logger_import("pr.role.filler");

import processClass from "./INeRT.process";
import threadClass from "./INeRT.thread";
import worker from "./pr.role.worker";

class filler extends worker {
  init() {
    super.init();
    this.allowRefils = false;

    this.enabledEnergyTasks = [
      new global.TaskOptIn([global.Task.PICKUPENERGYSPAWN], 20, false),
      new global.TaskOptIn([global.Task.PICKUPENERGYCONT, global.Task.PICKUP], 10, false),
    ];
    this.enabledWorkTasks = [
      new global.TaskOptIn(global.Task.FILLSPAWNS, 20, false),
    ];

    this.creepClass = "filler";
    this.creepRole = "filler";
    this.spawnPriority = 3;
    this.requiredParts = {
      CARRY: 5
    };
  }
}



export default filler;