/*
 * Module code goes here. Use 'module.export const to export things:
 * module.export constthing = 'a thing';
 *
 * You can import it from another modules like this:
 * import mod  from "INeRT.queue.types";
 * mod.thing == 'a thing'; // true
 */


import logger_import from "./screeps.logger";
let logger = new logger_import("INeRT.queue.types");
logger.enabled = false;
logger.color = COLOR_GREEN;

import queue from "./INeRT.queue.base";
import threadClass from "./INeRT.thread";

class INeRTQueues {
  constructor() { // class constructor
    this.queueNames = [
      "init",
      "jobCreate",
      "jobFind",
      "taskCreate",
      "taskFind",
      "military",
      "empire",
      "remoteRooms",
      "struct",
      "creepAct",
      "creepMove",
      "jobUpdate",
      "taskUpdate",
      "work"
    ];
    this.queueMap = {};
    for (let q in this.queueNames) {
      let name = this.queueNames[q];
      let que = new queue(name);
      this.queueMap[name] = que;
    }
    //this.queueMap["creepAct"].cpuLimit = 10;
    //this.queueMap["creepAct"].runEveryX = 2;
    //this.queueMap["taskUpdate"].runEveryX = 3;
  }

  getQueue(name) {
    let queue = this.queueMap[name];
    if (!queue) {
      throw new Error("Getting invalid queue:" + name);
    }
    return queue;
  }

  addThread(thread) {
    if (!thread instanceof threadClass) {
      throw new Error("kernel adding invalid thread " + thread);
    }
    let queue = this.queueMap[thread.targetQueue];
    if (!queue) {
      throw new Error(thread.proc.name + " thinks it belongs to an invalid queue:" + thread.targetQueue);
    }
    queue.addThread(thread);
  }

  removeThread(thread) {
    if (!thread instanceof threadClass) {
      throw new Error("kernel adding invalid thread " + thread);
    }
    let queue = this.queueMap[thread.targetQueue];
    if (!queue) {
      throw new Error(thread.proc.name + " thinks it belongs to an invalid queue:" + thread.targetQueue);
    }
    queue.removeThread(thread);
  }

  getNextThread() {
    let thread = false;
    for (let q in this.queueNames) {
      let queueName = this.queueNames[q];
      let queue = this.queueMap[queueName];
      if (!queue) {
        logger.log(JSON.stringify(this.queueMap));
        throw new Error(queueName + " queue doesn't exist.. you broke somethin, dumbass.")
      }

      thread = queue.getNextThread();
      //logger.log('checking', queueName, "got", thread)
      if (thread) {
        break;
      }
    }
    return thread;
  }

  initTick(kernel) {
    //this.getQueue("creepAct").cpuLimit = 10;
    //this.queueMap["creepAct"].runEveryX = 2;
    //this.queueMap["taskUpdate"].runEveryX = 3;
    logger.log("setting cpu settings by defcon", kernel.cpuDefcon)
    switch (kernel.cpuDefcon) {
      case 10:
      case 9:
        this.getQueue("taskUpdate").runEveryX = 2;
        this.getQueue("creepAct").cpuLimit = Game.cpu.tickLimit * 0.8;
        break;
      case 8:
      case 7:
      case 6:
        this.getQueue("taskUpdate").runEveryX = 3;
        this.getQueue("creepAct").cpuLimit = Game.cpu.limit * 0.7;
        break;
      case 5:
      case 4:
      case 3:
        this.getQueue("taskUpdate").runEveryX = 5;
        this.getQueue("creepAct").runEveryX = 2;
        this.getQueue("creepAct").cpuLimit = Game.cpu.limit * 0.2;
        break;
      case 2:
      case 1:
      case 0:
        this.getQueue("taskUpdate").runEveryX = 10;
        this.getQueue("creepAct").runEveryX = 3;
        this.getQueue("creepAct").cpuLimit = Game.cpu.limit * 0.1;
        break;
    }


    for (let q in this.queueMap) {
      let queue = this.queueMap[q];
      queue.initTick();
    }

  }

  endTick() {
    for (let q in this.queueMap) {
      let queue = this.queueMap[q];
      queue.endTick();

      //transfer tick bucket into stats class
      queue.cpuUsed.current = queue.cpuTickBucket;
    }
  }

  displayQueueThreads() {
    for (let q in this.queueMap) {
      let queue = this.queueMap[q];
      logger.log(queue.name, "(" + queue.threads.length + ")", queue.cpuUsed.shortAvg);
    }
  }
}

export default INeRTQueues;