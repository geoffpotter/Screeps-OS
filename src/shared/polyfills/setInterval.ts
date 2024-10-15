import { queueTask, queueMicroTask, getQueueManager, TaskQueue } from "./tasks"

import { uuid } from "shared/utils/uuid";
import { profiler } from "shared/utils/profiling/profiler";



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



// let intervals: Map<string, intervalInstance> = new Map();


// function processIntervals() {
//   //let profilerName = "setInterval:processIntervals";
//   //profiler.startCall(profilerName);

//   let currentTick = Game.time;
//   intervals.forEach((interval)=>{
//     //starting an interval before loop in arean
//     if (!(interval.startTick >= 0)) {
//       console.log("overriding interval start tick", interval.id, interval.startTick, currentTick);
//       interval.startTick = 0;
//     }
//     let ticksSinceStart = currentTick - interval.startTick;
//     console.log("checking interval", currentTick, ticksSinceStart, JSON.stringify(interval))
//     //compare ticks since start to ticks we were asked to wait.
//     if (ticksSinceStart >= interval.ticks) {
//       //queue our callback as a microTask to run this tick
//       console.log("queueing interval", interval.id, interval.queueName)
//       let context = profiler.pauseContext();
//       profiler.resumeContext(interval.profileContext);
//       queueMicroTask(interval.func, interval.queueName);
//       interval.profileContext = profiler.pauseContext()
//       profiler.resumeContext(context);
//       //reset "timer"
//       interval.startTick = currentTick;
//     }
//   })
//   //add our process back in to the task list. Gotta add every tick if you wanna run next tick.
//   //queueTask(processIntervals);
//   //profiler.endCall(profilerName);

//   return false; //can return false to rerun now
// }
// //check intervals at tick init and schedule microtasks in the proper queue for resolution
// queueTask(processIntervals);


let intervals: Map<string, TaskQueue> = new Map();

export function clearInterval(intervalId: string) {
  if (intervals.has(intervalId)) {
    console.log("deleting interval:", intervalId)
    intervals.get(intervalId)?.clearInterval(intervalId);
    intervals.delete(intervalId);
  }
}

let queueManager = getQueueManager();
export function setInterval(callback: Function, ticks: number, queueName?:string, runImmediately:boolean = false):string {
  let queue = queueManager.resolveQueue(queueName);
  let intervalId = queue.setInterval(callback, ticks, runImmediately);
  intervals.set(intervalId, queue);
  return intervalId;
}

// export function setInterval(callback: Function, ticks: number, queueName?:string, runImmediately:boolean = false):string {
//   //let profilerName = "setInterval";
//   //profiler.startCall(profilerName);
//   if (!(ticks > 0)) {
//     throw new Error("Interval ticks must be greater than 0!")
//   }
//   let currentProfileTarget = profiler.getCurrentProfileTarget();
//   let profileContext: string[] = [];
//   if (currentProfileTarget) {
//     profileContext = profiler.stack.slice();
//   }
//   console.log("setting interval", ticks, queueName, runImmediately, runImmediately ? 0 : Game.time);
//   //setup new instance and add it to the array
//   let intervalId = uuid();
//   //intervals[intId] = new intervalInstance(intId, callback, ticks, getTick());
//   intervals.set(intervalId, {
//     id: intervalId,
//     func: callback,
//     ticks: ticks,
//     startTick: runImmediately ? -1 : Game.time,
//     cpuUsed: 0,
//     queueName: queueName || false,
//     profileName: currentProfileTarget,
//     profileContext: profileContext
//   });
//   //profiler.endCall(profilerName);

//   return intervalId;
// }


