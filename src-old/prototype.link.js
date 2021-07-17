/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('prototype.link');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("prototype.link");

StructureLink.prototype.getContainer = function() {
    if (this.cont == undefined) {
        var conts = this.pos.findInRange(FIND_STRUCTURES, 1, {filter: (s) => {return s.structureType == STRUCTURE_CONTAINER && s.progressTotal == undefined}});
        this.cont = conts[0];
    }
    return this.cont;
}

StructureLink.prototype.getSpawn = function() {
    
    if (this.spawn == undefined) {
        var conts = this.pos.findInRange(FIND_MY_SPAWNS, 1);
        if (conts.length == 0) {
            this.spawn = false;
        } else {
            this.spawn = conts[0];
        }
        
    }
    return this.spawn;
}

StructureLink.prototype.getStorage = function() {
    
    if (this.storage == undefined) {
        var conts = this.pos.findInRange(FIND_STRUCTURES, 2, {filter:function(s) {return s.structureType == STRUCTURE_STORAGE && s.progressTotal == undefined}});
        if (conts.length == 0) {
            this.storage = false;
        } else {
            this.storage = conts[0];
        }
    }
    return this.storage;
}