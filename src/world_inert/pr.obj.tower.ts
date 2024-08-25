/*
 * Module code goes here. Use 'module.export const to export things:
 * module.export constthing = 'a thing';
 *
 * You can import it from another modules like this:
 * import mod  from "pr.obj.tower";
 * mod.thing == 'a thing'; // true
 */

import logger_import from "./screeps.logger";
let logger = new logger_import("pr.obj.tower");

import processClass from "./INeRT.process";
import threadClass from "./INeRT.thread";


class towerProc extends processClass {
  init() {
    this.taskManager = this.kernel.getProcess('taskManager');
    this.intel = this.kernel.getProcess('intel');
    let tower = Game.getObjectById(this.data.towerId);
    this.fillTask = this.taskManager.createTask(this, global.Task.FILLTOWERS, global.Task.TYPE_DOWORK, tower.pos, {
      "towerId": tower.id
    });
    this.taskManager.setTask(this, this.fillTask);
  }

  initThreads() {
    return [
      this.createThread("taskUpdate", "taskUpdate"),
      this.createThread("pew", "military")
    ];
  }

  taskUpdate() {
    let tower = Game.getObjectById(this.data.towerId);
    this.fillTask.amount = tower.energyCapacity - tower.energy;

  }

  pew() {
    let tower = Game.getObjectById(this.data.towerId);
    let intel = this.intel.getRoomIntel(tower.room.name);

    let target = false;
    if (intel.creeps.enemies.length) {
      target = intel.creeps.enemies[0];
    } else if (intel.creeps.invaders.length) {
      target = intel.creeps.invaders[0];
    }
    //logger.log(intel.creeps.enemies, intel.creeps.invaders)
    //logger.log("tar", target)
    if (target) {
      tower.attack(Game.getObjectById(target.id));
    }
  }

}



export default towerProc;