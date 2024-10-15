import { queueTask, queueMicroTask, builtInQueues, getQueueManager, TaskQueue } from "./tasks"
import { uuid } from "shared/utils/uuid";
import { profiler } from "shared/utils/profiling/profiler";

import Logger from "shared/utils/logger";
let logger = new Logger("setTimeout");
logger.color = COLOR_CYAN;
logger.enabled = false;




let timeouts: Map<string, TaskQueue> = new Map();

export function clearTimeout(timeoutId: string) {
  if (timeouts.has(timeoutId)) {
    console.log("deleting timeout:", timeoutId)
    timeouts.get(timeoutId)?.clearTimeout(timeoutId);
    timeouts.delete(timeoutId);
  }
}

let queueManager = getQueueManager();
export function setTimeout(callback: Function, ticks: number, queueName?:string):string {
  let queue = queueManager.resolveQueue(queueName);
  let timeoutId = queue.setTimeout(callback, ticks);
  timeouts.set(timeoutId, queue);
  return timeoutId;
}

// let timeouts: Map<string, timeoutInstance> = new Map();

// function processTimeouts() {
//   let profilerName = "setTimeout:processTimeouts";
//   profiler.startCallNoStack(profilerName);

//   let currentTick = Game.time;
//   timeouts.forEach((timeout)=>{
//     if (!(timeout.startTick >= 0)) {
//       timeout.startTick = 0;
//     }
//     let ticksSinceStart = currentTick - timeout.startTick;
//     //compare ticks since start to ticks we were asked to wait.
//     //queue task should queue a task to run next tick.
//     // logger.log("processTimeouts", timeout.id, ticksSinceStart, timeout.ticks);
//     if (ticksSinceStart >= timeout.ticks) {
//       //queue our callback as a microTask to run this tick
//       if (timeout.profileName) {
//         let profileName = timeout.profileName;
//         let timeoutInfo = timeout;
//         logger.log("queueing timeout", JSON.stringify(timeout));
//         queueMicroTask(()=>{
//           logger.log("running timeout", JSON.stringify(timeout));
//           let context = profiler.pauseContext();
//           profiler.resumeContext(timeout.profileContext);
//           // profiler.startCall(profileName);
//           logger.log("func context", profileName, "timeout.profileName", timeoutInfo.profileName, "timeout.profileContext", timeoutInfo.profileContext, "profiler.stack", profiler.stack);
//           timeout.func();
//           // profiler.endCall(profileName);
//           timeout.profileContext = profiler.pauseContext()
//           profiler.resumeContext(context);
//           logger.log("fixed context", profileName, "timeout.profileName", timeoutInfo.profileName, "timeout.profileContext", timeoutInfo.profileContext, "profiler.stack", profiler.stack);
//         }, timeout.queueName);
//       } else {
//         queueMicroTask(timeout.func, timeout.queueName);
//       }
//       timeouts.delete(timeout.id);
//     }
//   });

//   //add our process back in to the task list. Gotta add every tick if you wanna run next tick.
//   //queueTask(processTimeouts);
//   profiler.endCallNoStack(profilerName);

//   return false;//can return false now to rerun
// };

// queueTask(processTimeouts, builtInQueues.END_TICK);



// export function clearTimeout(timeoutId: string) {
//   profiler.startCallNoStack("clearTimeout");
//   if (timeouts.has(timeoutId)) {
//     logger.log("deleting timeout:", timeoutId)
//     timeouts.delete(timeoutId)
//   }
//   profiler.endCallNoStack("clearTimeout");
// }


// export function setTimeout(callback: Function, ticks: number, queueName?:string) {
//   if (!(ticks > -1)) {
//     throw new Error("Timeout ticks must be greater than -1!")
//   }

//   let currentProfileTarget = profiler.getCurrentProfileTarget();
//   let profileContext: string[] = [];
//   if (currentProfileTarget) {
//     profileContext = profiler.stack.slice();
//   }

//   logger.log("setTimeout", "currentProfileTarget", currentProfileTarget, "profileContext", profileContext, "profiler.stack", profiler.stack);
//   //setup new instance and add it to the array
//   let timeoutId = uuid();
//   //timeouts[intId] = new timeoutInstance(intId, callback, ticks, getTick());
//   timeouts.set(timeoutId, {
//     id: timeoutId,
//     func: callback,
//     ticks: ticks,
//     startTick: Game.time,
//     cpuUsed: 0,
//     queueName: queueName || false,
//     profileName: currentProfileTarget,
//     profileContext: profileContext
//   });

//   return timeoutId;
// }
