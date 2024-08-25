/*
 * Module code goes here. Use 'module.export const to export things:
 * module.export constthing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('prototype.source');
 * mod.thing == 'a thing'; // true
 */

var logger_imported = import ./screeps.logger;
let logger = new logger_imported("prototype.source");

Source.prototype.getContainer = function() {
  if (this.cont == undefined) {
    var conts = this.pos.findInRange(FIND_STRUCTURES, 1, {
      filter: (s) => {
        return s.structureType == STRUCTURE_CONTAINER && s.progressTotal == undefined
      }
    });
    this.cont = conts[0];
  }
  return this.cont;
}

Source.prototype.getKeeperLair = function() {
  if (this.cont == undefined) {
    var conts = this.pos.findInRange(FIND_STRUCTURES, 5, {
      filter: (s) => {
        return s.structureType == STRUCTURE_KEEPER_LAIR
      }
    });
    this.cont = conts[0];
  }
  return this.cont;
}