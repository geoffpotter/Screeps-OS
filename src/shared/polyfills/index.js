
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
import {
  Promise as pf
} from "./Promise";

export let setTimeout = setTm;
export let clearTimeout = clearTm;
export let setInterval = setInt;
export let clearInterval = clearInt;
export let startTick = start;
export let endTick = end;
export let Promise = pf
