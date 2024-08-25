/*
 * Module code goes here. Use 'module.export const to export things:
 * module.export constthing = 'a thing';
 *
 * You can import it from another modules like this:
 * import mod  from "pr.rooms.base";
 * mod.thing == 'a thing'; // true
 */



import logger_import from "./screeps.logger";
let logger = new logger_import("pr.rooms.base");
//logger.enabled = false;


import processClass from "./INeRT.process";
import threadClass from "./INeRT.thread";

import structureClass from "./pr.obj.structure";
import pileClass from "./pr.obj.pile";
import spawnClass from "./pr.obj.spawn";
import towerClass from "./pr.obj.tower";
import sourceClass from "./pr.obj.source";

import minerClass from "./pr.role.miner";
import builderClass from "./pr.role.builder";
import fillerClass from "./pr.role.filler";
import transporterClass from "./pr.role.transporter";
import upgraderClass from "./pr.role.upgrader";
import workerClass from "./pr.role.worker";

class baseRoom extends processClass {
  init() {
    this.taskManager = this.kernel.getProcess('taskManager');
    this.intel = this.kernel.getProcess("intel");
    this.flag = Game.flags[this.data.flagName];
    this.flagX = this.flag.pos.x;
    this.flagY = this.flag.pos.y;


  }

  initThreads() {
    return [

      this.createThread("run", "empire"),

      this.createThread("taskCreate", "taskCreate"),
      this.createThread("taskUpdate", "taskUpdate"),
    ];
  }

  run() {
    logger.log(this.name, "baseRoom RUn", this.data.flagName, Game.flags[this.data.flagName]);
    //kill ourselves if our flag is gone.
    if (!Game.flags[this.data.flagName]) {
      this.kernel.killProcess(this);
    }
  }

  taskCreate() {
    let room = Game.rooms[this.data.roomName];
    if (room && room.controller && room.controller.my && !this.praiseTask) {
      this.praiseTask = this.taskManager.createTask(this, global.Task.PRAISE, global.Task.TYPE_DOWORK, room.controller.pos, {
        "controllerId": room.controller.id
      });
      this.feedUpgradeTask = this.taskManager.createTask(this, global.Task.FEEDUPGRADERS, global.Task.TYPE_DOWORK, room.controller.pos, {
        "controllerId": room.controller.id
      });
      this.taskManager.setTask(this, this.praiseTask);
      this.taskManager.setTask(this, this.feedUpgradeTask);
    }
    return threadClass.DONE;
  }
  taskUpdate() {
    logger.log("-----------------------here???")
    let roomIntel = this.intel.getRoomIntel(this.data.roomName);
    let room = Game.rooms[this.data.roomName];




    //----------------------  handle roads ----------------------

    if (!roomIntel.structures.roads) {
      logger.log("no roads in", this.data.roomName, "skipping")
      return;
    }
    let roads = roomIntel.structures.roads;
    //logger.log(this.data.roomName, "setting up roads:", JSON.stringify(roomIntel.structures.roads), JSON.stringify(roomIntel));

    if (!this.roadRepairTasks) {
      this.roadRepairTasks = {};
    }



    if (roads.length > 0) {
      for (let r in roads) {
        let roadId = roads[r].id;
        let roadToRepair = Game.getObjectById(roadId);
        if (!roadToRepair) {
          //road decayed, skip it
          //logger.log('decayed road!', roadId)
          continue;
        }
        //logger.log('found road')
        let repairThisRoadTask;
        if (this.roadRepairTasks[roadToRepair.id]) {
          repairThisRoadTask = this.roadRepairTasks[roadToRepair.id];
        } else {
          repairThisRoadTask = this.taskManager.createTask(this, global.Task.REPAIR, global.Task.TYPE_DOWORK, false, {
            "roadId": false
          });
          this.roadRepairTasks[roadToRepair.id] = repairThisRoadTask;
        }


        repairThisRoadTask.pos = roadToRepair.pos;
        //logger.log('----',JSON.stringify(repairThisRoadTask.data))
        repairThisRoadTask.data.roadId = roadToRepair.id;
        repairThisRoadTask.amount = (roadToRepair.hitsMax - roadToRepair.hits) / 100;
        repairThisRoadTask.data.structureId = roadToRepair.id;
        if (repairThisRoadTask.amount > 10 || repairThisRoadTask.amountAssigned > 0) {
          this.taskManager.setTask(this, repairThisRoadTask);
        }
      }


    }
  }


