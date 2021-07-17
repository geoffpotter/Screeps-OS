/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('prototype.terminal');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("prototype.terminal");

StructureTerminal.prototype.getLink = function() {
    if (this.cont == undefined) {
        var conts = this.pos.findInRange(FIND_STRUCTURES, 2, {filter: (s) => {return s.structureType == STRUCTURE_LINK && s.progressTotal == undefined}});
        this.cont = conts[0];
    }
    return this.cont;
}


StructureTerminal.prototype.belowMinEnergy = function() {
    return this.store.energy < 10000;
}



