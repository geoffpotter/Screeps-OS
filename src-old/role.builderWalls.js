/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.builderWalls');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("role.builderWalls");
logger.enabled = false

var obj = function() {
}
var base = require('role.worker');
obj.prototype = new base();

global.utils.extendFunction(obj, "init", function(name, roomManager, homeOverride) {
    this._init(name, roomManager);
    this.homeOverride = homeOverride;
    
    this.requiredCreeps = 2;
});

global.utils.extendFunction(obj, "tickInit", function() {
    this.walls = false;
    this.ramparts = false;
    if (this.roomManager.visibility) {
        this.walls = this.roomManager.room.find(FIND_STRUCTURES, {filter:(s) => s.structureType == STRUCTURE_WALL})
        this.ramparts = this.roomManager.room.find(FIND_STRUCTURES, {filter:(s) => s.structureType == STRUCTURE_RAMPART})
    }
    logger.log(this.roomManager.visibility, this.walls.length)
    
    
    var divider = 20;
    if (this.roomManager.room.controller.level > 4) {
        divider = 40;
    }
    this.requiredCreeps = Math.floor((this.walls.length + this.ramparts.length) / divider);
    // if (this.requiredCreeps < 2 && !this.roomManager.remoteMode) {
    //     this.requiredCreeps = 2;
    //     if (this.roomManager.room.controller.level > 5) {
    //         this.requiredCreeps = 1;
    //     }
    // }
    // if (this.roomManager.room.controller.level > 4) {
    // this.requiredCreeps = 2;
    // }
    // if (this.roomManager.room.controller.level > 7) {
    //     this.requiredCreeps = 1;
    // }   
    // if (this.roomManager.remoteMode) {
    //     this.requiredCreeps = 1;
    // }

    if (this.workerCreepIds.length < this.requiredCreeps) {
        var memory = false;
        if (this.homeOverride) {
            memory = {};
            memory.home = this.homeOverride;
            memory.helperCreep = true;
        }
        //need some creeps
        
        var priority = 10;
        if (this.numCreeps == 0)
            priority = 10;
        var req = global.utils.makeCreepRequest(this.name, "workerCreepIds", [WORK, CARRY, MOVE, MOVE], [WORK, CARRY, MOVE, MOVE], priority, memory, 10)
        
        this.roomManager.requestCreep(req);
        return;
    }
});

global.utils.extendFunction(obj, "tick", function() {
    this._tick();
});

global.utils.extendFunction(obj, "tickEnd", function() {
    this._tickEnd();
    //logger.log(this.homeOverride, this.name, this.requiredCreeps, this.workerCreepIds.length)
});


obj.prototype.doWork = function(creep) {
    
    var fillSpawns = false;
    if (this.roomManager.creepsInBaseRole("fillers") == 0 || creep.memory.role == "fillers") {
        fillSpawns = true;
    }
    if (!fillSpawns || !creep.stashEnergyInSpawns()) {
        if (!creep.doRepairRamparts()) {
            if (!creep.doRepairWalls()) {
                if (!creep.buildRamparts()) {
                    if (!creep.buildWalls()) {
                        if (!creep.doConstruction()) {
                            if (!creep.doRepair()) {
                                if (!creep.stashEnergyInSpawnContainers()) {
                                    if (!creep.doUpgrade()) {
                                        logger.log(this.name, 'nothing to do')
                                    }
                                }
                            }
                        }
                    }
                }    
            }
        }
        
    }
}

module.exports = obj;