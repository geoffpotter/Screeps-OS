/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('manager.remoteMiningRoom');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("manager.remoteMiningRoom");
logger.enabled = false;
var obj = function() {
}
var base = require('manager.baseRoom');
obj.prototype = new base();


global.utils.extendFunction(obj, "init", function(targetRoomName) {
    this._init(targetRoomName);
    this.targetRoomName = targetRoomName;
    this.remoteEnergyTarget = true;
    
    //var roleClasses = global.utils.getRoleClasses();

    //order here affects spawn order
    //this.roleObjects["reserver"] = new roleClasses.reserver();
    //this.roleObjects["reserver"].init("reserver", this.targetRoomName, this.homeRoomManager);
    this.createRoles();
    
});

global.utils.extendFunction(obj, "tickInit", function() {

    //logger.log(this.targetRoomName, "-------------tickInit")
    this.createRoles();
    this._tickInit();
    
    // if (!this.homeRoomManager.buildingManager.buildEnabledFlag && this.room.memory) {
    //     this.room.memory.initDone = false;
    // }
    
    this.logEnergyInRoom();
    logger.log(this.roomName, "stuff in room E:", this.energyOnGround, this.energyInRoom, " m:",this.mineralsOnGround, this.mineralsInRoom)
    //logger.log('--------------------------', this.visibility && !this.room.memory.initDone , this.homeRoomManager.buildingManager.buildEnabledFlag)
    //this.room.memory.initDone = false;
    // if (this.visibility && !this.room.memory.initDone) {
    //     //var spawn = this.homeRoomManager.getAvailableSpawn();
    //     var spawn = this.room.controller.pos.findClosestByRange(Game.spawns);
    //     if (spawn) {
            
    //         if (this.sourceFlags.length) {
    //             for(var f in this.sourceFlags) {
    //                 var flag = this.sourceFlags[f]
    //                 var path = global.utils.findPath(spawn, flag);
    //                 global.utils.drawPath(path.path, "white");
    //                 empire.roomManagers[spawn.room.name].buildingManager.addRoadsToPath(path.path);
    //                 empire.roomManagers[spawn.room.name].buildingManager.buildPlan.containers.push(path.path[path.path.length-1])
    //             }
    //             this.room.memory.initDone = true;
    //         }
    //     }
        
        
        
    // }
});

global.utils.extendFunction(obj, "tick", function() {
    this._tick();
});

global.utils.extendFunction(obj, "tickEnd", function() {
    this._tickEnd();
});

obj.prototype.createRoles = function() {
    this.mapFlags();
    
    
    
    if (!this.roleObjects["workerNextRoom"]) {
            
        var roleClasses = global.utils.getRoleClasses();
        //order here affects spawn order
        this.roleObjects["workerNextRoom"] = new roleClasses.workerNextRoom();
        this.roleObjects["workerNextRoom"].init("workerNextRoom", this);
    }

    
    if (this.reserverFlag) {
        var roleName = "reserver";
        if (!this.roleObjects[roleName]) {
            
            var roleClasses = global.utils.getRoleClasses();
            this.roleObjects[roleName] = new roleClasses.reserver();
            this.roleObjects[roleName].init("reserver", this.roomName, this);
        }
    }
}

obj.prototype.mapFlags = function() {
    this.sourceFlags = [];
    this.reserverFlag = false;
    for(var i in Game.flags) {
        var flag = Game.flags[i];
        if (flag.pos.roomName == this.targetRoomName) {
            if (flag.color == COLOR_YELLOW && flag.secondaryColor == COLOR_YELLOW) {
                this.sourceFlags.push(flag);
            }
            if (flag.color == COLOR_GREEN && flag.secondaryColor == COLOR_PURPLE) {
                this.reserverFlag = flag;
            }
        }
        
    }
}

module.exports = obj;