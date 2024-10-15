
import { profile, profiler, profileClass } from "shared/utils/profiling/profiler";
import Logger from "shared/utils/logger";
let logger = new Logger("functionQueueSet");
logger.color = COLOR_GREY;
logger.enabled = false;

// @profileClass(false, true)
export default class functionQueueSet {
  funcs: Set<Function>;
  addFunc: (func: Function) => void;
  private maxCpuPerRun: number | false;
  private maxTotalCpu: number | false;

  private resetSet() {
    this.funcs = new Set<Function>();
    this.addFunc = this.funcs.add.bind(this.funcs);
  }

  constructor(maxCpuPerRun: number | false = false, maxTotalCpu: number | false = false) {
    this.funcs = new Set<Function>();
    this.addFunc = this.funcs.add.bind(this.funcs);
    this.maxCpuPerRun = maxCpuPerRun;
    this.maxTotalCpu = maxTotalCpu;
  }

  // @profile(false, false, true)
  processQueue_optimized_leavingSet() {
    if (this.funcs.size === 0) return;

    let totalCpuUsed = 0;
    let startCpu = 0;
    if (this.maxTotalCpu !== false || this.maxCpuPerRun !== false) {
      startCpu = Game.cpu.getUsed();
      if (this.maxTotalCpu !== false && startCpu >= this.maxTotalCpu) return;
    }

    let currentQueue = this.funcs;
    let numFuncs = this.funcs.size;
    this.resetSet();

    let currentFunc = 0;
    try {
      for (const func of currentQueue) {
        // let context = profiler.pauseContext();
        let done = func();
        // profiler.resumeContext(context);
        if (done === false) {
          this.addFunc(func);
        }

        if (this.maxTotalCpu !== false || this.maxCpuPerRun !== false) {
          let currentCpu = Game.cpu.getUsed();
          let cpuUsed = currentCpu - startCpu;
          totalCpuUsed += cpuUsed;
          if ((this.maxTotalCpu !== false && currentCpu >= this.maxTotalCpu) || (this.maxCpuPerRun !== false && totalCpuUsed >= this.maxCpuPerRun)) {
            this.funcs = new Set([...this.funcs, ...currentQueue].slice(currentFunc));
            logger.log("processQueue_optimized_leavingSet", "ran out of cpu", "cpu", totalCpuUsed);
            return;
          }
        }
      }
    } catch (e) {
      logger.error("error in processQueue_optimized_leavingSet", e, (e as Error).stack);
    }
    logger.log("processQueue_optimized_leavingSet", "finished", "cpu", totalCpuUsed);
  }

  // @profile(false, false, true)
  processQueue_optimized_stayingInSet() {
    if (this.funcs.size === 0) return;

    let totalCpuUsed = 0;
    let startCpu = 0;
    if (this.maxTotalCpu !== false || this.maxCpuPerRun !== false) {
      startCpu = Game.cpu.getUsed();
      if (this.maxTotalCpu !== false && startCpu >= this.maxTotalCpu) return;
    }

    let funcs = this.funcs;
    for (const func of this.funcs) {
      // let context = profiler.pauseContext();
      let done = func();
      // profiler.resumeContext(context);
      if (done !== false) {
        this.funcs.delete(func);
      }

      if (this.maxTotalCpu !== false || this.maxCpuPerRun !== false) {
        let currentCpu = Game.cpu.getUsed();
        let cpuUsed = currentCpu - startCpu;
        totalCpuUsed += cpuUsed;
        if ((this.maxTotalCpu !== false && currentCpu >= this.maxTotalCpu) || (this.maxCpuPerRun !== false && totalCpuUsed >= this.maxCpuPerRun)) {
          return;
        }
      }
    }
  }

