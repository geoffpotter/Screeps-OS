import { profile, profileClass, profiler } from "shared/utils/profiling/profiler";
import Logger from "shared/utils/logger";
let logger = new Logger("functionQueueArray");
logger.color = COLOR_GREY;
logger.enabled = false;
// @profileClass(false, true)
export default class functionQueueArray {
  funcs: Array<Function>;
  private numFuncs;
  private initialSize;
  private doneFuncs: WeakSet<Function>;
  private numDoneFuncs: number;
  private maxCpuPerRun: number | false;
  private maxTotalCpu: number | false;

  private resetArray() {
    this.funcs = Array(this.initialSize);
    this.numFuncs = 0;
  }

  constructor(initialSize = 10000, maxCpuPerRun: number | false = false, maxTotalCpu: number | false = false) {
    this.initialSize = initialSize;
    this.funcs = Array(initialSize);
    this.numFuncs = 0;
    this.doneFuncs = new WeakSet<Function>();
    this.numDoneFuncs = 0;
    this.maxCpuPerRun = maxCpuPerRun;
    this.maxTotalCpu = maxTotalCpu;
  }

  addFunc(func: Function) {
    this.funcs[this.numFuncs] = func;
    this.numFuncs++;
  }

  // @profile(false, false, true)
  processQueue_optimized_leavingArray() {
    if (this.numFuncs === 0) return;

    let totalCpuUsed = 0;
    let startCpu = 0;
    if (this.maxTotalCpu !== false || this.maxCpuPerRun !== false) {
      startCpu = Game.cpu.getUsed();
      if (this.maxTotalCpu !== false && startCpu >= this.maxTotalCpu) return;
    }

    let currentQueue = this.funcs;
    let numFuncs = this.numFuncs;
    this.resetArray();

    let currentFunc = 0;
    let func;
    while (currentFunc < numFuncs) {
      func = currentQueue[currentFunc++];
      // logger.log("calling func", currentFunc, "stack", profiler.stack);
      // let context = profiler.pauseContext();
      let done = func();
      // logger.log("doen calling func.  done", done, "context", context, "profile stack", profiler.stack);
      if (done === false) {
        this.addFunc(func);
      } else {
        // profiler.resumeContext(context);
        // logger.log("func is done", func);
      }

      if (this.maxTotalCpu !== false || this.maxCpuPerRun !== false) {
        let currentCpu = Game.cpu.getUsed();
        let cpuUsed = currentCpu - startCpu;
        totalCpuUsed += cpuUsed;
        if ((this.maxTotalCpu !== false && currentCpu >= this.maxTotalCpu) || (this.maxCpuPerRun !== false && totalCpuUsed >= this.maxCpuPerRun)) {
          // add the remaining funcs to the end of the array
          this.funcs.push(...currentQueue.slice(currentFunc));
          this.numFuncs = this.funcs.length;
          break;
        }
      }
    }
  }

  // @profile(false, false, true)
  processQueue_optimized_stayingInArray() {
    if (this.numFuncs === 0) return;

    let totalCpuUsed = 0;
    let startCpu = 0;
    if (this.maxTotalCpu !== false || this.maxCpuPerRun !== false) {
      startCpu = Game.cpu.getUsed();
      if (this.maxTotalCpu !== false && startCpu >= this.maxTotalCpu) return;
    }

    let funcs = this.funcs;
    let currentFunc = 0;
    let writeIndex = 0;
    let func;
    let queue = this;
    function finalize() {
      funcs.length = writeIndex;
      queue.numFuncs = writeIndex;
      queue.funcs = funcs;
      // profiler.resumeContext(context);
    }
    // let context = profiler.pauseContext();
    try {
      while (currentFunc < this.numFuncs) {
        func = funcs[currentFunc];
        //
        let done = func();
        //
        if (done === false) {
          funcs[writeIndex] = func;
          writeIndex++;
        }

        if (this.maxTotalCpu !== false || this.maxCpuPerRun !== false) {
          let currentCpu = Game.cpu.getUsed();
          let cpuUsed = currentCpu - startCpu;
          totalCpuUsed += cpuUsed;
          if ((this.maxTotalCpu !== false && currentCpu >= this.maxTotalCpu) || (this.maxCpuPerRun !== false && totalCpuUsed >= this.maxCpuPerRun)) {
            finalize()
            logger.log("processQueue_optimized_stayingInArray", "ran out of cpu", "cpu", totalCpuUsed);
            return;
          }
        }

        currentFunc++;
      }

      finalize()
      logger.log("finalize", this.numFuncs, "funcs", this.funcs.length, "cpu", totalCpuUsed);
    } catch (e) {
      logger.error("error in processQueue_optimized_stayingInArray", e, (e as Error).stack);
    }
  }

  // @profile(false, false, true)
  processCurrentQueue() {
    if (this.numFuncs === 0) return;

    let totalCpuUsed = 0;
    let startCpu = 0;
    if (this.maxTotalCpu !== false || this.maxCpuPerRun !== false) {
      startCpu = Game.cpu.getUsed();
      if (this.maxTotalCpu !== false && startCpu >= this.maxTotalCpu) return;
    }

    let currentQueue = this.funcs;
    let numFuncs = this.numFuncs;
    this.resetArray();

    let currentFunc = 0;
    let func;
    while (currentFunc < numFuncs) {
      func = currentQueue[currentFunc++];
      // let context = profiler.pauseContext();
      func();
      // profiler.resumeContext(context);

      if (this.maxTotalCpu !== false || this.maxCpuPerRun !== false) {
        let currentCpu = Game.cpu.getUsed();
        let cpuUsed = currentCpu - startCpu;
        totalCpuUsed += cpuUsed;
        if ((this.maxTotalCpu !== false && currentCpu >= this.maxTotalCpu) || (this.maxCpuPerRun !== false && totalCpuUsed >= this.maxCpuPerRun)) {
          // add the remaining funcs to the end of the array
          this.funcs.push(...currentQueue.slice(currentFunc));
          this.numFuncs = this.funcs.length;
          return;
        }
      }
    }
  }

