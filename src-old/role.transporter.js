/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.transporter');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("role.transporter");
//logger.enabled = false;

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
    if (this.roomManager.room.controller.level >= 2) {
        //set required creeps
        var remoteResourceTotals = this.roomManager.getResourcesInRemoteTargets();
        var resourcePoints = 0;
        for(var resource in remoteResourceTotals) {
            var amt = remoteResourceTotals[resource];
            switch (resource) {
                case "energyOnGround":
                    resourcePoints += amt * 2;
                    break;
                case "mineralsOnGround":
                    resourcePoints += amt * 3;
                    break;
                default:
                    resourcePoints += amt;
                    break;
            }
        }
        var divider = 4000;
        if (global.empire.higestRCL() <= 3) {
            divider = 500;
        }
        var creepLimit = 15;
        if (global.empire.higestRCL() <= 4) {
            creepLimit = 10;
        }
        if (Game.cpu.bucket < 1000) {
            creepLimit = 5;
        }
        this.requiredCreeps = Math.min(Math.ceil(resourcePoints / divider), creepLimit);
        this.requiredCreeps = Math.min(this.requiredCreeps, this.roomManager.room.controller.level > 5 ? 10 : 20);
        // if (Game.cpu.bucket < 9000) {
        //     this.requiredCreeps = 1;
        // }
        //logger.log(JSON.stringify(remoteResourceTotals))
        logger.log(this.roomManager.roomName, "remote resource pts", resourcePoints, ' req creeps:', this.requiredCreeps, divider)
    }
    
    if (this.workerCreepIds.length < this.requiredCreeps) {
        //need some creeps
        var minBodies = 0;
        if (this.roomManager.room.controller.level > 4) {
            minBodies = 5;
        } else {
            minBodies = this.roomManager.room.controller.level;
        }
        
        var priority = 11;
        if (this.numCreeps == 0)
            priority = 90;
        if (this.numCreeps > this.requiredCreeps * 0.5)
            priority = -1;
        var req
        // if (this.roomManager.room.controller.level > 5) {
        //     req = global.utils.makeCreepRequest(this.name, "workerCreepIds", [CARRY, CARRY, MOVE], [CARRY, CARRY, MOVE], priority, false, 20, minBodies)
        // } else {
            req = global.utils.makeCreepRequest(this.name, "workerCreepIds", [CARRY, MOVE], [CARRY, MOVE], priority, false, 20, minBodies)
        //}
        this.roomManager.requestCreep(req);
        return;
    }
});

global.utils.extendFunction(obj, "tick", function() {
    this._tick();
});

global.utils.extendFunction(obj, "tickEnd", function() {
});




