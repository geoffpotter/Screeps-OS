/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.worker');
 * mod.thing == 'a thing'; // true
 */



var logger = require("screeps.logger");
logger = new logger("role.workerNextRoom");
logger.enabled = false;

var obj = function() {
}
var base = require('role.base');
obj.prototype = new base();

global.utils.extendFunction(obj, "init", function(name, roomManager) {
    this.__init(name, roomManager);
    this.workerCreepIds = [];
    this.requiredCreeps = 1;
    this.allowMining = true;
    this.workInHomeRoom = false;
    this.dangerZone = false;
    
}, "__");


global.utils.extendFunction(obj, "tickInit", function() {
    logger.log("num", this.name, this.workerCreepIds.length, this.requiredCreeps, this.roomManager.roomName)

    if (this.workerCreepIds.length < this.requiredCreeps) {
        var minBodies = 0;
        // if (this.roomManager.room.controller.level > 4) {
        //     minBodies = 3;
        // }
        //need some creeps
        var memory = {
            home: this.roomManager.roomName
        }
        
        
        var priority = 0;
        if (this.numCreeps == 0)
            priority = 10;
        var req = global.utils.makeCreepRequest(this.name, "workerCreepIds", [MOVE, MOVE, CARRY, WORK], [MOVE, MOVE, CARRY, WORK], priority, memory, 3, minBodies)
        
        global.empire.requestHelperCreep(this.roomManager.roomName, req);
        
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
    logger.log(creep);
    if (!this.dangerZone || !creep.flee(6)) {
        if ((this.allowMining && creep.memory.mining && !creep.full()) || creep.empty()) {
            //creep.memory.mining = false;
            
            if (creep.pos.roomName == this.roomManager.roomName) {
                logger.log(creep.name, "in room")
                if (!this.getEnergy(creep)) {
                    logger.log(creep.name, "can't getEnergy()", this.allowMining)
                    creep.memory.mining = true;
                    if (!this.allowMining || !creep.mineEnergyFromSource()) {
                        //try mining
                        logger.log(this.name, "can't find energy")
                        global.utils.moveCreep(creep, new RoomPosition(25, 25, this.roomManager.roomName));
                    }
                }
            } else {
                global.utils.moveCreep(creep, new RoomPosition(25, 25, this.roomManager.roomName));
            }
            
            
            
        } else {
            creep.memory.mining = false;
            //do work
            if (this.workInHomeRoom && creep.pos.roomName != this.homeRoomManager.roomName) {
                //go to home room
                global.utils.moveCreep(creep, new RoomPosition(25, 25, this.homeRoomManager.roomName));
            } else {
                this.doWork(creep);
            }
            
        }
    }
}

obj.prototype.doWork = function(creep) {
    if (!creep.doConstruction(true)) {
        if (!creep.doRepair()) {
            logger.log(this.name, 'nothing to do')
        }
    }
    
    

}

obj.prototype.getEnergy = function(creep) {
    //logger.log(creep);
    
    if (!creep.pickupEnergy()) {
        if (!creep.getEnergyFromSourceContainers()) {
            return false
        }
    }
    return true;
    
    
}


module.exports = obj;