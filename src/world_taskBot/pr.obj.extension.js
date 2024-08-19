/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * import mod  from "pr.obj.extension";
 * mod.thing == 'a thing'; // true
 */



import logger_import from "./screeps.logger";
let logger = new logger_import("pr.obj.extension");

import processClass from "./INeRT.process";
import threadClass from "./INeRT.thread";

import structureClass from "./pr.obj.structure";

class extensionProc extends structureClass {
  taskCreate() {
    super.taskCreate();
    let struct = Game.getObjectById(this.data.structureId);
    if (!struct) {
      logger.log(this.name, "structure not there", this.data.structureId, struct);
      return threadClass.DONE;
    }
    this.fillSpawnsTask = this.taskManager.createTask(this, global.Task.FILLSPAWNS, global.Task.TYPE_DOWORK, struct.pos, {
      "spawnId": struct.id
    });
    this.taskManager.setTask(this, this.fillSpawnsTask);
    logger.log(struct.id, "task created");
    return threadClass.DONE;
  }
  taskUpdate() {
    super.taskUpdate();
    let struct = Game.getObjectById(this.data.structureId);
    if (!struct) {
      logger.log(this.name, "structure not there", this.data.structureId, struct);
      return threadClass.DONE;
    }
    this.fillSpawnsTask.amount = struct.energyCapacity - struct.energy;
  }


}



export default extensionProc;