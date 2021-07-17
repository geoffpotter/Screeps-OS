/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.builder');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("role.builder");


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
    var ourRoom = this.roomManager.room.name;
    var constSites = Game.constructionSites;
    var ourSites = _.filter(constSites, function(s) {
        //logger.log(ourRoom, s, s.room)
        return s.room && ourRoom == s.room.name
    });
    var numSites = _.size(ourSites);
        
    this.requiredCreeps = 2;
    if (this.roomManager.room.controller.level > 4) {
    this.requiredCreeps = 2;
    }
    if (this.roomManager.room.controller.level > 6) {
        this.requiredCreeps = 1;
    }   
    // if (this.roomManager.remoteMode) {
    //     this.requiredCreeps = 1;
    // }
    if (numSites > 5) {
        this.requiredCreeps *= 2;
        this.requiredCreeps = Math.ceil(this.requiredCreeps);
    }
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
        var req = global.utils.makeCreepRequest(this.name, "workerCreepIds", [WORK, CARRY, MOVE], [WORK, CARRY, MOVE], priority, memory, 10)
        
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

module.exports = obj;