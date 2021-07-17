/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.guard');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("role.guard");
logger.enabled = false;

var obj = function() {
}
var base = require('role.base');
obj.prototype = new base();

global.utils.extendFunction(obj, "init", function(name, roomManager, targetRoom) {
    this._init(name, roomManager);
    this.targetRoom = targetRoom;
    if (!targetRoom) {
        this.targetRoom = roomManager.roomName;
    }
    this.workerCreepIds = [];
    this.requiredCreeps = 0;
});


global.utils.extendFunction(obj, "tickInit", function() {
    logger.log("tickinit", JSON.stringify(this.requiredCreeps))
        logger.log('-------------------------------------------',this.workerCreepIds , this.requiredCreeps)
    if (this.workerCreepIds.length < this.requiredCreeps) {
        logger.log("spawnin")
        var minBodies = 0;
        // if (this.roomManager.room.controller.level > 4) {
        //     minBodies = 3;
        // }
        //need some creeps
        
        var memory = {
            home: this.targetRoom
        };
        
        var priority = 13;
        if (this.numCreeps == 0)
            priority = 100;
        var req = global.utils.makeCreepRequest(this.name, "workerCreepIds", [ATTACK, ATTACK, MOVE, MOVE], [MOVE, ATTACK], priority, memory, 50, minBodies);
        req.important = true;
        //if (!this.roomManager.requestCreep) {
        //    global.empire.requestHelperCreep(this.roomManager.roomName, req);
        //} else {
            this.roomManager.requestCreep(req);
        //}
        return;
    }
});

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
});

global.utils.extendFunction(obj, "tickEnd", function() {
});

obj.prototype.runCreep = function(creep) {
    //logger.log(creep.name, this.targetRoom, this.roomManager.hostiles.length)
    
    var parkSpot = new RoomPosition(25, 25, this.targetRoom);
    if (Memory.rooms[this.roomManager.roomName].lastHostilePos) {
        var pos = Memory.rooms[this.roomManager.roomName].lastHostilePos;
        parkSpot = new RoomPosition(pos.x, pos.y, pos.roomName);
    }
    
    var tower = creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {filter: function(s) {return s.structureType == STRUCTURE_TOWER && s.energy > 300}});
    //logger.log(creep.name, tower, creep.pos.getRangeTo(tower));
    if (creep.hits < creep.hitsMax) {
        
        
        if (tower) {
            parkSpot = tower.pos;
        }
        
    }
    
    if (creep.pos.roomName == this.targetRoom) {
        //logger.log(creep.name, tower)
        if (tower && creep.hits < creep.hitsMax*0.75 && (creep.pos.getRangeTo(tower) >= 7)) {
            if (creep.pos.getRangeTo(tower) > 6) {
                global.utils.moveCreep(creep, tower);
            }
            
        } else {
            if (this.roomManager.hostiles.length > 0 ) {
                var attackables = creep.pos.findInRange(this.roomManager.hostiles, 1);
                if (attackables) {
                    creep.attack(attackables[0]);
                }
                var hostile = creep.pos.findClosestByRange(this.roomManager.hostiles);
                if (hostile) {
                    if (creep.pos.isNearTo(hostile)) {
                        
                    }
                    logger.log(creep, hostile);
                global.utils.moveCreep(creep, hostile);
                }
                
            } else {
                
            logger.log(creep.name, "not here------------------")
                if (!creep.pos.isNearTo(parkSpot)) {
                    global.utils.moveCreep(creep, parkSpot);
                }
            }
        }
    } else {
        global.utils.moveCreep(creep, parkSpot)
    }
    
    
}

module.exports = obj;