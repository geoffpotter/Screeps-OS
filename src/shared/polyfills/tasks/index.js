import {
  profile,
  profiler
} from "profiler";



/**
 * Queue of tasks that need to be run
 * @type {Function[]}
 */
export let tasks = [];
/**
 * Queue of microTasks that need to be run
 * @type {Function[]}
 */
export let microTasks = [];

/**
 * Queue a Microtask to be executed inbetween or after tasks, as cpu allows
 * 
 * These run first at the end of the main loop, then again inbetween tasks.
 * @param {Function} microTask 
 */
export function queueMicroTask(microTask) {
  microTasks.push(microTask);
}

/**
 * Queue a Task to be executed at the end of the tick, as cpu allows
 * 
 * These run at the end of the tick, after the microtasks are run.
 * @param {Function} task 
 */
export function queueTask(task) {
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