obj.prototype.runCreep = function(creep) {
    //logger.log(creep, creep.full);
    //transporting means we're taking energy back home
    if (creep.memory.transporting != true && creep.full()) {
        creep.memory.transporting = true;
        creep.memory.targetContainer = false;
    }
    if (creep.memory.transporting != false && creep.empty()) {
        creep.memory.transporting = false;
        //reset target room after drop off
        creep.memory.targetRoom = false;
    }
    
    
    if (creep.memory.transporting == false && !creep.memory.targetRoom) {
        var targetRoom = this.roomManager.getNextRemoteEnergyTarget();
        logger.log('next target', targetRoom)
        creep.memory.targetRoom = targetRoom;
    }
    //creep.memory.targetContainer = false;
    if (creep.memory.transporting == true && !creep.memory.targetContainer) {
        
        var ignoreSpawnConts = creep.hasNotEnergy();
        var targetCont = this.roomManager.room.getNonFullStorage(ignoreSpawnConts);
        targetCont = _.sortBy(targetCont, (c) => _.sum(c.store));
        console.log("---/",targetCont, targetCont.length);
        if (targetCont.length > 0) {
            creep.memory.targetContainer = targetCont[0].id;
        } else {
            var targetCont = this.roomManager.room.controller.pos.findInRange(FIND_STRUCTURES, 4, {filter: (s) => logger.log("-----!!!!!!!!!----",s.id, creep.memory.pickupTargetId) && s.structureType == STRUCTURE_CONTAINER && _.sum(s.store) < s.storeCapacity && s.id != creep.memory.pickupTargetId});
            if (targetCont.length > 0) {
                creep.memory.targetContainer = targetCont[0].id;
            } else {
                creep.memory.targetContainer = this.roomManager.room.controller.id;
            }
        }
    }
    
    
    if (creep.flee(5)) {
        creep.memory.repath;
        return;
    }
    
    if (creep.memory.transporting) {
        if (!creep.stashEnergyInTowers()) {
            //have energy, take it home, put somewhere
            var targetCont = Game.getObjectById(creep.memory.targetContainer);
            if (!targetCont) {
                creep.memory.targetContainer = false;
                return;
            }
            //logger.log(targetCont);
            if (
                (creep.memory.targetContainer ==  this.roomManager.room.controller.id && creep.pos.inRangeTo(targetCont, 4)) ||
                creep.pos.isNearTo(targetCont)
            ) {
                if (creep.memory.targetContainer ==  this.roomManager.room.controller.id) {
                    creep.dropAll();
                } else {
                    creep.transferAll(targetCont);
                    creep.memory.targetContainer = false;
                    creep.memory.pickupTargetId = false;
                }
                
            } else {
                global.utils.moveCreep(creep, targetCont)
            }
        }
    } else {
        logger.log(creep.memory.targetRoom);
        //need energy, go to target room and get some
        if (creep.room.name != creep.memory.targetRoom) {
            var opts = {
                ignoreCreeps: false,
                repath:creep.memory.repath,
                ignoreRoads: true,
                range: 20,
            }
            global.utils.moveCreep(creep, new RoomPosition(25, 25, creep.memory.targetRoom), opts);
        } else {
            if (!creep.flee(6)) {
                
                if (!this.getEnergy(creep)) {
                    logger.log(creep.name, "can't find energy");
                    creep.memory.targetRoom = false;
                }
            }
        }
    }
    
    
}



obj.prototype.getEnergy = function(creep) {
    var target = false;
    //creep.memory.targetId = false;
    if (!creep.memory.targetId) {
        var options = creep.room.getStuffForPickup();
        logger.log(creep.name, "--",JSON.stringify(options))
        options = _.sortBy(options, (o) => o.amount * 100 || _.sum(o.store));
        target = options[options.length-1]
        if (target) {
            creep.memory.targetId = target.id;
            creep.memory.pickupTargetId = target.id;
        } else {
            //nothing here, find a new room.
            creep.memory.targetRoom = false;
        }
    } else {
        target = Game.getObjectById(creep.memory.targetId);
    }
    
    //if (!creep.getMineralsFromContainers()) {
        if (target) {
            if (creep.pos.isNearTo(target)) {
                if (target instanceof Resource) {
                    creep.pickup(target);
                } else {
                    creep.withdrawAll(target);
                }
                creep.memory.targetId = false;
            } else {
                global.utils.moveCreep(creep, target)
            }
        } else {
            creep.memory.targetId = false;
            //creep.memory.pickupTargetId = false;
        }
    //}
    
    //logger.log(creep);
    // if (!creep.pickupStuff()) {
    //     if (!creep.getMineralsFromContainers()) {
    //         if (!creep.getStuffFromSourceContainers(false)) {
    //             return false;
    //         }
    //     }
    // }
    return true;
    
    
}

obj.prototype.doWork = function(creep) {

    //if (!creep.stashEnergyInSpawns()) {
        if (!creep.stashEnergyInSpawnContainers()) {
            if (!creep.stashEnergyInTowersEmergency()) {
                var spawnsFullness = creep.room.energyAvailable / creep.room.energyCapacityAvailable;
                var fillSpawns = spawnsFullness < 0.8;
                if (!fillSpawns || !creep.stashEnergyInSpawns()) {
                    if (!creep.stashEnergyInStorage()) {
                        if (!creep.stashEnergyInTowers()) {
                            logger.log(this.name, creep.pos.roomName, 'nothing to do')
                            creep.memory.doneWorking = true;
                        }
                    }
                }
            }
        }
    //}


}

module.exports = obj;