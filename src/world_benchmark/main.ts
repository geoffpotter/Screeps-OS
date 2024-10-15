// import "core-js";
console.log("----------------------------------------------- top of main ----------------------------------------------");
import console from "shared/prototypes/console";
import {
    ErrorMapper
  } from "shared/utils/errors/ErrorMapper";

//@ts-ignore
// delete global.PromisePoly;
import {
    startTick,
    endTick,
    setInterval,
    clearInterval,
    setTimeout,
    clearTimeout,
    //@ts-ignore
    PromisePoly,
    sleep
} from "shared/polyfills"
import { profiler, profile } from "shared/utils/profiling/profiler";
import benchmark, { benchmarkAsync } from "shared/utils/profiling/benchmark";
import { asyncMainLoop } from "shared/utils/profiling/asyncLoop";
import { queueTask } from "shared/polyfills/tasks";
import { process_start_tick, process_end_tick } from "shared/utils/profiling/profiler";
profiler.clear();
profiler.start();
// profiler.startCall("main.init");

import testFunctions from "./functionQueues";
import {runIterationTests} from "./iteration"
import wasteCPU from "../shared/utils/profiling/wasteCPU";

import { tickPhases, getQueueManager } from "shared/polyfills/tasks";
import { TaskQueue, TaskPriorities } from "shared/polyfills/tasks";

// removeDefaultQueues();
// overrideDefaultStartTickQueue(new taskQueue("start_Tick", TaskPriorities.LAST * 100, tickPhases.PRE_TICK, 50, 50));
// overrideDefaultEndTickQueue(new taskQueue("end_Tick", TaskPriorities.LAST * 100, tickPhases.POST_TICK, 50, 50));

// let start = new TaskQueue("start_Tick", TaskPriorities.LAST * 1000, tickPhases.PRE_TICK, 50, 50);
// let end = new TaskQueue("end_Tick", TaskPriorities.LAST * 1000, tickPhases.POST_TICK, 50, 50);
// queueTask(process_start_tick, start);
// queueTask(process_end_tick, end);

// profiler.endCall("main.init");
// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
// export const loop = ErrorMapper.wrapLoop(async () => {


let start = new TaskQueue("start_Tick", TaskPriorities.FIRST * 1000, 50, 50);
let end = new TaskQueue("end_Tick", TaskPriorities.LAST * 1000, 50, 50);
// let queueManager = getQueueManager();
// queueManager.addQueue(start, tickPhases.PRE_TICK);
// queueManager.addQueue(end, tickPhases.POST_TICK);

// class testProfiler {
//     @profile()
//     test(cpuToWaste: number) {
//         let start = Game.cpu.getUsed();
//         let i = 0;
//         while (Game.cpu.getUsed() - start < cpuToWaste) {
//             i++;
//         }
//         return i;
//     }
// }

// function test(cpuToWaste: number) {
//     let start = Game.cpu.getUsed();
//     let i = 0;
//     while (Game.cpu.getUsed() - start < cpuToWaste) {
//         i++;
//     }
//     return i;
// }


// function test_profiler() {
//     // profiler.startCall("test");
//     profiler.startContext("test");
//     test(1);
//         profiler.startCall("test2");
//         test(1);
//         profiler.endCall("test2");

//         profiler.startCall("test3");
//         test(1);
//         profiler.endCall("test3");
//     profiler.endContext("test");
//     // profiler.endCall("test");

//     profiler.startCall("test5");
//     profiler.startContext("test5");
//     test(1);
//     profiler.startCall("test4");
//     test(1);
//     profiler.endCall("test4");
//     profiler.endContext("test5");
//     profiler.endCall("test5");
// }


async function delayFn() {
    console.log("step 1");
    profiler.startCall("step 1");
    wasteCPU(1);
    await sleep(1);
    profiler.endCall("step 1");

    console.log("step 2");
    profiler.startCall("step 2")
    wasteCPU(1);
    await sleep(1);
    profiler.endCall("step 2")

    console.log("step 3");
    profiler.startCall("step 3")
    wasteCPU(1);
    await sleep(1);
    profiler.endCall("step 3")

    profiler.startCall("step 4")
    wasteCPU(1);
    profiler.endCall("step 4")
    return "done";
}
// let profiledDelayFn = profiler.wrapFunction(delayFn);

function regularFunc() {
    console.log("regularFunc");
    delayFn();
}


let tests = async () => {
    console.log("-------------- start interval --------------");
    profiler.startCall("profiledDelayFn");
    await delayFn();
    profiler.endCall("profiledDelayFn");
    console.log("-------------- end interval --------------");
}
let tests2 = async () => {
    console.log("-------------- start interval --------------");
    wasteCPU(10);
    console.log("-------------- end interval --------------");
}
// setInterval(tests, 5);
// setInterval(tests2, 1);
// setInterval(tests2, 1);
// setInterval(tests2, 1);
// setInterval(tests2, 1);
// setInterval(tests2, 1);


let testPromises = async () => {
    console.log("-------------- start promises --------------");
    profiler.startCall("testPromises");
    let promise = new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve("done");
        }, 1);
    });
    let res = await promise;
    profiler.endCall("testPromises");
    console.log("-------------- end promises --------------", res);
}
// testPromises();
// the "real" main function


async function asyncMain() {
    console.log("-------------- start main loop --------------");

    // profiler.startCall("test1");
    // wasteCPU(100);
    // await sleep(1);
    // profiler.startCall("test2");
    // wasteCPU(100);
    // await sleep(1);
    // profiler.startCall("test3");
    // wasteCPU(100);
    // profiler.endCall("test3");
    // profiler.endCall("test2");
    // profiler.endCall("test1");


    // console.log("Starting testFunctions");
    // await testFunctions(40, 10000, 0.001);
    // await sleep(1);
    // profiler.output();
    // profiler.clear();
    // await testFunctions(40, 400, 1);
    // await sleep(1);
    // // await testFunctions(10, 10000, 0.2);
    // console.log("Finished testFunctions");

    console.log("running iteration tests")
    await runIterationTests(1_000, 1_000_000)
    console.log("done with iteration tests")


    profiler.output();
    profiler.clear();
    // await sleep(5);


    console.log("-------------- end main loop --------------");
}

export const loop = asyncMainLoop(asyncMain);
