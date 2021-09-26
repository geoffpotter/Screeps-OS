/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * import mod  from "INeRT.thread";
 * mod.thing == 'a thing'; // true
 */

import logger_import from "./screeps.logger";
let logger = new logger_import("INeRT.thread");
logger.enabled = false;
logger.color = COLOR_GREY;

import stat from "./util.stat";
//import processClass  from "INeRT.process";

class thread {
  constructor(process, method, targetQueue) { // class constructor
    if (!process) { //!process instanceof processClass) {
      throw new Error("Invalid process class!! " + process);
    }
    if (!process[method]) {
      throw new Error(process.name + " has no method " + method);
    }
    this.process = process;
    this.method = method;
    this.targetQueue = targetQueue;
    this.cpuUsed = new stat();
    this.lastTickRun = false;
    this.suspend = false;
  }

  //return codes

  static get DONE() {
    return "done"
  }
  static get TICKDONE() {
    return "tickdone"
  }

  run(kernel) {
    logger.log("running", this.process.name, "->", this.method);
    if (!this.process[this.method]) {
      throw new Error(this.process.name + " has no method " + this.method);
    }
    let ret = this.process[this.method](kernel);
    logger.log(this.process.name, "got", ret);
    this.lastTickRun = Game.time;
    if (Number.isInteger(ret)) {
      this.suspend = ret;
    }
    return ret;
  }

  toString() {
    return `${this.process.name}-${this.method}`;
  }
}

export default thread;