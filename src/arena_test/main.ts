import { arenaInfo } from 'game';
import {
  //@ts-ignore
  getTicks
} from 'game/utils';

import {
  startTick,
  endTick
} from 'shared/polyfills';
import {
  setTimeout,
  setInterval,
  //Promise
} from "shared/polyfills";
import { queueMicroTask, queueTask } from 'shared/polyfills/tasks';
import { taskQueue, tickPhases } from 'shared/polyfills/tasks/taskQueue';
import sleep from 'shared/polyfills/sleep';
import settings from "./settings";
settings.getTick();


let initQueue = new taskQueue("init", 10, tickPhases.PRE_TICK);
let init2Queue = new taskQueue("init2", 10, tickPhases.PRE_TICK);

let promise = new Promise(async resolve => {
  console.log("init promise?");
  while(true) {
    if (getTicks() % 5 == 4) {
      resolve("init done!")
    }
    await sleep(1)
  }

});
promise.then((res) => console.log(res, getTicks()));


let dummy = 0;
let numIntervals = 1000000;
for(let i=0;i<numIntervals;i++) {
  queueTask(()=>{
    dummy += 1;
    //console.log("in task", i)
    return false;
  }, i%2==0 ? "init":"init2")
}


export function loop() {
  dummy = 0;
  let promise = new Promise(resolve => {
    console.log("loop promise?");
    if (getTicks() % 5 == 4) {
      resolve("loop done!")
    }
  });
  promise.then((res) => console.log(res, getTicks()));

  startTick();
  let currentTick = getTicks();
  // queueTask(()=>{
  //   console.log("in task", currentTick);
  //   return false;
  // })
  // queueMicroTask(()=>{
  //   console.log("in microtask", currentTick);
  //   return false;
  // })
  console.log('Current tick:', currentTick);
  // the promise becomes resolved immediately upon creation
  setTimeout(()=>{
    console.log("in set timeout!!!", currentTick)
  }, 3)
  endTick();
  //@ts-ignore
  console.log("tick over", dummy, settings.getCpu(), arenaInfo.cpuTimeLimit, arenaInfo.cpuTimeLimitFirstTick)
}
