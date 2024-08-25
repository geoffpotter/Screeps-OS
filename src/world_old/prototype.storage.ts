/*
 * Module code goes here. Use 'module.export const to export things:
 * module.export constthing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('prototype.storage');
 * mod.thing == 'a thing'; // true
 */

var logger_imported = import ./screeps.logger;
let logger = new logger_imported("prototype.storage");

StructureStorage.prototype.getLink = function() {
  if (this.cont == undefined) {
    var conts = this.pos.findInRange(FIND_STRUCTURES, 2, {
      filter: (s) => {
        return s.structureType == STRUCTURE_LINK && s.progressTotal == undefined
      }
    });
    this.cont = conts[0];
  }
  return this.cont;
}


StructureStorage.prototype.belowMinEnergy = function() {
  return this.store.energy < 10000;
}