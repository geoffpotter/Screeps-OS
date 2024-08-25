/*
 * Module code goes here. Use 'module.export const to export things:
 * module.export constthing = 'a thing';
 *
 * You can import it from another modules like this:
 * import mod  from "pr.empire";
 * mod.thing == 'a thing'; // true
 */

import logger_import from "./screeps.logger";
let logger = new logger_import("pr.empire");


import processClass from "./INeRT.process";
import threadClass from "./INeRT.thread";

import intelClass from "./pr.empire.intel";

import constSiteClass from "./pr.obj.constructionSite";
import structureClass from "./pr.obj.structure";
import extensionClass from "./pr.obj.extension";

import spawnRoomClass from "./pr.rooms.spawn";
import slaveRoomClass from "./pr.rooms.slave";
import remoteRoomClass from "./pr.rooms.remote";

import claimerClass from "./pr.role.claimer";


import stat from "./util.stat";

class empire extends processClass {
  init() {
    //init vars
    //setup intel proc
    // global.intel = this.intel = new intelClass("intel");
    // this.kernel.startProcess(this.intel);
    this.gclProgress = new stat();
    this.gclProgressChange = new stat();
  }

  initThreads() {
    return [
      this.createThread("run", "empire"),
      this.createThread("endTick", "work"),
    ];
  }


  run() {

    if (Game.gcl.progress == 0) { //Guessing this won't acutally work..
      this.gclProgress = new stat();
      this.gclProgressChange = new stat();
    }

    this.setupConstructionSites();
    this.setupStructures();


    this.setupMainRooms();
    this.setupSlaveRooms();
    this.setupRemoteMiningRooms();

    this.setupClaimFlags();


  }

  endTick() {
    let lastProgress = this.gclProgress.current;
    this.gclProgress.current = Game.gcl.progress;
    this.gclProgressChange.current = this.gclProgress.current - lastProgress;
  }

  setupConstructionSites() {
    for (let s in Game.constructionSites) {
      let site = Game.constructionSites[s];
      let procName = "constSite-" + site.id;
      let proc = this.kernel.getProcess(procName)
      let data = {
        siteId: site.id
      };
      if (!proc) {
        proc = new constSiteClass(procName, data);
        this.kernel.startProcess(proc, this);
      }
      proc.data = data;
    }
  }
  setupStructures() {
    for (let s in Game.structures) {
      let structure = Game.structures[s];
      if (structure.structureType == STRUCTURE_CONTROLLER) {
        continue;
      }
      if (structure.structureType == STRUCTURE_EXTENSION) {
        let procName = "extension-" + structure.id;
        let proc = this.kernel.getProcess(procName)
        let data = {
          structureId: structure.id
        };
        if (!proc) {
          proc = new extensionClass(procName, data);
          this.kernel.startProcess(proc, this);
        }
        proc.data = data;
      } else {
        let procName = "structure-" + structure.id;
        let proc = this.kernel.getProcess(procName)
        let data = {
          structureId: structure.id
        };
        if (!proc) {
          proc = new structureClass(procName, data);
          this.kernel.startProcess(proc, this);
        }
        proc.data = data;
      }

    }
  }

  // setupSpawnRooms() {
  //     for(let spawnName in Game.spawns) {
  //         let spawn = Game.spawns[spawnName];
  //         let room = spawn.room;
  //         let procName = "spawnRoom-" + room.name;
  //         if (!this.spawnRooms[room.name]) {
  //             this.spawnRooms[room.name] = this.childProcess(procName, "spawnRoom", this.kernel.pri("INIT"), {roomName:room.name});
  //         }
  //     }
  // }

  setupMainRooms() {
    if (!this.spawnRooms) {
      this.spawnRooms = {};
    }
    let roomFlags = global.utils.allFlagsByColor(COLOR_WHITE, COLOR_WHITE);

    for (let f in roomFlags) {
      let flag = roomFlags[f];
      let procName = "spawnRoom-" + flag.pos.roomName;
      let data = {
        roomName: flag.pos.roomName,
        flagName: flag.name
      };
      let proc = this.kernel.getProcess(procName);
      if (!proc) {
        proc = new spawnRoomClass(procName, data);
        this.kernel.startProcess(proc, this);
      }
      proc.data = data;
    }
  }

  setupSlaveRooms() {
    let roomFlags = global.utils.allFlagsByColor(COLOR_WHITE, COLOR_GREY);
    for (let f in roomFlags) {
      let flag = roomFlags[f];
      let procName = "slave-" + flag.pos.roomName;
      let data = {
        roomName: flag.pos.roomName,
        flagName: flag.name
      };
      let proc = this.kernel.getProcess(procName);
      if (!proc) {
        proc = new slaveRoomClass(procName, data);
        this.kernel.startProcess(proc, this);
      }
      proc.data = data;
    }
  }

  setupRemoteMiningRooms() {

    let remoteMiningFlags = global.utils.allFlagsByColor(COLOR_WHITE, COLOR_YELLOW);
    for (let f in remoteMiningFlags) {
      let flag = remoteMiningFlags[f];
      let procName = "remote-" + flag.pos.roomName;
      let data = {
        roomName: flag.pos.roomName,
        flagName: flag.name
      };
      let proc = this.kernel.getProcess(procName);
      if (!proc) {
        proc = new remoteRoomClass(procName, data);
        this.kernel.startProcess(proc, this);
      }
      proc.data = data;
    }
  }

  setupClaimFlags() {
    let flags = global.utils.allFlagsByColor(COLOR_GREEN, COLOR_GREEN);
    for (let f in flags) {
      let flag = flags[f];
      let rolePos = flag.pos;
      let procName = "claimer-" + rolePos.roomName;
      let proc = this.kernel.getProcess(procName);
      let data = {
        roomName: rolePos.roomName,
        pos: rolePos,
        flagName: flag.name
      };
      if (!proc) {
        proc = new claimerClass(procName, data);
        this.kernel.startProcess(proc, this);
      }
      proc.data = data;
      //this.childProcess("claimer-"+rolePos.roomName, "claimer", this.kernel.pri("CREEP"), {roomName:rolePos.roomName, pos:rolePos, flagName:flag.name});
    }
  }

  getIntelProc() {
    return this.intel;
  }
}



export default empire;