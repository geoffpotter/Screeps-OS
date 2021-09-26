import { addInPriorityOrder } from "shared/utils/ArrayHelpers";
import {
  profile,
  profiler
} from "shared/utils/profiling/profiler";
import { runPostTickQueues, runPreTickQueues } from "./taskQueue";

export * from "./taskQueue"


export function startTick() {
  runPreTickQueues();
}

export function endTick() {
  runPostTickQueues();
}
