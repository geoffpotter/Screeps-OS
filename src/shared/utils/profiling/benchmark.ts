import { round } from "shared/polyfills/FakeDash";
// warinternal 13 March 2017 at 03:44

import { profiler } from "./profiler";
import sleep from "shared/polyfills/sleep"

import Logger from "shared/utils/logger"
let logger = new Logger("benchmark");
logger.color = COLOR_BROWN
logger.enabled = false;



 /**
 * Simple benchmark test with sanity check
 *
   Usage: benchmark([
   	() => doThing(),
   	() => doThingAnotherWay(),
   ]);

 * Output:
 *  *  enchmark results, 1 loop(s):
 *  ime: 1.345, Avg: 1.345, Function: () => doThing()
 *  ime: 1.118, Avg: 1.118, Function: () => doThingAnotherWay()
 *  param {any[]} arr
 */
 export default function benchmark(arr:Array<Function>, iter = 1, profile:boolean = false) {
    var exp,
      r,
      i,
      j,
      len = arr.length;
    var start, end, used;
    var results = arr.map((fn) => ({ fn: fn.name, time: 0, avg: 0, rtn: undefined }));
    for (j = 0; j < iter; j++) {
      for (i = 0; i < len; i++) {
        start = Game.cpu.getUsed();
        if (profile) {
          profiler.startCall(results[i].fn);
        }
        // logger.log("running fun", i);
        results[i].rtn = arr[i]();
        // logger.log("benchmark", i, JSON.stringify(results));
        used = Game.cpu.getUsed() - start;
        if (profile) {
          profiler.endCall(results[i].fn);
        }
        if (i > 0 && results[i].rtn != results[0].rtn) {

          logger.log("Results are not the same!", results[i].fn, results[i].rtn, results[0].fn, results[0].rtn);
          throw new Error("Results are not the same!");
        }
        results[i].time += used;
      }
    }
    var maxNameLength = Math.max(...results.map(r => r.fn.length));

    logger.log(`Benchmark results, ${iter} loop(s): `);
    results.forEach( (res) => {
      let avg = round(res.time / iter, 3);
      let time = round(res.time, 3);

      let out = `${res.fn.padEnd(maxNameLength)}: `
      if (avg > 1) {
        out += `${(avg).toFixed(3).padStart(8)} cpu/iter`
      } else {
        out += `${(1/avg).toFixed(3).padStart(8)} iter/cpu`
      }
      out += ` ${time.toFixed(1).padStart(6)} total cpu`
      console.log("Benchmarking results\n",out);
      // logger.log(`Time: ${time}, Avg: ${avg}, Function: ${res.fn}`);
    })
  }



/**
 * Asynchronous benchmark test that can run across ticks
 *
 * Usage: await benchmarkAsync([
 *   async () => await doThing(),
 *   async () => await doThingAnotherWay(),
 * ]);
 *
 * @param {Array<Function>} arr - Array of async functions to benchmark
 * @param {number} iter - Number of iterations (default: 1)
 * @param {boolean} profile - Whether to use profiler (default: false)
 * @param {number} maxCpuPerTick - Maximum CPU usage per tick (default: 20)
 */
export async function benchmarkAsync(arr: Array<Function>, iter = 1, profile = false, maxCpuPerTick = 20) {
  // @ts-ignore
  const results = arr.map((fn) => ({ fn: fn.benchName ? fn.benchName : fn.name, time: 0, avg: 0, rtn: undefined }));
  const len = arr.length;
  const startTick = Game.time;
  let lastTickAdvertised = Game.time;
  for (let j = 0; j < iter; j++) {
    for (let i = 0; i < len; i++) {
      if (Game.time > lastTickAdvertised + 1) {
        console.log(`Your benchmark is running for ${Game.time - startTick} ticks`, `on iteration ${j} of ${iter}`, `on function ${i} of ${len}`);
        lastTickAdvertised = Game.time;
      }
      let start = Game.cpu.getUsed();
      let context:string[] = [];
      if (profile) {
        // context = profiler.pauseContext();
        //clear the profiler data for this function, then start the call.

        let startCpu = profiler.startCall(results[i].fn);
        if (startCpu !== undefined) {
          logger.log('profiler startCpu', startCpu);
          let selfTime = profiler.getProfileTime(results[i].fn);
          start = selfTime;
        } else {
          logger.log('no profiler startCpu', startCpu);
        }
      }
      // logger.log('benchmark startCall', results[i].fn, "profile", profile, "context", context, "profiler.stack", profiler.stack);
      results[i].rtn = await arr[i]();

      let used = Game.cpu.getUsed() - start;
      // logger.log('benchmark endCall', results[i].fn, "used", used, "profile", profile, "context", context, "profiler.stack", profiler.stack);
      if (profile) {
        //override used with profiler data
        // logger.log('before endCall', results[i].fn, "context", context, "profiler.stack", profiler.stack);
        let profilerUsed = profiler.endCall(results[i].fn, false);
        if (profilerUsed) {
          let selfTime = profiler.getProfileTime(results[i].fn);
          used = selfTime - start;
          // logger.log('profilerUsed', profilerUsed, 'used', used);
        } else {
          logger.log('no profilerUsed', profilerUsed);
        }
        // logger.log('benchmark resumeContext', context);
        // profiler.resumeContext(context);
      }

      if (i > 0 && results[i].rtn != results[0].rtn) {
        logger.log("Results are not the same!", results[i].fn, results[i].rtn, results[0].fn, results[0].rtn);
        throw new Error("Results are not the same!");
      }

      results[i].time += used;
      if ((Game.cpu.getUsed() + used) > maxCpuPerTick) {
        logger.log('benchmark sleep', results[i].fn, "used", used, "profile", profile, "context", context, "profiler.stack", profiler.stack);
        await sleep(1); // Wait for next tick
      }
      // logger.log('benchmark end of loop', results[i].fn, "used", used, "profile", profile, "context", context, "profiler.stack", profiler.stack);
    }
  }

  const maxNameLength = Math.max(...results.map(r => r.fn.length));
  const endTick = Game.time;
  console.log(`Async benchmark results, ${iter} loop(s), ${endTick - startTick} ticks: `);
  results.forEach((res) => {
    let avg = round(res.time / iter, 3);
    let time = round(res.time, 3);

    let out = `${res.fn.padEnd(maxNameLength)}: `
    // if (avg > 1) {
      out += `${(avg).toFixed(3).padStart(8)} cpu/iter`
    // } else {
      out += `${(1/avg).toFixed(3).padStart(8)} iter/cpu`
    // }
    out += ` ${time.toFixed(1).padStart(6)} total cpu`
    console.log(out);
  });
}
