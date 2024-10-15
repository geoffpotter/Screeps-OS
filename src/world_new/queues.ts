import { TaskPriorities, TaskQueue, tickPhases } from "shared/polyfills/tasks";
import { getQueueManager } from "shared/polyfills/tasks";

const queues = {
    TICK_INIT: "tickInit", // create everything
    POST_INIT: "postInit", //
    UPDATE: "update",// find new actions/goals/jobs
    ACTIONS: "actions", // do actions
    MOVEMENT: "movement", //do movement
    WORK: "work", //do background work that is not time critical
    TICK_DONE: "tickDone",
}

let queueManager = getQueueManager();

let defaultCPULimit = Game.cpu.limit;
queueManager.addQueue(new TaskQueue(queues.TICK_INIT, TaskPriorities.FIRST, false, defaultCPULimit), tickPhases.PRE_TICK);
queueManager.addQueue(new TaskQueue(queues.POST_INIT, TaskPriorities.DEFAULT, false, defaultCPULimit), tickPhases.PRE_TICK);
queueManager.addQueue(new TaskQueue(queues.UPDATE, TaskPriorities.LAST, false, defaultCPULimit), tickPhases.PRE_TICK);

queueManager.addQueue(new TaskQueue(queues.ACTIONS, TaskPriorities.FIRST, false, defaultCPULimit), tickPhases.POST_TICK);
queueManager.addQueue(new TaskQueue(queues.MOVEMENT, TaskPriorities.DEFAULT, false, defaultCPULimit), tickPhases.POST_TICK);
queueManager.addQueue(new TaskQueue(queues.WORK, TaskPriorities.LAST + 1, false, defaultCPULimit), tickPhases.POST_TICK);
queueManager.addQueue(new TaskQueue(queues.TICK_DONE, TaskPriorities.LAST, false, defaultCPULimit), tickPhases.POST_TICK);




export default queues;
