import { addInPriorityOrder } from "shared/utils/ArrayHelpers";
import { TaskQueue } from "./taskQueue";
import Logger from "shared/utils/logger";
let logger = new Logger("queueManager");
logger.color = COLOR_PURPLE;
logger.enabled = false;

export enum tickPhases {
    PRE_TICK,
    POST_TICK
}


export enum TaskPriorities {
    FIRST = 10000,
    DEFAULT = 0,
    LAST = -10000
}

export let builtInQueues = {
    START_TICK: "builtinStartTickQueue",
    END_TICK: "builtinEndTickQueue",
}

export class QueueManager {
	private preTickQueues: Array<TaskQueue>;
	private postTickQueues: Array<TaskQueue>;
	private queueLookup: Map<string, TaskQueue>;
    private _currentQueue: TaskQueue | false = false;
    get currentQueue() {
        return this._currentQueue;
    }
    set currentQueue(queue: TaskQueue | false) {
        this._currentQueue = queue;
        //set the currently running queue on all the queues
        this.queueLookup.forEach((queue) => {
            queue.currentlyRunningQueue = this._currentQueue;
        });
    }

    builtinStartTickQueue: TaskQueue;
    builtinEndTickQueue: TaskQueue;
    constructor() {
        this.preTickQueues = [];
        this.postTickQueues = [];
        this.queueLookup = new Map();
        this.currentQueue = false;
        this.builtinStartTickQueue = new TaskQueue(builtInQueues.START_TICK, TaskPriorities.FIRST * 100);
        this.builtinEndTickQueue = new TaskQueue(builtInQueues.END_TICK, TaskPriorities.LAST * 100);
        this.addQueue(this.builtinStartTickQueue, tickPhases.PRE_TICK);
        this.addQueue(this.builtinEndTickQueue, tickPhases.POST_TICK);
    }


    addQueue(queue: TaskQueue, tickPhase: tickPhases) {
        if (this.queueLookup.has(queue.name)) {
            throw new Error("Queue names must be unique! " + queue.name)
        }
        // logger.log("adding queue", queue.name, this.queueLookup);
        this.queueLookup.set(queue.name, queue);
        // logger.log("added queue", queue.name, this.queueLookup.keys());
        if (tickPhase == tickPhases.PRE_TICK) {
            addInPriorityOrder(this.preTickQueues, queue);
        } else {
            addInPriorityOrder(this.postTickQueues, queue);
        }
        // logger.log("added queue", queue.name, this.queueLookup.keys(), this.preTickQueues, this.postTickQueues);
    }

    getQueue(queueName: string): TaskQueue {
        if (!this.queueLookup.has(queueName)) {
            throw new Error("Trying to get non-existant queue")
        }
        //@ts-ignore complaining about returning undefined, but we throw an error in that case
        return this.queueLookup.get(queueName);
    }
    resolveQueue(queue: string | TaskQueue | false = false): TaskQueue {
        // logger.log("queueMicroTask", queue, this.queueLookup.size);

        if (queue === false) {
            if (this.currentQueue) {
                queue = this.currentQueue;
            } else {
                queue = this.builtinEndTickQueue;
            }
        } else if (!(queue instanceof TaskQueue)) {
            queue = this.getQueue(queue);
        }
        return queue;
    }
    getCurrentQueue(): TaskQueue | false {
        return this.currentQueue;
    }
    /**
     * Queue a Microtask to be executed inbetween or after tasks, as cpu allows
     *
     * These run first at the end of the main loop, then again inbetween tasks.
     */
    queueMicroTask(microTask: Function, queue: string | TaskQueue | false = false) {
        // logger.log("queueMicroTask", queue, this.queueLookup.size);
        if (queue === false) {
            if (this.currentQueue) {
                queue = this.currentQueue;
            } else {
                queue = this.builtinEndTickQueue;
            }
        } else if (!(queue instanceof TaskQueue)) {
            queue = this.getQueue(queue);
        }
        queue.queueMicroTask(microTask);
    }

    /**
     * Queue a Task to be executed at the end of the tick, as cpu allows
     *
     * These run at the end of the tick, after the microtasks are run.
     */
    queueTask(task: Function, queue: string | TaskQueue | false = false) {
        // logger.log("queueTask", queue, this.queueLookup.size);
        if (queue === false) {
            if (this.currentQueue) {
                queue = this.currentQueue;
            } else {
                queue = this.builtinEndTickQueue;
            }
        } else if (!(queue instanceof TaskQueue)) {
            queue = this.getQueue(queue);
        }
        queue.queueTask(task);
    }



    runPreTickQueues() {
        logger.log("running pre tick queues", this.preTickQueues);
        for (let queue of this.preTickQueues) {
            this.currentQueue = queue;
            try {
                logger.log("running queue", queue.name, queue.numTasks, queue.numMicroTasks);
                queue.run();
            } catch (e) {
                logger.error("error running queue", queue.name, e, (e as Error).stack);
            }
            this.currentQueue = false;
        }
    }
    runPostTickQueues() {
        logger.log("running post tick queues", this.postTickQueues);
        for (let queue of this.postTickQueues) {
            this.currentQueue = queue;
            try {
                logger.log("running queue", queue.name, queue.numTasks, queue.numMicroTasks);
                queue.run();
            } catch (e) {
                logger.error("error running queue", queue.name, e, (e as Error).stack);
            }
            this.currentQueue = false;
        }
    }


}


const queueManager = new QueueManager();
export function getQueueManager() {
    return queueManager;
}
export function queueMicroTask(microTask: Function, queue: string | TaskQueue | false = false) {
    logger.log("queueMicroTask", queue);
    getQueueManager().queueMicroTask(microTask, queue);
}
export function queueTask(task: Function, queue: string | TaskQueue | false = false) {
    logger.log("queueTask", queue);
    getQueueManager().queueTask(task, queue);
}








