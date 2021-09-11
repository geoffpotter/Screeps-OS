
import {
  Creep,
} from 'game/prototypes';

import "./prototypeCreep";

import { IndexingCollection } from "utils/indexingCollection";
import { FakeGameObject } from "utils/settings";

import loggerClass from "utils/logger";

let logger = new loggerClass("objectManager");
//logger.color = COLOR_GREY;

export class objectManager {
  objects: IndexingCollection<FakeGameObject>;
  constructor() {
    this.objects = new IndexingCollection<FakeGameObject>("id", ["type"], [10000, Infinity]);
  }
  updateobjects(objects:FakeGameObject[]) {
    for(let object of objects) {
      //logger.log("checking for object", object);
      if(!this.objects.has(object)) {
        //logger.log('adding object', object);
        this.objects.add(object);
      }
    }
  }
  runobjects() {
    logger.log("running Objects", this.objects.getAll().length)
    for(let object of this.objects.getAll()) {
      this.runobject(object);
    }
  }
  runobject(object:FakeGameObject):void {
    if(typeof object.run == "function") {
      object.run();
    } else {
      logger.log("object has no run func", object);
    }
  }
}