  // @profile(false, false, true)
  processCurrentQueueWithDone() {
    if (this.funcs.size == 0) return;

    let totalCpuUsed = 0;
    let startCpu = 0;
    if (this.maxTotalCpu !== false || this.maxCpuPerRun !== false) {
      startCpu = Game.cpu.getUsed();
      if (this.maxTotalCpu !== false && startCpu >= this.maxTotalCpu) return;
    }

    let funcs = this.funcs;
    this.resetSet();
    let count = 0;
    funcs.forEach((func) => {
      // let context = profiler.pauseContext();
      let done = func();
      // profiler.resumeContext(context);
      if (done === false) {
        this.addFunc(func);
      }
      count++;

      if (this.maxTotalCpu !== false || this.maxCpuPerRun !== false) {
        let currentCpu = Game.cpu.getUsed();
        let cpuUsed = currentCpu - startCpu;
        totalCpuUsed += cpuUsed;
        if ((this.maxTotalCpu !== false && currentCpu >= this.maxTotalCpu) || (this.maxCpuPerRun !== false && totalCpuUsed >= this.maxCpuPerRun)) {
          this.funcs = new Set([...this.funcs, ...funcs].slice(count));
          return;
        }
      }
    });
  }

  // @profile(false, false, true)
  processCurrentQueue() {
    if (this.funcs.size == 0) return;

    let totalCpuUsed = 0;
    let startCpu = 0;
    if (this.maxTotalCpu !== false || this.maxCpuPerRun !== false) {
      startCpu = Game.cpu.getUsed();
      if (this.maxTotalCpu !== false && startCpu >= this.maxTotalCpu) return;
    }

    let funcs = this.funcs;
    this.resetSet();
    let count = 0;
    funcs.forEach((func) => {
      // let context = profiler.pauseContext();
      func();
      // profiler.resumeContext(context);
      count++;

      if (this.maxTotalCpu !== false || this.maxCpuPerRun !== false) {
        let currentCpu = Game.cpu.getUsed();
        let cpuUsed = currentCpu - startCpu;
        totalCpuUsed += cpuUsed;
        if ((this.maxTotalCpu !== false && currentCpu >= this.maxTotalCpu) || (this.maxCpuPerRun !== false && totalCpuUsed >= this.maxCpuPerRun)) {
          this.funcs = new Set([...this.funcs, ...funcs].slice(count));
          return;
        }
      }
    });
  }

  // @profile(false, false, true)
  processFullQueueWithDone() {
    if (this.funcs.size == 0) return;

    let totalCpuUsed = 0;
    let startCpu = 0;
    if (this.maxTotalCpu !== false || this.maxCpuPerRun !== false) {
      startCpu = Game.cpu.getUsed();
      if (this.maxTotalCpu !== false && startCpu >= this.maxTotalCpu) return;
    }

    let count = 0;
    this.funcs.forEach((func) => {
      // let context = profiler.pauseContext();
      let done = func();
      // profiler.resumeContext(context);
      if (done !== false) {
        this.funcs.delete(func);
      }
      count++;

      if (this.maxTotalCpu !== false || this.maxCpuPerRun !== false) {
        let currentCpu = Game.cpu.getUsed();
        let cpuUsed = currentCpu - startCpu;
        totalCpuUsed += cpuUsed;
        if ((this.maxTotalCpu !== false && currentCpu >= this.maxTotalCpu) || (this.maxCpuPerRun !== false && totalCpuUsed >= this.maxCpuPerRun)) {
          return;
        }
      }
    });
  }

  // @profile(false, false, true)
  processFullQueue() {
    if (this.funcs.size == 0) return;

    let totalCpuUsed = 0;
    let startCpu = 0;
    if (this.maxTotalCpu !== false || this.maxCpuPerRun !== false) {
      startCpu = Game.cpu.getUsed();
      if (this.maxTotalCpu !== false && startCpu >= this.maxTotalCpu) return;
    }

    let count = 0;
    this.funcs.forEach((func) => {
      let currentProfilerTarget = profiler.getCurrentProfileTarget();
      logger.log("processFullQueue", "currentProfilerTarget", currentProfilerTarget, "stack", profiler.stack);
      // let context = profiler.pauseContext();
      func();
      // profiler.resumeContext(context);
      count++;

      if (this.maxTotalCpu !== false || this.maxCpuPerRun !== false) {
        let currentCpu = Game.cpu.getUsed();
        let cpuUsed = currentCpu - startCpu;
        totalCpuUsed += cpuUsed;
        if ((this.maxTotalCpu !== false && currentCpu >= this.maxTotalCpu) || (this.maxCpuPerRun !== false && totalCpuUsed >= this.maxCpuPerRun)) {
          this.resetSet();
          this.funcs = new Set([...this.funcs, ...this.funcs].slice(count));
          return;
        }
      }
    });

    this.resetSet();
  }
}
