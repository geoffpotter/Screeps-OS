
import {
  startTick as start,
  endTick as end
} from "./tasks"
import {
  setInterval as setInt,
  clearInterval as clearInt
} from "./setInterval";
import {
  setTimeout as setTm,
  clearTimeout as clearTm
} from "./setTimeout";
import {default as pf} from "./Promise";
import {default as slp} from "./sleep";

export type idType = string;

export let setTimeout = setTm;
export let clearTimeout = clearTm;
export let setInterval = setInt;
export let clearInterval = clearInt;
export let startTick = start;
export let endTick = end;
export let PromisePoly = pf
export let sleep = slp
