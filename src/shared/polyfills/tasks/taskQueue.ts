import Logger from "shared/utils/logger";
import { uuid } from "shared/utils/uuid";
import type { QueueManager } from "./queueManager";

const logger = new Logger("taskQueue");
logger.color = COLOR_PURPLE;
logger.enabled = false;


interface intervalInstance {
  id: string;
  func: Function;
  ticks: number;
  startTick: any;
  cpuUsed: number;
  queueName: string | false;
  profileName: string | false;
  profileContext: string[];
}
interface timeoutInstance {
  id: string;
  func: Function;
  ticks: number;
  startTick: any;
  cpuUsed: number;
  queueName: string | false;
  profileName: string | false;
  profileContext: string[];
}


export class TaskQueue {
  private tasks: Function[] = [];
  private microTasks: Set<Function> = new Set();
  name: string;
  priority: number;
  private maxCpuPerRun: number | false;
  private maxTotalCpu: number | false;
  private intervals: Map<string, intervalInstance> = new Map();
  private timeouts: Map<string, timeoutInstance> = new Map();

  currentlyRunningQueue: TaskQueue | false = false;


  get numTasks() {
    return this.tasks.length;
  }
  get numMicroTasks() {
    return this.microTasks.size;
  }
  constructor(name: string, priority: number = 0, maxCpuPerRun: number | false = false, maxTotalCpu: number | false = false) {
    this.name = name;
    this.priority = priority;
    this.maxCpuPerRun = maxCpuPerRun;
    this.maxTotalCpu = maxTotalCpu;
  }


  setInterval(func: Function, ticks: number, runImmediately: boolean = false, profileName: string | false = false, profileContext: string[] | false = false) {
    let id = uuid();
    if (runImmediately) {
      this.queueMicroTask(func);
    }
    this.intervals.set(id, {
      id,
      func,
      ticks,
      startTick: Game.time,
      cpuUsed: 0,
      queueName: this.name,
      profileName,
      profileContext: profileContext || []
    });
    return id;
  }

  clearInterval(id: string) {
    this.intervals.delete(id);
  }
  processIntervals() {
    this.intervals.forEach((interval) => {
      let ticksSinceStart = Game.time - interval.startTick;
      if (ticksSinceStart >= interval.ticks) {
        this.queueMicroTask(interval.func);
        interval.startTick = Game.time;
      }
    });
  }

  setTimeout(func: Function, ticks: number, profileName: string | false = false, profileContext: string[] | false = false) {
    let id = uuid();
    this.timeouts.set(id, {
      id,
      func,
      ticks,
      startTick: Game.time,
      cpuUsed: 0,
      queueName: this.name,
      profileName,
      profileContext: profileContext || []
    });

    if (ticks === 0 && this.currentlyRunningQueue && this.name == this.currentlyRunningQueue.name) {
      this.currentlyRunningQueue.queueMicroTask(() => {
        if (this.timeouts.has(id)) {
          this.queueMicroTask(func);
          this.clearTimeout(id);
        }
      });
    }
    return id;
  }

  clearTimeout(id: string) {
    this.timeouts.delete(id);
  }
  processTimeouts() {
    this.timeouts.forEach((timeout) => {
      let ticksSinceStart = Game.time - timeout.startTick;
      if (ticksSinceStart >= timeout.ticks) {
        this.queueMicroTask(timeout.func);
        this.clearTimeout(timeout.id);
      }
    });
  }


  queueTask(task: Function) {
    logger.log("queueTask", this.name);
    this.tasks.push(task);
  }

  queueMicroTask(microTask: Function) {
    logger.log("queueMicroTask", this.name);
    this.microTasks.add(microTask);
  }

  run() {
    logger.log("run", this.name, this.tasks.length, this.microTasks.size);
    const startCpu = Game.cpu.getUsed();
    let totalCpuUsed = 0;
    this.processIntervals();
    this.processTimeouts();
    const checkCpuLimit = () => {
      const currentCpu = Game.cpu.getUsed();
      totalCpuUsed = currentCpu - startCpu;
      return (this.maxTotalCpu !== false && currentCpu >= this.maxTotalCpu) ||
             (this.maxCpuPerRun !== false && totalCpuUsed >= this.maxCpuPerRun);
    };

    // Run all microtasks first
    this.runMicroTasks(checkCpuLimit);
    if (checkCpuLimit()) return;

    // Run tasks, with microtasks in between
    let taskIndex = 0;
    while (taskIndex < this.tasks.length) {
      const task = this.tasks[taskIndex];
      logger.log("run", this.name, taskIndex, this.tasks.length);
      const done = task();

      if (done !== false) {
        this.tasks.splice(taskIndex, 1);
      } else {
        taskIndex++;
      }

      // Run microtasks after each task
      this.runMicroTasks(checkCpuLimit);

      if (checkCpuLimit()) {
        // If we've hit the CPU limit, keep remaining tasks for next tick
        logger.log("run", this.name, "CPU limit hit", this.tasks.length, this.tasks);
        // this.tasks = this.tasks.slice(taskIndex);
        return;
      }
    }


    logger.log(`${this.name} queue finished. CPU used: ${totalCpuUsed}`);
  }

  private runMicroTasks(checkCpuLimit: () => boolean) {
    for (const microTask of this.microTasks) {
      const done = microTask();
      if (done !== false) {
        this.microTasks.delete(microTask);
      }

      if (checkCpuLimit()) {
        return;
      }
    }
  }
}
