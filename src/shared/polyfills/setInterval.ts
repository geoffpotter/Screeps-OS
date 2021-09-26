import { queueTask, queueMicroTask, builtInQueues } from "./tasks"
import {getSettings} from "shared/utils/settings"
import { uuid } from "shared/utils/uuid";
import { profile, profiler } from "shared/utils/profiling/profiler";



interface intervalInstance {
  id: string;
  func: Function;
  ticks: number;
  startTick: any;
  cpuUsed: number;
  queueName: string;
}



let intervals: Map<string, intervalInstance> = new Map();

function processIntervals() {
  //let profilerName = "setInterval:processIntervals";
  //profiler.startCall(profilerName);

  let settings = getSettings();
  let currentTick = settings.getTick();
  intervals.forEach((interval)=>{
    //starting an interval before loop in arean
    if (!(interval.startTick >= 0)) {
      interval.startTick = 0;
    }
    let ticksSinceStart = currentTick - interval.startTick;
    //console.log("checking interval", currentTick, ticksSinceStart)
    //compare ticks since start to ticks we were asked to wait.
    if (ticksSinceStart >= interval.ticks) {
      //queue our callback as a microTask to run this tick
      queueMicroTask(interval.func, interval.queueName);
      //reset "timer"
      interval.startTick = currentTick;
    }
  })
  //add our process back in to the task list. Gotta add every tick if you wanna run next tick.
  //queueTask(processIntervals);
  //profiler.endCall(profilerName);

  return false; //can return false to rerun now
}
//check intervals at tick init and schedule microtasks in the proper queue for resolution
queueTask(processIntervals, builtInQueues.TICK_INIT);



export function clearInterval(intervalId: string) {
  if (intervals.has(intervalId)) {
    console.log("deleting interval:", intervalId)
    intervals.delete(intervalId);
  }
}


export function setInterval(callback: Function, ticks: number, queueName:string="default"):string {
  //let profilerName = "setInterval";
  //profiler.startCall(profilerName);
  if (!(ticks > 0)) {
    throw new Error("Interval ticks must be greater than 0!")
  }


  //setup new instance and add it to the array
  let intervalId = uuid();
  //intervals[intId] = new intervalInstance(intId, callback, ticks, getTick());
  intervals.set(intervalId, {
    id: intervalId,
    func: callback,
    ticks: ticks,
    startTick: getSettings().getTick(),
    cpuUsed: 0,
    queueName: queueName
  });
  //profiler.endCall(profilerName);

  return intervalId;
}





// import {queueTask, queueMicroTask} from "./tasks"
// import {getSetting} from "./settings"
// import {uuid} from "uuid"
// import {profile, profiler} from "profiler";
// import {setTimeout, clearTimeout} from "./setTimeout";
// /**
// * @type {{[id: string]: string}}
// */
// let intervals = {};


// /**
// * @param {string} intervalId
// */
// export function clearInterval(intervalId) {
// if (intervals[intervalId]) {
// let timeoutId = intervals[intervalId];
// clearTimeout(timeoutId);
// delete intervals[intervalId];
// }
// }

// /**
// * @param {Function} callback
// * @param {number} ticks
// */
// export function setInterval(callback, ticks) {
// let profilerName = "setInterval";
// profiler.startCall(profilerName);
// if (!(ticks > 0)) {
// throw new Error("Interval ticks must be greater than 0!")
// }
// /**
// * @type {function}
// */
// let getTick = getSetting("getTick");
// let startTick = getTick();
// let intId = uuid();
// intervals[intId] = setTimeout(processTick, ticks);

// function processTick() {
// let profilerName = "setInterval:processTick";
// profiler.startCall(profilerName);
// if (!intervals[intId]) {
// console.log("interval canceled:", intId);
// //tasks need to requeue themseleves to run next tick
// // so all we should need to do to cancel is return before doing so.
// return;
// }
// let ticksSinceStart = getTick() - startTick;
// //compare ticks since start to ticks we were asked to wait.
// //queue task should queue a task to run next tick.
// if (ticksSinceStart >= ticks) {
// //queue our callback as a microTask to run this tick
// queueMicroTask(callback);
// //check to make sure our interval is still valid, if so, add the processor back to the task queue for next tick.
// if(intervals[intId]) {
// intervals[intId] = setTimeout(processTick, ticks);
// }
// } else {
// //re-queue this function to run next tick
// console.log('we should be re-setting our processor here')
// intervals[intId] = setTimeout(processTick, ticks);
// }
// profiler.endCall(profilerName);
// }


// profiler.endCall(profilerName);
// return intId;
// }
