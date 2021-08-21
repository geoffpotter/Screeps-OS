import {
  ErrorMapper
} from "utils/ErrorMapper";

import {
  startTick,
  endTick,
  setInterval,
  clearInterval,
  setTimeout,
  clearTimeout
} from "polyfills"
import {
  getSetting,
  setSettings,
  Promise
} from "polyfills";



import {
  profiler,
  profile
} from "profiler";
let mem = {};
profiler.getMemory = function() {
  return mem;
};
profiler.getTick = function() {
  return Game.time;
}
profiler.getCpu = function() {
  return new Date().valueOf();
  //return Game.cpu.getUsed();
}
// @ts-ignore
global.profiler = profiler;
profiler.clear();
profiler.start();
profiler.startCall("main:init");
console.log("---------------------------------TOP OF MAIN----------------------")
let bool = false;

// promise resolves in three ticks
async function delayFn() {
  // occurs synchronous
  //console.log("Resolving promise.");
  //await PromisePoly.delay(1);
  console.log("after wait 1")
  //await PromisePoly.delay(1);
  console.log("after wait 2")
  //await PromisePoly.delay(1);
  console.log("after wait 3")
  return "Resolved promise";
}

let counter = 0;
let wasteCpu = profiler.wrapFunction(function(toWaste = 10) {
  let start = Game.cpu.getUsed();
  let tot = 0;
  for (let i of Array(toWaste)) {
    let r = Math.random();
    tot += r;
  }
  let total = Game.cpu.getUsed() - start;
  //console.log("wasted", total, "Cpu calculating:", tot)
  counter += tot
}, "wasteCpu");

setSettings({
  getTick: () => {
    return Game.time;
  }
})


let numToMake = 1;

for (let i = 0; i < numToMake; i++) {
  setInterval(() => {
    wasteCpu();
    //console.log("we're in our own interval!! woot!", i, Game.time)
  }, 1);
}

/**
 * @param {number} ticks
 */
async function sleep(ticks) {
  let endSleepTick = Game.time + ticks;
  //console.log("sleeping for:", ticks, "from", Game.time, "to", endSleepTick);
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, ticks)
  });
}

let p = new Promise((resolve, reject) => {
  resolve("resolved")
})

let lastTime = new Date().valueOf();
let avgTimeBetweenTicks = 0;
class main {
  // @ts-ignore


  static loop() {

    profiler.startCall("main:loop")
    //calc time between ticks
    let time = new Date().valueOf();
    let elapsed = time - lastTime;
    avgTimeBetweenTicks = avgTimeBetweenTicks * 0.9 + elapsed * 0.1;
    lastTime = time;
    console.log("tick timing:", elapsed, avgTimeBetweenTicks, 1000 / avgTimeBetweenTicks)


    let startTime = Game.time;

    console.log("------- My Start tick--------", Game.time, counter);
    for (let i = 0; i < numToMake; i++) {
      // setTimeout(() => {
      //   wasteCpu();
      //   //console.log("we're in our own Timeout!! woot!", Game.time)
      // }, 2);

      new Promise((resolve, reject) => {
        //console.log("resolving promise")
        resolve("resolved" + i)
      }).then((r) => {
        //console.log('first then', r)
        return sleep(5);
      }).then(() => {
        // console.log("second then", startTime, Game.time);
        // if ((Game.time - startTime) > 0) {
        //   console.log("slept!", startTime, Game.time)
        // }
        // if ((Game.time - startTime) == 5) {
        //   console.log("slept for 5!")
        // }
        return sleep(2);
      }).then((result) => {
        counter--;
        //console.log("slept another 2, promise resolved!", result)
      })

    }
    wasteCpu();
    // delayFn().then((res) => {
    //   wasteCpu();
    //   console.log("delayFn finished! result")
    // })
    //console.log(`Current game tick is ${Game.time}`);
    console.log("---------------End my tick-----------------", counter);

    profiler.endCall("main:loop")
  }
}

profiler.endCall("main:init");
// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  console.log("-----------------------------------------------")
  startTick();
  profiler.startCall("outter:loop")
  main.loop();

  endTick();

  profiler.endCall("outter:loop");

  profiler.startCall("profileOut:main");
  let out = profiler.output();
  profiler.endCall("profileOut:main");
  console.commandResult(out);
});