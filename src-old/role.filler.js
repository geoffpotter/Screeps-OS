/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.filler');
 * mod.thing == 'a thing'; // true
 */


var logger = require("screeps.logger");
logger = new logger("role.filler");


var obj = function() {
}
var base = require('role.worker');
obj.prototype = new base();

global.utils.extendFunction(obj, "init", function(name, roomManager) {
    this._init(name, roomManager);
    
    this.allowMining = false;
    this.requiredCreeps = 0;
});

global.utils.extendFunction(obj, "tickInit", function() {
    if (this.roomManager.room.controller.level >= 2 && this.roomManager.room.energyCapacityAvailable >= 500) {
        this.requiredCreeps = 1;
    }
    // if (this.roomManager.room.controller.level >= 4) {
    //     this.requiredCreeps = 2;
    // }
    if (this.roomManager.remoteMode) {
        this.requiredCreeps = 1;
    }
    if (this.workerCreepIds.length < this.requiredCreeps) {
        //need some creeps
        var minBodies = 1;
        
        if (this.roomManager.creepCrisis()) {
            minBodies = 0;
        }
        
        var priority = 4;
        if (this.numCreeps == 0)
            priority = 160;
        var req = global.utils.makeCreepRequest(this.name, "workerCreepIds", [CARRY, CARRY, MOVE], [CARRY, CARRY, MOVE], priority, false, 30, minBodies)
        req.useMaxEnergy = true;
        this.roomManager.requestCreep(req);
        return;
    }
});

global.utils.extendFunction(obj, "tick", function() {
    this._tick();
});

global.utils.extendFunction(obj, "tickEnd", function() {
});

obj.prototype.getEnergy = function(creep) {
    //logger.log("---===----",creep);
    

    if (!creep.getEnergyFromSpawnContainers()) {
        if (!creep.getEnergyFromAnywhere()) {
            if (!creep.pickupEnergy()) {
                logger.log(creep.name, "Cant find energy")
                return false
            }
        }
    }

    return true;
}

obj.prototype.doWork = function(creep) {

    if (!creep.stashEnergyInSpawns()) {
        if (!creep.stashEnergyInTowers()) {
            logger.log(this.name, creep.pos.roomName, 'nothing to do')
            creep.memory.doneWorking = true;
        }
        
    }


}

module.exports = obj;