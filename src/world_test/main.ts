// import "core-js";
console.log("----------------------------------------------- top of main ----------------------------------------------");
import "shared/polyfills"
import console from "shared/prototypes/console";
import "shared/prototypes/roomPosition";
import "shared/utils/map/WorldPosition";

import { setInterval } from "shared/polyfills/setInterval";
import { setTimeout } from "shared/polyfills/setTimeout";
import { asyncMainLoop } from "shared/utils/profiling/asyncLoop";

import { getQueueManager, TaskPriorities, TaskQueue, tickPhases } from "shared/polyfills/tasks";
import { ResourceInfoCollection } from "shared/utils/Collections/ResourceInfoCollection";

import Logger from "shared/utils/logger";
import IndexingCollection from "shared/utils/queues/indexingCollection";
const logger = new Logger("main");


let queueManager = getQueueManager();
queueManager.addQueue(new TaskQueue("test", TaskPriorities.FIRST), tickPhases.PRE_TICK);
queueManager.addQueue(new TaskQueue("test2", TaskPriorities.LAST), tickPhases.PRE_TICK);
queueManager.addQueue(new TaskQueue("test3", TaskPriorities.FIRST), tickPhases.POST_TICK);
queueManager.addQueue(new TaskQueue("test4", TaskPriorities.LAST), tickPhases.POST_TICK);

let startTick = Game.time;
setInterval(() => {
    let elapsed = Game.time - startTick;
    console.log("hello", elapsed);
    setTimeout(() => {
        let elapsed2 = Game.time - startTick;
        console.log("world", elapsed2);
    }, 0);
}, 1, "test", true);
// the "real" main function


class testThing {
    constructor(public id: string, public field1: string, public field2: string) {
    }
}

function makeUpThing() {
    let id = Math.random().toString(36).substring(2, 15);
    let field1 = Math.random().toString(36).substring(2, 15);
    let field2 = Math.random().toString(36).substring(2, 15);
    return new testThing(id, field1, field2);
}

async function asyncMain() {
    console.log("-------------- start main loop --------------");

  let startTick2 = Game.time;
  setTimeout(() => {
      let elapsed2 = Game.time - startTick2;
      console.log("world2", elapsed2);
  }, 0, "test3");

  let collection = new IndexingCollection<testThing>("id", ["field1", "field2"])

  for (let i = 0; i < 10; i++) {
    let thing = makeUpThing();
    logger.log("adding", thing.id);
    collection.add(thing);
  }

  collection.validateCollection();

  //delete random things from the collection
  for (let i = 0; i < 1; i++) {
    let randomThing = collection.getAll().find(t => Math.random() < 0.5);
    if (randomThing) {
        logger.log("removing", randomThing.id);
      collection.remove(randomThing);
    }
  }

  collection.validateCollection();

    console.log("-------------- end main loop --------------");
}

export const loop = asyncMainLoop(asyncMain);

console.log("-------------- end main --------------");
