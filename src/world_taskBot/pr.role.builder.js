/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * import mod  from "pr.role.builder";
 * mod.thing == 'a thing'; // true
 */

import logger_import from "./screeps.logger";
let logger = new logger_import("pr.role.builder");

import processClass from "./INeRT.process";
import threadClass from "./INeRT.thread";
import worker from "./pr.role.worker";

class builder extends worker {
  init() {
    super.init()
    //return;
    let defaultRange = 150;
    this.enabledEnergyTasks = [
      new global.TaskOptIn(global.Task.PICKUP, 25, false),
      new global.TaskOptIn(global.Task.PICKUPENERGYCONT, 25, false),
      new global.TaskOptIn(global.Task.PICKUP, defaultRange, false),
      new global.TaskOptIn(global.Task.PICKUPENERGYCONT, defaultRange, false),
      new global.TaskOptIn(global.Task.MINING, defaultRange, false),
    ];
    this.enabledWorkTasks = [
      new global.TaskOptIn([global.Task.BUILD, global.Task.REPAIR], 25, false),
      new global.TaskOptIn(global.Task.FILLSPAWNS, 25, false),
      new global.TaskOptIn([global.Task.BUILD, global.Task.REPAIR], defaultRange * 3, false),
      new global.TaskOptIn(global.Task.FILLSPAWNS, defaultRange, false),
      new global.TaskOptIn(global.Task.FILLTOWERS, defaultRange, false),
      new global.TaskOptIn(global.Task.PRAISE, defaultRange, false),
    ];


    this.creepClass = "builder";
    this.creepRole = "builder";
    this.spawnPriority = 4;
    this.requiredParts = {
      WORK: 5
    };
  }

}



export default builder;