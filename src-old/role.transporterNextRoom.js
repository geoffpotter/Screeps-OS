/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.transporterNextRoom');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("role.transporterNextRoom");


var obj = function() {
}
var base = require('role.workerNextRoom');
obj.prototype = new base();

global.utils.extendFunction(obj, "init", function(name, roomManager, homeRoomManager) {
    this._init(name, roomManager, homeRoomManager);
    this.homeRoomManager = homeRoomManager;
    this.allowMining = false;
    this.requiredCreeps = 1;
    this.workInHomeRoom = true;
});

global.utils.extendFunction(obj, "tickInit", function() {
    //logger.log("num", this.visibility, this.name, this.workerCreepIds, this.roomManager.roomName, this.homeRoomManager.roomName)
    if (!this.roomManager.visibility) {
        return;
    }
    var sites = this.homeRoomManager.room.find(FIND_MY_CONSTRUCTION_SITES);

    
    if (this.workerCreepIds.length < this.requiredCreeps) {
        //need some creeps
        var minBodies = 0;
        if (this.homeRoomManager.room.controller.level > 4) {
            minBodies = 5;
        }
        var memory = {
            home: this.roomManager.roomName
        }
        var priority = 2;
        if (this.numCreeps == 0)
            priority = 12;
        var req = global.utils.makeCreepRequest(this.name, "workerCreepIds", [CARRY, CARRY, MOVE], [CARRY, CARRY, MOVE], priority, memory, 20, minBodies)
        //logger.log(this.homeRoomManager)
        this.homeRoomManager.requestCreep(req);
        return;
    }
});

global.utils.extendFunction(obj, "tick", function() {
    this._tick();
});

global.utils.extendFunction(obj, "tickEnd", function() {
});


obj.prototype.doWork = function(creep) {

    if (!creep.stashEnergyInSpawnContainers()) {
        if (!creep.stashEnergyInTowersEmergency()) {
            if (!creep.stashEnergyInStorage()) {
                logger.log(this.name, creep.pos.roomName, 'nothing to do')
                creep.memory.doneWorking = true;
            }
        }
    }

}

module.exports = obj;