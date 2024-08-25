/*
 * Module code goes here. Use 'module.export const to export things:
 * module.export constthing = 'a thing';
 *
 * You can import it from another modules like this:
 * import mod  from "pr.role.claimer";
 * mod.thing == 'a thing'; // true
 */

import logger_import from "./screeps.logger";
let logger = new logger_import("pr.role.filler");

import processClass from "./INeRT.process";
import threadClass from "./INeRT.thread";

import baseRole from "./pr.role.base";
class claimer extends baseRole {
  init() {
    super.init();
    this.enabledEnergyTasks = [];
    this.enabledWorkTasks = [];

    this.creepClass = "claimer";
    this.creepRole = "claimer";
    this.spawnPriority = 3;
    this.requiredParts = {
      CLAIM: 1
    };
    this.totalNeededParts = 1;
    this.totalParts = 0;
  }
  initThreads() {
    return [
      this.createThread("initTick", "init"),
      this.createThread("run", "creepAct"),

    ];
  }
  initTick() {
    super.initTick();
    this.requiredParts = {
      CLAIM: 1
    };
  }
  run() {

    logger.log("running claim creeps")
    //handle working flag and refil task
    for (let c in this.creeps) {
      let creep = this.creeps[c];
      if (creep.spawning)
        return;
      let flag = Game.flags[this.data.flagName];
      if (!flag) {
        //flag is gone, die
        return threadClass.DONE;
      }
      logger.log(creep.name, "movin to", flag);
      let moveRes = global.creepActions.moveTo(creep, flag);
      logger.log(creep.name, "move res", moveRes);
      if (moveRes) {
        let claimRes = creep.claimController(creep.room.controller);
        logger.log(creep.name, "claim res", claimRes);
        flag.remove();
        return threadClass.DONE;
      }
    }

    this.handleSpawning();
  }
}



export default claimer;