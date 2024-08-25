/*
 * Module code goes here. Use 'module.export const to export things:
 * module.export constthing = 'a thing';
 *
 * You can import it from another modules like this:
 * import mod  from "pr.rooms.remote";
 * mod.thing == 'a thing'; // true
 */

import logger_import from "./screeps.logger";
let logger = new logger_import("pr.rooms.remote");

import baseRoom from "./pr.rooms.base";


class remoteRoom extends baseRoom {
  init() {
    super.init();

  }
  run() {
    super.run();


    this.setupPiles();
    this.setupContainers();
    this.setupSources();
    this.setupMiners("remoteMiner");

    this.setupWorkers();
    //this.setupAllRoadRepair();
    //this.setupTransporters();
    //this.makeWorkers(1);
    //this.makeTransporters(1)
  }


}



export default remoteRoom;