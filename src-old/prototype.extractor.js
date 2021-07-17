/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('prototype.extractor');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("prototype.extractor");

StructureExtractor.prototype.getContainer = function() {
    if (this.cont == undefined) {
        var conts = this.pos.findInRange(FIND_STRUCTURES, 1, {filter: (s) => {return s.structureType == STRUCTURE_CONTAINER && s.progressTotal == undefined}});
        this.cont = conts[0];
    }
    return this.cont;
}
Mineral.prototype.getContainer = function() {
    if (this.cont == undefined) {
        var conts = this.pos.findInRange(FIND_STRUCTURES, 1, {filter: (s) => {return s.structureType == STRUCTURE_CONTAINER && s.progressTotal == undefined}});
        this.cont = conts[0];
    }
    return this.cont;
}