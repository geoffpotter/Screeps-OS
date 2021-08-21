/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * import mod  from "pr.rooms.spawn";
 * mod.thing == 'a thing'; // true
 */

import logger_import from "./screeps.logger";
let logger = new logger_import("pr.rooms.spawn");
//logger.enabled = false;
import baseRoom from "./pr.rooms.base";


class spawnRoomProc extends baseRoom {
  init() {
    super.init();


  }
  run() {
    super.run();
    this.setupBasicProcs();
    this.setupCreeps();



    //_.each(this.workers, (c) => logger.log("------====",c, c.suicide()));
    let intel = this.intel.getRoomIntel(this.data.roomName);

    //logger.log((_.size(this.workers) + _.size(this.builders)), JSON.stringify(this.workers))
    // for(let i in this.workers) {
    //     logger.log(i)
    // }

    let workerProc = this.kernel.getProcess("workers-" + this.data.roomName);
    if (workerProc && workerProc.creeps.length == 0) {
      //set emergency mode in intel

      intel.emergencyMode = true;
    } else {
      intel.emergencyMode = false;
    }

  }

  setupBasicProcs() {

    this.setupSpawns();
    this.setupTowers();
    this.setupPiles();
    this.setupContainers();
    this.setupSources();
  }

  setupCreeps() {
    this.setupMiners();

    this.setupWorkers();
    this.setupFillers();
    this.setupBuilders();
    this.setupUpgraders();
    this.setupTransporters();

    //this.makeWorkers(1);
    // this.makeFillers(1);
    // this.makeBuilders(1);
    // this.makeUpgraders(3);
    // this.makeTransporters(2);
  }
}



export default spawnRoomProc;