  // @profile(false, false, true)
  processCurrentQueueWithDone() {
    if (this.numFuncs === 0) return;

    let totalCpuUsed = 0;
    let startCpu = 0;
    if (this.maxTotalCpu !== false || this.maxCpuPerRun !== false) {
      startCpu = Game.cpu.getUsed();
      if (this.maxTotalCpu !== false && startCpu >= this.maxTotalCpu) return;
    }

    let currentQueue = this.funcs;
    let numFuncs = this.numFuncs;
    this.resetArray();

    let currentFunc = 0;
    let func;
    while (currentFunc < numFuncs) {
      func = currentQueue[currentFunc++];
      // let context = profiler.pauseContext();
      // logger.log("calling func", currentFunc, "stack", profiler.stack);
      let done = func();
      // logger.log("doen calling func.  done", done, "profile stack", profiler.stack);
      // profiler.resumeContext(context);
      if (done === false) {
        this.addFunc(func);
      }

      if (this.maxTotalCpu !== false || this.maxCpuPerRun !== false) {
        let currentCpu = Game.cpu.getUsed();
        let cpuUsed = currentCpu - startCpu;
        totalCpuUsed += cpuUsed;
        if ((this.maxTotalCpu !== false && currentCpu >= this.maxTotalCpu) || (this.maxCpuPerRun !== false && totalCpuUsed >= this.maxCpuPerRun)) {
          this.funcs.push(...currentQueue.slice(currentFunc));
          this.numFuncs = this.funcs.length;
          return;
        }
      }
    }
  }

  // @profile(false, false, true)
  processFullQueueWithDone() {
    if (this.numFuncs === 0) return;

    let totalCpuUsed = 0;
    let startCpu = 0;
    if (this.maxTotalCpu !== false || this.maxCpuPerRun !== false) {
      startCpu = Game.cpu.getUsed();
      if (this.maxTotalCpu !== false && startCpu >= this.maxTotalCpu) return;
    }

    if (this.numDoneFuncs > Math.min(Math.max(this.numFuncs * 0.2, 0), 10000000)) {
      let oldFuncs = this.funcs;
      let total = this.numFuncs;
      let current = 0;
      this.resetArray();
      while (current < total) {
        let func = oldFuncs[current];
        if (!this.doneFuncs.has(func)) {
          this.addFunc(func);
        }
        current++;
      }
      this.doneFuncs = new WeakSet();
      this.numDoneFuncs = 0;
    }

    let count = 0;
    let currentFunc = 0;
    let func;
    let doneFuncs = this.doneFuncs;
    let funcs = this.funcs;
    while (currentFunc < this.numFuncs) {
      func = funcs[currentFunc];
      if (!doneFuncs.has(func)) {
        // let context = profiler.pauseContext();
        let done = func();
        // profiler.resumeContext(context);
        if (done !== false) {
          doneFuncs.add(func);
          this.numDoneFuncs++;
        }
        count++;
      }

      if (this.maxTotalCpu !== false || this.maxCpuPerRun !== false) {
        let currentCpu = Game.cpu.getUsed();
        let cpuUsed = currentCpu - startCpu;
        totalCpuUsed += cpuUsed;
        if ((this.maxTotalCpu !== false && currentCpu >= this.maxTotalCpu) || (this.maxCpuPerRun !== false && totalCpuUsed >= this.maxCpuPerRun)) {
          return;
        }
      }

      currentFunc++;
    }
  }

  // @profile(false, false, true)
  processFullQueue() {
    if (this.numFuncs === 0) return;

    let totalCpuUsed = 0;
    let startCpu = 0;
    if (this.maxTotalCpu !== false || this.maxCpuPerRun !== false) {
      startCpu = Game.cpu.getUsed();
      if (this.maxTotalCpu !== false && startCpu >= this.maxTotalCpu) return;
    }

    let currentFunc = 0;
    let func;
    let funcs = this.funcs;
    while (currentFunc < this.numFuncs) {
      func = funcs[currentFunc++];
      // let context = profiler.pauseContext();
      func();
      // profiler.resumeContext(context);

      if (this.maxTotalCpu !== false || this.maxCpuPerRun !== false) {
        let currentCpu = Game.cpu.getUsed();
        let cpuUsed = currentCpu - startCpu;
        totalCpuUsed += cpuUsed;
        if ((this.maxTotalCpu !== false && currentCpu >= this.maxTotalCpu) || (this.maxCpuPerRun !== false && totalCpuUsed >= this.maxCpuPerRun)) {
          // reset the array and add the remaining funcs to the end of the array
          this.resetArray();
          this.funcs.push(...funcs.slice(currentFunc));
          this.numFuncs = this.funcs.length;
          return;
        }
      }
    }

    this.resetArray();
  }
}
