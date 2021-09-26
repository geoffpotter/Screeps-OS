import { getSettings } from "shared/utils/settings"
let settings = getSettings();
import { round } from "shared/polyfills/FakeDash";
// warinternal 13 March 2017 at 03:44

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
 export function benchmark(arr:Array<Function>, iter = 1) {
    var exp,
      r,
      i,
      j,
      len = arr.length;
    var start, end, used;
    var results = arr.map((fn) => ({ fn: fn.toString(), time: 0, avg: 0, rtn: undefined }));
    for (j = 0; j < iter; j++) {
      for (i = 0; i < len; i++) {
        start = settings.getCpu();
        results[i].rtn = arr[i]();
        used = settings.getCpu() - start;
        if (i > 0 && results[i].rtn != results[0].rtn)
          throw new Error("Results are not the same!");
        results[i].time += used;
      }
    }
    console.log(`Benchmark results, ${iter} loop(s): `);
    results.forEach( (/** @type {{ avg: number; time: number; fn: any; }} */ res) => {
      res.avg = round(res.time / iter, 3);
      res.time = round(res.time, 3);
      console.log(`Time: ${res.time}, Avg: ${res.avg}, Function: ${res.fn}`);
    })
  }
