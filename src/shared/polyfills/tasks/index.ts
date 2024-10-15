import { addInPriorityOrder } from "shared/utils/ArrayHelpers";
import { getQueueManager } from "./queueManager";
import { profiler } from "shared/utils/profiling";
export * from "./taskQueue"
export * from "./queueManager"
import Logger from "shared/utils/logger";
let logger = new Logger("tasks");
logger.color = COLOR_CYAN
logger.enabled = false;
let profilerStackFromLastTick: string[] = [];
export function startTick() {
  // logger.log("startTick", profilerStackFromLastTick, profiler.stack);
  // profiler.resumeContext(profilerStackFromLastTick);
  getQueueManager().runPreTickQueues();
}

export function endTick() {
  getQueueManager().runPostTickQueues();
  // profilerStackFromLastTick = profiler.pauseContext()
  // logger.log("endTick", profilerStackFromLastTick, profiler.stack);
}
