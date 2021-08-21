import {
  ErrorMapper
} from "utils/ErrorMapper"

import {
  loop as oldLoop
} from "./oldBot/main"
import PromisePoly from "polyfills/promisepolyfill";
//import { AsyncLoop } from "polyfills/promisepolyfill/AsyncLoop";
import {
  AsyncLoop
} from "polyfills/promisepolyfill/asyncLoop";
import setIntervalPoly from "polyfills/setintervalpolyfill";
const asl = new AsyncLoop();

//Promise =  PromisePoly;

/**
 * @param {number} i
 */
function* generator(i) {
  yield i;
  yield i + 10;
}

const gen = generator(10);
console.log(typeof gen)

let promise = new Promise(resolve => {
  console.log("here?", Game.time);
  resolve("done!!")
  // let int = setIntervalPoly(() => {
  //   if (Game.time % 5 == 4) {
  //     clearInterval(int)
  //     resolve("done!");
  //   }
  // }, 1);
});
promise.then((res) => console.log("Promise resolved!", res, Game.time));

async function aTest() {
  let startTime = Game.time;
  console.log("start aTest", startTime);
  await PromisePoly.delay(0);
  console.log("after delay", startTime)
  for (let i = 0; i < 3; i++) {
    await PromisePoly.delay(i);
    console.log("finished waiting", i, "ticks", Game.time, "started at:", startTime)
  }
}

let wrappedLoop = ErrorMapper.wrapLoop(function() {
  console.log('START Main Loop');

  //let p = aTest();
  //console.log("atest returned", p)
  //p.then((() => console.log("atest resolved!")))
  try {
    oldLoop();
    //console.log("gen next:", JSON.stringify(gen.next()));
  } catch (e) {
    // for(let i in e) {
    //   console.log(i, e[i]);
    // }
    console.log("Error running old bot: ", e.stack);

    throw e;
  }

  console.log('END Main Loop');
})

//wrappedLoop = asl.wrapAsyncLoop(wrappedLoop)
export let loop = wrappedLoop;