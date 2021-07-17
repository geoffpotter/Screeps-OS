/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.fArcher');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("role.fArcher");
logger.enabled = false;

var obj = function() {
}
var base = require('role.base');
obj.prototype = new base();

global.utils.extendFunction(obj, "init", function(name, roomManager, flag) {
    this._init(name, roomManager);
    this.flagName = flag.name;
    this.flagPos = flag.pos;
    this.workerCreepIds = [];
    this.requiredCreeps = 0;
});


global.utils.extendFunction(obj, "tickInit", function() {
    logger.log("tickinit", this.flagName, JSON.stringify(this.requiredCreeps))
        logger.log('-------------------------------------------',this.workerCreepIds , this.requiredCreeps)
        
    if (Game.flags[this.flagName]) {
        this.flagPos = Game.flags[this.flagName].pos;
    }
    if (this.workerCreepIds.length < this.requiredCreeps) {
        logger.log("spawnin")
        var minBodies =0;
        // if (this.roomManager.room.controller.level > 4) {
        //     minBodies = 3;
        // }
        //need some creeps
        
        var memory = {
            home: this.roomManager.roomName
        };
        
        var priority = 12;
        if (this.numCreeps == 0)
            priority = 120;
        var req = global.utils.makeCreepRequest(this.name, "workerCreepIds",[RANGED_ATTACK, RANGED_ATTACK, MOVE, MOVE], [MOVE, RANGED_ATTACK], priority, memory, 50, minBodies);
        req.important = true;
        logger.log(JSON.stringify(req))
        global.empire.requestHelperCreep(this.roomManager.roomName, req);
        
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
    //logger.log(creep.name, this.flagPos)
    logger.log("starting", creep.name, this.flagPos)
    var flag = Game.flags[this.flagName];
    if (flag) {
        this.flagPos = Game.flags[this.flagName].pos;
    }
    creep.rangeAttackNearCreeps();
                var parkSpot = this.flagPos;
    var creepsClose = creep.pos.findClosestByPath(this.roomManager.hostiles);
    creepsClose = creep.pos.getRangeTo(creepsClose) < 7;
    logger.log(creepsClose, creep.pos.roomName == this.roomManager.roomName)
    if (creep.pos.roomName == this.roomManager.roomName) {
        logger.log("hostiles:", this.roomManager.hostiles.length)
        if (creepsClose && this.roomManager.hostiles.length > 0 ) {
            var hostile = false;
            if (this.roomManager.meleeCreeps.length > 0) {
                hostile = creep.pos.findClosestByPath(this.roomManager.meleeCreeps);
            } else if (this.roomManager.rangedCreeps.length > 0) {
                hostile = creep.pos.findClosestByPath(this.roomManager.rangedCreeps);
            } else if(this.roomManager.healerCreeps.length > 0) {
                hostile = creep.pos.findClosestByPath(this.roomManager.healerCreeps);
            } else {
                hostile = creep.pos.findClosestByPath(this.roomManager.hostiles)
            }
            logger.log(creep.name, hostile);
            if (hostile) {
                
                var keepAt = 4;
                
                if (creep.hits < creep.hitsMax) {
                    keepAt = 5;
                }
                
                if (creep.pos.inRangeTo(hostile, 4)) {
                    creep.rangedAttack(hostile);
                }
                if (creep.pos.inRangeTo(hostile, keepAt-1)) {
                    creep.flee(keepAt);
                } else {
                    if (creep.hits < creep.hitsMax) {
                        global.utils.moveCreep(creep, parkSpot);
                    } else {
                        logger.log(creep, hostile);
                        global.utils.moveCreep(creep, hostile);
                    }
                    
                }
                
            }
            
        } else {
var flags = this.roomManager.room.find(FIND_FLAGS, {filter: function(i) {
                return i.color = COLOR_RED && i.secondaryColor == COLOR_YELLOW;
            }});
            var target = false;
            if (flags.length > 0) {
                var itemsAll = this.roomManager.room.lookAt(flags[0].pos);
                var items = _.filter(itemsAll, function(s) {
                    logger.log(JSON.stringify(s))
                    return s.type="structure" && (s.structure || s.constructionSite);
                })
                if (items.length > 0) {
                    target = items[0];
                    if (target.constructionSite) {
                        target = target.constructionSite;
                    } else {
                        target = target.structure;
                    }
                }
                logger.log('----/////--', JSON.stringify(target), JSON.stringify(items));
                if (!target) {
                    flags[0].remove();
                }
            } else {
                var structs = this.roomManager.room.find(FIND_HOSTILE_STRUCTURES, {filter:function(s) {
                    return s.structureType != STRUCTURE_CONTROLLER;
                }});
            
                logger.log(this.name, '------here?', structs)
                if (structs.length>0) {
                    
                    var nonKeeper = _.filter(structs, function(s) {
                        return s.owner.ususername != "Source Keeper";
                    });
                    
                    var struct = creep.pos.findClosestByRange(nonKeeper);
                    target = struct;
                }
            }
            if (target) {
                if (creep.pos.inRangeTo(target, 3)) {
                    var res = creep.rangedAttack(target);
                    logger.log("-======", creep.name, res, creep.getActiveBodyparts(ATTACK), JSON.stringify(creep.body))
                } else {
                    global.utils.moveCreep(creep, target);
                }
            } else {
                var parkSpot = this.flagPos;
               
                if (!creep.pos.isNearTo(parkSpot)) {
                    global.utils.moveCreep(creep, parkSpot);
                }
            }
            
        }
    } else {
        var parkSpot = this.flagPos;
        global.utils.moveCreep(creep, parkSpot)
    }
    
    
}

obj.prototype.attackShit = function(creep) {
    
}

module.exports = obj;