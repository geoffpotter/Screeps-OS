import {
    profiler, profile
  } from "shared/utils/profiling/profiler";
  import { taskQueue, tickPhases } from "./taskQueue";
  import { PriorityQueue } from "shared/utils/queues/priorityQueue";

  let preTickQueues = new PriorityQueue<taskQueue>((a,b) => a.priority >= b.priority);
  let postTickQueues = new PriorityQueue<taskQueue>((a,b) => a.priority >= b.priority);
  let defaultQueue = new taskQueue("default", -100, tickPhases.POST_TICK);

  let tasks: Function[] = [];
  let microTasks: Function[] = [];

  /**
   * Queue a Microtask to be executed inbetween or after tasks, as cpu allows
   *
   * These run first at the end of the main loop, then again inbetween tasks.
   * @param {Function} microTask
   */
  export function queueMicroTask(microTask: Function) {
    microTasks.push(microTask);
  }

  /**
   * Queue a Task to be executed at the end of the tick, as cpu allows
   *
   * These run at the end of the tick, after the microtasks are run.
   * @param {Function} task
   */
  export function queueTask(task: Function) {
    tasks.push(task);
  }
  @profile("tasks")
  class taskRunners {
    @profile("tasks")
    static runMicroTasks(maxRuns = Infinity) {
      let profileName = profiler.getCurrentProfileTarget();
      //console.log('microtask profiler name:',profileName)
      // profiler.startCall(profileName);
      //console.log('microTasks:', microTasks.length, maxRuns);
      let currentTask = 0;
      let numTasks;
      while (currentTask < (numTasks = microTasks.length) && currentTask <= maxRuns) {
        //console.log("running batch of microtasks")
        while (currentTask < numTasks) {
          let func = microTasks[currentTask];
          if (!func) {
            console.log("undefined microtask, check yer shit")
            continue;
          }
          //console.log("microTask", typeof func);
          profiler.pauseCall(profileName);
          func();
          profiler.resumeCall(profileName);
          currentTask++;
        }
      }
      microTasks.splice(0, currentTask);
      //console.log("MicroTasks done")
      //profiler.endCall(profileName)
    }

    static runTasks(maxRuns = Infinity) {
      let profileName = profiler.getCurrentProfileTarget();
      //profiler.startCall(profileName);
      let runs = 0;
      let tasksToRun = tasks;
      tasks = [];
      //console.log('tasks:', tasksToRun.length);
      while (tasksToRun.length > 0 && runs++ <= maxRuns) {
        let func = tasksToRun.shift();
        if (!func) {
          console.log("undefined microtask, check yer shit")
          continue;
        }
        //console.log("task", typeof func);
        profiler.pauseCall(profileName);
        func();
        taskRunners.runMicroTasks(1000000);
        profiler.resumeCall(profileName);
      }
      if (tasksToRun.length > 0) {
        tasks.push(...tasksToRun);
      }
      //console.log("Tasks done")
      //profiler.endCall(profileName)
    }
  }



  export function startTick() {
    //console.log("Tasks start tick")
  }


  export function endTick() {

    let profileName = "tasks:endTick";
    profiler.startCall(profileName);

    //console.log("Tasks end tick");
    taskRunners.runMicroTasks();
    taskRunners.runTasks();


    profiler.endCall(profileName);
  }
