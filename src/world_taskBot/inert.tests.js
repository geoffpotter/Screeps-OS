/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * import mod  from "inert.tests";
 * mod.thing == 'a thing'; // true
 */


import logger_import from "./screeps.logger";
let logger = new logger_import("INeRT.process");
logger.color = COLOR_GREY;


import processClass from "./INeRT.process";

import threadClass from "./INeRT.thread";


class testProc extends processClass {
  initThreads() {
    return [this.createThread("run", "empire")];
  }

  run(kernel) {
    for (let i = 0; i < 5; i++) {
      let procName = "calc" + i;
      let proc = this.kernel.getProcess(procName);
      let data = {
        startFrom: i
      };
      if (!proc) {
        proc = new calcProc(procName, data);
        kernel.startProcess(proc);
      }

      proc.data = data;

    }
    return threadClass.TICKDONE;
  }

}

class calcProc extends processClass {
  initThreads() {
    return [this.createThread("run", "work"), this.createThread("run2", "creepAct")];
  }

  run() {
    let sum = 0;
    for (let i = 0; i < 10000; i++) {
      sum += i;
    }
    return threadClass.DONE;
  }
  run2() {
    logger.log(this.memory)
    if (!this.memory.count)
      this.memory.count = this.data.startFrom;

    logger.log(this.name, "gonna count", this.memory.count, JSON.stringify(this.data));
    this.memory.count++;

    if (this.memory.count > 10) {
      return threadClass.DONE;
    }
    logger.log("counted", this.memory.count);

  }
}

class init extends processClass {
  /**
   * Init code, do setup here
   * 
   * called once during init
   */
  init(kernel) {
    logger.log(this.name, "init");
    let test = new testProc("test");
    kernel.startProcess(test);
  }

  /**
   * create and return starting threads for kernel to run.
   * 
   * called once during init
   */
  initThreads() {
    let initThreads = [];
    initThreads.push(this.createThread("run", "init"));
    return initThreads;
  }

  run() {
    logger.log(this.name, "run");
    return threadClass.DONE;
  }
}

export default init;