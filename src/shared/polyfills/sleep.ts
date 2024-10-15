

import { setTimeout }from "shared/polyfills/setTimeout";
import PromisePoly from "./Promise";
import { profiler } from "shared/utils/profiling/profiler";
import { setInterval, clearInterval  } from "./setInterval";
 export default function sleep(ticks: number) {
  // let profileContext = profiler.stack.slice();
  // let endSleepTick = Game.time + ticks;
  // console.log("sleeping for:", ticks, "from", Game.time, "to", endSleepTick);
  return new PromisePoly<void>((resolve, reject) => {
    setTimeout(() => {
      // profiler.resumeContext(profileContext);
      resolve();
    }, ticks)
  });
}


export function sleepUntil(condition: () => boolean, ticks: number = 1) {
  return new PromisePoly<void>((resolve, reject) => {
    const interval = setInterval(() => {
      if (condition()) {
        clearInterval(interval);
        resolve();
      }
    }, ticks, );
  });
}


export function sleepUntilCreepExists(creepName: string) {
  return sleepUntil(() => Game.creeps[creepName] !== undefined, 1)
}

