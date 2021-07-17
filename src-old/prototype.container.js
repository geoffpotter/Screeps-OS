/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('prototype.container');
 * mod.thing == 'a thing'; // true
 */
 
var logger = require("screeps.logger");
logger = new logger("prototype.container");

StructureContainer.prototype.mineralAmount = function() {
    return _.sum(this.store) - this.store.energy;
}

StructureContainer.prototype.getSource = function() {
    if (this.s == undefined) {
        var conts = this.pos.findInRange(FIND_SOURCES, 1);
        this.s = conts[0];
    }
    return this.s;
}
StructureContainer.prototype.getMineral = function() {
    if (this.m == undefined) {
        var conts = this.pos.findInRange(FIND_MINERALS, 1);
        this.m = conts[0];
    }
    return this.m;
}
StructureContainer.prototype.getSpawn = function() {
    
    if (this.sp == undefined) {
        var conts = this.pos.findInRange(FIND_MY_SPAWNS, 1);
        this.sp = conts[0];
    }
    return this.sp;
}