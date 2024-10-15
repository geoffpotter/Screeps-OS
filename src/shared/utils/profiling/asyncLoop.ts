import { startTick, endTick } from "shared/polyfills";
import { profiler } from "shared/utils/profiling/profiler";
import MemoryManager from "shared/utils/memory/MemoryManager";

import Logger from "shared/utils/logger";
let logger = new Logger("asyncLoop");

let mainDone = true;
let finishedLastTick = true;
export function asyncMainLoop(asyncMain: () => Promise<void>) {
    let start = Game.time;
    let wrappedMain = wrapAsync(asyncMain);
    return () => {
        logger.log("----------------------Start async Tick-------------------------", mainDone)
        MemoryManager.pretick();
        startTick();
        wrappedMain()
        endTick();
        MemoryManager.postTick();
        logger.log("----------------------End async Tick-------------------------", mainDone)
    }
}

/**
 * Decorator to run a function async
 * @param func
 * @returns
 */
export function async(func: () => Promise<void>) {
    return wrapAsync(func);
}

/**
 * Wraps a function to run it async
 * @param func
 * @returns
 */
export function wrapAsync(func: () => Promise<void>) {
    let funcDone = true;
    let finishedLastTick = true;
    return () => {
        if (!finishedLastTick) {
            logger.log("Last tick not finished")
            funcDone = true;
        }
        finishedLastTick = false;
        if (funcDone) {
            funcDone = false;
            try {
                func().then(() => {
                    funcDone = true;
                }, (e) => {
                    logger.error("error in async function", e, (e as Error).stack);
                });
            } catch (e) {
                logger.error("error in async function", e, (e as Error).stack);
            }
        }
        finishedLastTick = true;
    }
}
