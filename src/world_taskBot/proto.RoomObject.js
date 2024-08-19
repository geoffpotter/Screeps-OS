/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * import mod  from "proto.RoomObject";
 * mod.thing == 'a thing'; // true
 */
import logger_import from "./screeps.logger";
let logger = new logger_import("proto.RoomObject");

let containerMap = {};


export default function() {
  RoomObject.prototype.getContainer = function(range = 1) {
    if (!containerMap[this.id]) {
      //logger.log(this, this.room, this.pos)
      let conts = this.pos.findInRange(FIND_STRUCTURES, range, {
        filter: (s) => s.structureType == STRUCTURE_CONTAINER
      })
      let cont = false;
      if (conts.length > 0) {
        cont = conts[0];
      }
      containerMap[this.id] = cont.id;
    }
    return Game.getObjectById(containerMap[this.id]);
  }
}