  setupContainers() {
    let roomIntel = this.intel.getRoomIntel(this.data.roomName)
    if (!roomIntel.structures)
      return;
    const conts = roomIntel.structures.containers;
    for (let c in conts) {
      const cont = conts[c];

      let procName = `cont-${cont.id}`;
      let data = {
        structureId: cont.id
      };
      let proc = this.kernel.getProcess(procName);
      if (!proc) {
        proc = new structureClass(procName, data);
        this.kernel.startProcess(proc, this);
      }
    }
  }

  setupPiles() {
    let room = Game.rooms[this.data.roomName];
    if (room) {
      const piles = room.find(FIND_DROPPED_RESOURCES);
      for (let p in piles) {
        const pile = piles[p]
        if (pile.amount > 100) {
          let procName = `pile-${pile.id}`;
          let data = {
            pileId: pile.id
          };
          let proc = this.kernel.getProcess(procName);
          if (!proc) {
            proc = new pileClass(procName, data);
            this.kernel.startProcess(proc, this);
          }
        }
      }
    }
  }
  setupSpawns() {
    let roomIntel = this.intel.getRoomIntel(this.data.roomName);
    let spawns = roomIntel.structures.spawns;
    for (let s in spawns) {
      let spawn = spawns[s];
      let pos = spawn.pos;
      //start source proc
      let procName = `spawn-${spawn.id}`;
      let data = {
        spawnId: spawn.id
      };
      let proc = this.kernel.getProcess(procName);
      if (!proc) {
        proc = new spawnClass(procName, data);
        this.kernel.startProcess(proc, this);
      }
    }
  }
  setupTowers() {
    let roomIntel = this.intel.getRoomIntel(this.data.roomName);
    let towers = roomIntel.structures.towers;
    for (let t in towers) {
      let tower = towers[t];
      let pos = tower.pos;
      //start source proc
      let procName = `tower-${tower.id}`;
      let data = {
        towerId: tower.id
      };
      let proc = this.kernel.getProcess(procName);
      if (!proc) {
        proc = new towerClass(procName, data);
        this.kernel.startProcess(proc, this);
      }
    }
  }
  setupSources() {
    let intel = this.intel.getRoomIntel(this.data.roomName);
    //logger.log("----",this.data.roomName, intel)
    if (intel) {
      this.miners = {};
      let sources = intel.sources;
      let index = 0;
      for (let s in sources) {
        let source = sources[s];
        //start source proc
        let procName = "source-";
        if (source.id) {
          procName += source.id;
        } else {
          procName += `${source.pos.x}-${source.pos.y}-${source.pos.roomName}`
        }
        let data = {
          sourceId: source.id,
          pos: source.pos
        };
        let proc = this.kernel.getProcess(procName);
        if (!proc) {
          proc = new sourceClass(procName, data);
          this.kernel.startProcess(proc, this);
        }
      }
    }
  }
  setupMiners(creepClass = "miner") {
    let intel = this.intel.getRoomIntel(this.data.roomName);

    if (intel) {
      this.miners = {};
      let sources = intel.sources;
      let index = 0;
      for (let s in sources) {


        let source = sources[s];
        let pos = source.pos;

        let rolePos = pos;
        let procName = "miner-" + this.data.roomName + "-" + source.id;
        let data = {
          roomName: this.data.roomName,
          pos: rolePos,
          sourceId: source.id,
          creepClass: creepClass
        };
        let proc = this.kernel.getProcess(procName);
        if (!proc) {
          proc = new minerClass(procName, data);
          this.kernel.startProcess(proc, this);
        }
        index++;
      }
    }
  }




