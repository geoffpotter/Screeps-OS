/*
 * Module code goes here. Use 'module.export const to export things:
 * module.export constthing = 'a thing';
 *
 * You can import it from another modules like this:
 * import mod  from "INeRT.queue.base";
 * mod.thing == 'a thing'; // true
 */

import logger_import from "./screeps.logger";
let logger = new logger_import("INeRT.queue.base");
logger.enabled = false;
logger.color = COLOR_GREY;

import stat from "./util.stat";
import processClass from "./INeRT.process";
import threadClass from "./INeRT.thread";

class queue {
  constructor(name) { // class constructor
    this.name = name;
    this.threads = [];
    this.cpuLimit = false;
    this.cpuTickBucket = 0;
    this.cpuUsed = new stat();
    this.procsRun = new stat();

    this.currentIndex = 0;
    this.runEveryX = 1;
  }

  addThread(thread) {
    if (!thread instanceof threadClass) {
      throw new Error(this.name + " adding invalid thread " + thread);
    }


    //add to process's list of running threads
    let proc = thread.process;
    if (proc.threads.indexOf(thread) !== -1) {
      throw new Error(proc.name + " thread already running! " + thread)
    }
    proc.threads.push(thread);

    //all good, add to queue
    this.threads.push(thread);
  }

  removeThread(thread) {
    if (!thread instanceof threadClass) {
      throw new Error(this.name + " removing invalid thread " + thread);
    }

    //remove from process's list of running threads
    let proc = thread.process;
    if (proc.threads.indexOf(thread) === -1) {
      throw new Error(proc.name + " thread not running! " + thread)
    }
    _.remove(proc.threads, thread);


    _.remove(this.threads, thread);
  }

  getNextThread() {
    if (this.name == "creepAct") {
      logger.log(this.name, "getting thread", this.cpuLimit, this.runEveryX, this.cpuTickBucket)
    }
    if (this.cpuLimit !== false && this.cpuLimit <= this.cpuTickBucket) {
      //over cpu limit, pretend we're done
      logger.log(this.name, "OVER QUEUE CPU LIMIT", this.cpuTickBucket, this.cpuLimit)
      return false;
    }

    let thread = this.threads[this.currentIndex];
    this.currentIndex += this.runEveryX;
    if (thread && thread.suspend > 0) {
      thread.suspend--;
      return this.getNextThread();
    }
    return thread;
  }

  initTick() {
    this.currentIndex = Game.time % this.runEveryX;
    //sort procs by last time they were run
    this.threads = _.sortBy(this.threads, (t) => t.lastTickRun - Game.time);

    this.cpuTickBucket = 0;
  }

  endTick() {

  }

  getThreadNames() {
    let names = "";
    for (let t in this.threads) {
      let thread = this.threads[t];
      let name = thread.process.name + "(" + thread.process.cpuUsed.shortAvg + ")" + "-" + thread.method;
      names += name + ", ";
    }
    return names;
  }
}

export default queue;