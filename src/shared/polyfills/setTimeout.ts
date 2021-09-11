import { queueTask, queueMicroTask } from "./tasks"
import { getSettings } from "shared/utils/settings"
import { uuid } from "uuid";
import { profile, profiler } from "profiler";



interface timeoutInstance {
  id: string;
  func: Function;
  ticks: number;
  startTick: any;
  cpuUsed: number
}



let timeouts: { [id: string]: timeoutInstance } = {};

function processTimeouts() {
  let profilerName = "setTimeout:processTimeouts";
  profiler.startCall(profilerName);

  let settings = getSettings();
  for (let timeoutId in timeouts) {
    let timeout = timeouts[timeoutId];
    if (!timeouts[timeoutId]) {
      console.log("timeout canceled:", timeoutId);
      //tasks need to requeue themseleves to run next tick
      // so all we should need to do to cancel is return before doing so.
      return;
    }

    //starting an timeout before loop in arean
    if (!(timeout.startTick >= 0)) {
      timeout.startTick = 0;
    }
    let ticksSinceStart = settings.getTick() - timeout.startTick;
    //compare ticks since start to ticks we were asked to wait.
    //queue task should queue a task to run next tick.
    if (ticksSinceStart >= timeout.ticks) {
      //queue our callback as a microTask to run this tick
      queueMicroTask(timeout.func);
      delete timeouts[timeoutId]
    }
  }

  //add our process back in to the task list. Gotta add every tick if you wanna run next tick.
  queueTask(processTimeouts);
  profiler.endCall(profilerName);
}

queueTask(processTimeouts);



export function clearTimeout(timeoutId: string | number) {
  if (timeouts[timeoutId]) {
    console.log("deleting timeout:", timeouts[timeoutId])
    delete timeouts[timeoutId];
  }
}


export function setTimeout(callback: Function, ticks: number) {
  let profilerName = "setTimeout";
  profiler.startCall(profilerName);
  if (!(ticks > -1)) {
    throw new Error("Timeout ticks must be greater than -1!")
  }



  //setup new instance and add it to the array
  let timeoutId = uuid();
  //timeouts[intId] = new timeoutInstance(intId, callback, ticks, getTick());
  timeouts[timeoutId] = {
    id: timeoutId,
    func: callback,
    ticks: ticks,
    startTick: getSettings().getTick(),
    cpuUsed: 0,
  } as timeoutInstance;
  profiler.endCall(profilerName);

  return timeoutId;
}
