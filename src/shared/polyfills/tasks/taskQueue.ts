

import { addInPriorityOrder } from "shared/utils/ArrayHelpers";
import {functionQueueArray} from "shared/utils/queues/functionQueueArray"
import {functionQueueSet} from "shared/utils/queues/functionQueueSet"



export enum tickPhases {
  PRE_TICK,
  POST_TICK
}

export class taskQueue {

  private tasks:functionQueueArray = new functionQueueArray()
  private microTasks: functionQueueSet = new functionQueueSet();

  name: string;
  tickPhase: tickPhases;
  /**
   * high priority queues go first.
   */
  priority: number = 0;

  constructor(name: string, priority: number = 0, tickPhase: tickPhases = tickPhases.POST_TICK) {
    this.name = name;
    this.tickPhase = tickPhase;
    this.priority = priority;
    addQueue(this);

  }

  queueTask(task:Function) {
    this.tasks.addFunc(task);
  }
  queueMicroTask(microTask:Function) {
    this.microTasks.addFunc(microTask);
  }

  run() {
    console.log("running queue", this.name)
    this.runTasks();
    this.runMicroTasks();
  }
  private runTasks() {
    this.tasks.processCurrentQueueWithDone();
  }


  private runMicroTasks() {
    this.microTasks.processFullQueue();
  }

}


let preTickQueues = new Array<taskQueue>();
let postTickQueues = new Array<taskQueue>();
let queueLookup = new Map<string, taskQueue>();

export enum builtInQueues {
  TICK_INIT="tickInit", // create everything
  UPDATE="update",// find new actions/goals/jobs
  BEFORE_MAIN="beforeMain",

  AFTER_MAIN="afterMain",
  ACTIONS="actions", // do actions
  MOVEMENT="movement", //do movement
  TICK_DONE="tickDone",
}

enum TaskPriorities {
  FIRST = 10000,
  DEFAULT = 0,
  LAST = -10000
}

let tickInitQueue = new taskQueue(builtInQueues.TICK_INIT, TaskPriorities.FIRST, tickPhases.PRE_TICK);
let updateQueue = new taskQueue(builtInQueues.UPDATE, TaskPriorities.LAST, tickPhases.PRE_TICK);
let beforeMainQueue = new taskQueue(builtInQueues.BEFORE_MAIN, TaskPriorities.LAST, tickPhases.PRE_TICK);

let afterMainQueue = new taskQueue(builtInQueues.AFTER_MAIN, TaskPriorities.FIRST, tickPhases.POST_TICK);
let actionsQueue = new taskQueue(builtInQueues.ACTIONS, TaskPriorities.DEFAULT, tickPhases.POST_TICK);
let movementQueue = new taskQueue(builtInQueues.MOVEMENT, TaskPriorities.DEFAULT - 10, tickPhases.POST_TICK);
let tickDoneQueue = new taskQueue(builtInQueues.TICK_DONE, TaskPriorities.LAST, tickPhases.POST_TICK);


export let currentQueue:taskQueue|false = false;



/**
 * Queue a Microtask to be executed inbetween or after tasks, as cpu allows
 *
 * These run first at the end of the main loop, then again inbetween tasks.
 */
export function queueMicroTask(microTask:Function, queue:string|taskQueue|false=false) {
  if(queue===false) {
    if(currentQueue) {
      queue = currentQueue;
    } else {
      queue = tickDoneQueue;
    }
  } else if(!(queue instanceof taskQueue)) {
    queue = getQueue(queue);
  }
  queue.queueMicroTask(microTask);
}

/**
 * Queue a Task to be executed at the end of the tick, as cpu allows
 *
 * These run at the end of the tick, after the microtasks are run.
 */
export function queueTask(task:Function, queue:string|taskQueue|false=false) {
  if(queue===false) {
    if(currentQueue) {
      queue = currentQueue;
    } else {
      queue = tickDoneQueue;
    }
  } else if(!(queue instanceof taskQueue)) {
      queue = getQueue(queue);
  }
  queue.queueTask(task);
}

export function addQueue(queue:taskQueue) {
  if(queueLookup.has(queue.name)) {
    throw new Error("Queue names must be unique!"+queue.name)
  }
  queueLookup.set(queue.name, queue);
  if(queue.tickPhase == tickPhases.PRE_TICK) {
    addInPriorityOrder(preTickQueues, queue);
  } else {
    addInPriorityOrder(postTickQueues, queue);
  }
}

export function getQueue(queueName:string):taskQueue {
  if(!queueLookup.has(queueName)) {
    throw new Error("Trying to add func to non-existant queue")
  }
  //@ts-ignore complaining about returning undefined, but we throw an error in that case
  return queueLookup.get(queueName);
}

export function runPreTickQueues() {
  for(let queue of preTickQueues) {
    currentQueue = queue;
    queue.run();
    currentQueue = false;
  }
}
export function runPostTickQueues() {
  for(let queue of postTickQueues) {
    currentQueue = queue;
    queue.run();
    currentQueue = false;
  }
}


