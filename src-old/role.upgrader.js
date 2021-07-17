/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.upgrader');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("role.upgrader");


var obj = function() {
}
var base = require('role.worker');
obj.prototype = new base();

global.utils.extendFunction(obj, "init", function(name, roomManager) {
    this._init(name, roomManager);
    
    
    this.requiredCreeps = 5;
});

global.utils.extendFunction(obj, "tickInit", function() {
    if (this.roomManager.room.controller.level >= 2) {
        this.requiredCreeps = 4;
    }
    if (this.roomManager.room.controller.level >= 5) {
        this.requiredCreeps = 3;
    }
    if (this.roomManager.room.controller.level >= 7) {
        this.requiredCreeps = 1;
    }    
    if (this.roomManager.remoteMode) {
        this.requiredCreeps = 1;
    }
    
    if (this.workerCreepIds.length < this.requiredCreeps) {
        //need some creeps
        var minBodies = 0;
        if (this.roomManager.room.controller.level > 4) {
            minBodies = 5;
        }
        var priority = 1;
        if (this.numCreeps == 0)
            priority = 100;
            
        var memory = {
            home: this.roomManager.roomName
        }
        var req = global.utils.makeCreepRequest(this.name, "workerCreepIds", [WORK, WORK, CARRY, MOVE], [WORK, WORK, CARRY, MOVE], priority, false, 5, minBodies)
        
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
    //logger.log(creep);
    
    if (!creep.getEnergyFromAnywhere()) {
        if (!creep.pickupEnergy()) {
            return false;
        }
    }
    return true;
    
    
}
obj.prototype.doWork = function(creep) {

    if (!creep.doUpgrade()) {
        logger.log(this.name, 'nothing to do')
        
    }

}

module.exports = obj;