  setupWorkers() {
    let rolePos = new RoomPosition(this.flagX, this.flagY, this.data.roomName);
    let procName = "workers-" + this.data.roomName;
    let data = {
      roomName: this.data.roomName,
      pos: rolePos
    };
    let proc = this.kernel.getProcess(procName);
    if (!proc) {
      proc = new workerClass(procName, data);
      this.kernel.startProcess(proc, this);
    }
    proc.data = data;
  }

  setupBuilders() {
    let rolePos = new RoomPosition(this.flagX, this.flagY + 1, this.data.roomName);

    //figure out how many we need;
    let totalWork = this.taskManager.getTaskAmountByNameAndRange([global.Task.REPAIR, global.Task.BUILD], rolePos, 50);
    let partsNeeded = totalWork / 50;
    partsNeeded = Math.floor(Math.min(150, partsNeeded));
    logger.log("builders", "total work:", totalWork, "parts needed", partsNeeded)
    let requiredParts = {
      WORK: (1 + partsNeeded)
    };

    let procName = "builders-" + this.data.roomName;
    let data = {
      roomName: this.data.roomName,
      pos: rolePos,
      requiredParts: requiredParts
    };
    let proc = this.kernel.getProcess(procName);
    if (!proc) {
      proc = new builderClass(procName, data);
      this.kernel.startProcess(proc, this);
    }
    proc.data = data;
  }

  setupUpgraders() {
    let room = Game.rooms[this.data.roomName];
    let rolePos = new RoomPosition(this.flagX, this.flagY + 2, this.data.roomName);
    if (room) {
      rolePos = room.controller.pos;
    }
    let procName = "upgraders-" + this.data.roomName;
    let data = {
      roomName: this.data.roomName,
      pos: rolePos
    };
    let proc = this.kernel.getProcess(procName);
    if (!proc) {
      proc = new upgraderClass(procName, data);
      this.kernel.startProcess(proc, this);
    }
    proc.data = data;
  }

  setupTransporters() {
    let rolePos = new RoomPosition(this.flagX, this.flagY + 3, this.data.roomName);

    //figure out how many we need;
    let totalWork = this.taskManager.getTaskAmountByNameAndRange([global.Task.PICKUP, global.Task.PICKUPENERGYCONT], rolePos, 150);
    let partsNeeded = totalWork / 50;
    partsNeeded = Math.floor(Math.min(150, partsNeeded));
    logger.log("transporters", "total work:", totalWork, "parts needed", partsNeeded)
    let requiredParts = {
      CARRY: (20 + partsNeeded)
    };
    let procName = "transporters-" + this.data.roomName;
    let data = {
      roomName: this.data.roomName,
      pos: rolePos,
      requiredParts: requiredParts
    };
    let proc = this.kernel.getProcess(procName);
    if (!proc) {
      proc = new transporterClass(procName, data);
      this.kernel.startProcess(proc, this);
    }
    proc.data = data;
  }

  setupFillers() {
    let rolePos = new RoomPosition(this.flagX, this.flagY + 4, this.data.roomName);
    let procName = "fillers-" + this.data.roomName;
    let room = Game.rooms[this.data.roomName];
    let partsNeeded = room.energyCapacityAvailable / 100
    let requiredParts = {
      CARRY: (1 + partsNeeded)
    };
    let data = {
      roomName: this.data.roomName,
      pos: rolePos,
      requiredParts: requiredParts
    };
    let proc = this.kernel.getProcess(procName);
    if (!proc) {
      proc = new fillerClass(procName, data);
      this.kernel.startProcess(proc, this);
    }
    proc.data = data;
  }




}


//profiler.registerClass(baseRoom, "rooms.base")
export default baseRoom;