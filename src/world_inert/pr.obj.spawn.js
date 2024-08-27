/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * import mod  from "pr.obj.spawn";
 * mod.thing == 'a thing'; // true
 */

import logger_import from "./screeps.logger";
let logger = new logger_import("pr.obj.spawn");

import processClass from "./INeRT.process";
import threadClass from "./INeRT.thread";


class spawnProc extends processClass {
  init() {
    this.taskManager = this.kernel.getProcess('taskManager');
    this.creepManager = this.kernel.getProcess('creepManager');
    this.intel = this.kernel.getProcess('intel');
    this.req = false;
    this.spawnQueue = [];
    let spawn = Game.getObjectById(this.data.spawnId);
    this.spawnTask = this.taskManager.createTask(this, global.Task.FILLSPAWNS, global.Task.TYPE_DOWORK, spawn.pos, {
      "spawnId": spawn.id
    });
    this.spawnContTask = this.taskManager.createTask(this, global.Task.FEEDSPAWNS, global.Task.TYPE_DOWORK, false, {
      "targetId": false
    });
    //this.feedSpawnTask = this.taskManager.createTask(this, global.Task.FEEDSPAWN, global.Task.TYPE_DOWORK, false, {"targetId":false});


    this.taskManager.setTask(this, this.spawnTask);
  }

  initThreads() {
    return [
      this.createThread("taskUpdate", "taskUpdate"),
      this.createThread("doSpawning", "work")
    ];
  }

  taskUpdate() {
    this.spawnQueue = [];

    let spawn = Game.getObjectById(this.data.spawnId);
    if (!spawn) {
      return threadClass.DONE;
    }
    this.spawnTask.amount = spawn.energyCapacity - spawn.energy;


    let cont = spawn.getContainer(1);
    if (cont) {
      this.spawnContTask.amount = cont.storeCapacity - _.sum(cont.store);
      this.spawnContTask.pos = cont.pos;
      this.spawnContTask.data.targetId = cont.id
      //logger.log(cont, cont.storeCapacity, _.sum(cont.store), this.spawnContTask.amount);
      this.taskManager.setTask(this, this.spawnContTask);
    }
  }

  doSpawning() {
    let spawn = Game.getObjectById(this.data.spawnId);
    if (!spawn) {
      return threadClass.DONE;
    }
    //logger.log("tryna spawn")
    if (!spawn.spawning) {

      this.req = this.spawnFromQueue(spawn);
    } else {
      global.utils.drawText(`spawning ${this.req.role} for ${this.req.proc}`, spawn.pos)
    }

  }

  spawnFromQueue(spawn) {


    let req = this.creepManager.getCreepToSpawn(spawn);
    logger.log("tryina spawn", JSON.stringify(req));
    if (req) {
      let classObj = global.creepClasses[req.creepClass];
      if (classObj) {
        let roomIntel = this.intel.getRoomIntel(spawn.room.name);
        let energyToUse = (Object.keys(Game.creeps).length < 10) ? spawn.room.energyAvailable : spawn.room.energyCapacityAvailable;
        //let energyToUse = spawn.room.energyAvailable
        let body = classObj.getBody(energyToUse);
        let name = `${req.proc}-${req.role}-${req.creepClass}-${req.index}`;
        let memory = this.creepManager.getMemoryFromReq(req);
        logger.log(spawn, "spawning", name, "for", req.proc, JSON.stringify(body));
        let ret = spawn.spawnCreep(body, name, {
          memory: memory
        })
        let index = req.index;
        while (ret == -3) {
          index++;
          name = `${req.proc}-${req.role}-${req.creepClass}-${index}`;
          ret = spawn.spawnCreep(body, name, {
            memory: memory
          })
        }
        if (ret == 0) { //it worked, mark req filled
          this.creepManager.markReqFilled(req);
        }
        logger.log('spawn result', ret);
      } else {
        //class not defined!
        logger.log("CREEP CLASS NOT DEFINED!!", req.creepClass);
      }
      return req;
    }
    return false;
  }

}



export default spawnProc;