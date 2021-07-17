/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.worker');
 * mod.thing == 'a thing'; // true
 */



var logger = require("screeps.logger");
logger = new logger("role.worker");
logger.enabled = false;

var obj = function() {
}
var base = require('role.base');
obj.prototype = new base();

global.utils.extendFunction(obj, "init", function(name, roomManager) {
    this.__init(name, roomManager);
    
    this.workerCreepIds = [];
    this.requiredCreeps = 5;
    this.allowMining = true;
    
}, "__");


global.utils.extendFunction(obj, "tickInit", function() {
    logger.log("num", this.name, this.workerCreepIds.length, this.requiredCreeps, this.roomManager.room.name)
    if (this.roomManager.visibility && this.roomManager.room.controller.level > 3) {
        this.requiredCreeps = 2;
    }
    if (this.roomManager.visibility && this.roomManager.room.controller.level > 5 || this.roomManager.room.storage) {
        this.requiredCreeps = 1;
    }  
    if (this.roomManager.remoteMode) {
        this.requiredCreeps = 1;
    }
    if (this.workerCreepIds.length < this.requiredCreeps) {
        var minBodies = 0;
        // if (this.roomManager.room.controller.level > 4) {
        //     minBodies = 3;
        // }
        //need some creeps
        var priority = 20;
        if (this.numCreeps == 0)
            priority = 250;
        var req = global.utils.makeCreepRequest(this.name, "workerCreepIds", [MOVE, MOVE, CARRY, WORK], [MOVE, CARRY, WORK], priority, false, 5, minBodies)
        
        this.roomManager.requestCreep(req);
        return;
    }
}, "__");

global.utils.extendFunction(obj, "tick", function() {

    for(var i in this.workerCreepIds) {
        var creep = Game.creeps[this.workerCreepIds[i]];
        if (creep) {
            this.runCreep(creep);
        } else {
            logger.log("mofo died",this.workerCreepIds[i])
            delete this.workerCreepIds[i];
        }
        
    }
}, "__");

global.utils.extendFunction(obj, "tickEnd", function() {
}, "__");




obj.prototype.runCreep = function(creep) {
    //logger.log(creep);
    if (creep.flee(5)) {
        return;
    }


    var isHelper = creep.memory.helperCreep && (this.homeOverride && creep.room.name != this.homeOverride);
    if (isHelper || creep.pos.roomName != creep.memory.home) {
        logger.log(creep.name, creep.memory.home)
        var centerOfHomeRoom = new RoomPosition(25, 25, creep.memory.home);
        //logger.log("helper creep moving", centerOfHomeRoom, creep.memory.home)
        global.utils.moveCreep(creep, centerOfHomeRoom);
        return;
    } else if (isHelper) {
        var centerOfHomeRoom = new RoomPosition(25, 25, creep.memory.home);
        //logger.log("helper creep moving", centerOfHomeRoom, creep.memory.home)
        global.utils.moveCreep(creep, centerOfHomeRoom);
        creep.memory.helperCreep = false;
        return;
    }
    
    
    
    //creep.say(this.allowMining && creep.memory.mining && !creep.full())
    if ((this.allowMining && creep.memory.mining && !creep.full()) || creep.empty() || (creep.memory.doneWorking && !creep.full())) {
        //creep.memory.mining = false;
        if (!this.getEnergy(creep)) {
            if (this.allowMining && creep.mineEnergyFromSource()) {
                creep.memory.mining = true;
                //try mining
                //
            } else {
                logger.log(creep.name, creep.memory.role, "can't find energy")
            }
        }
        
    } else {
        creep.memory.mining = false;
        creep.memory.doneWorking = false;
        //do work
        this.doWork(creep);
        
    }
}

obj.prototype.doWork = function(creep) {
    if (!creep.stashEnergyInTowersEmergency()) {
        var fillSpawns = false;
        if (this.roomManager.creepsInBaseRole("fillers") == 0 || creep.memory.role == "fillers" || this.roomManager.room.energyAvailable < this.roomManager.room.energyCapacityAvailable * 0.5) {
            fillSpawns = true;
        }
        if (!fillSpawns || !creep.stashEnergyInSpawns()) {
            if (!creep.stashEnergyInSpawnContainers()) {
                
                if (creep.memory.skipConstruction == undefined) {
                    creep.memory.skipConstruction = true;
                }
                if (this.roomManager.room.controller.level < 2 || this.roomManager.room.controller.ticksToDowngrade < 1000) {
                    creep.memory.skipConstruction = true;
                }
                if (creep.memory.skipConstruction && this.roomManager.room.controller.ticksToDowngrade > 2000) {
                    creep.memory.skipConstruction = false;
                }
                if (creep.memory.skiskipConstruction || (!creep.doConstruction() && !creep.doRepair())) {
                    if (!creep.stashEnergyInTowers()) {
                        if (!creep.doUpgrade()) {
                            logger.log(this.name, 'nothing to do')
                        }
                    }
                }
            }
        }
    }
}

obj.prototype.getEnergy = function(creep) {
    //logger.log(creep);
    
    if (!creep.pickupEnergy()) {
        if (!creep.getEnergyFromSourceContainers()) {
            return false;
        }
    }
    return true;
    
    
}


module.exports = obj;