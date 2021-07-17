/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.fguard');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("role.fguard");
//logger.enabled = false;

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
        
        var priority = 11;
        if (this.numCreeps == 0)
            priority = 110;
        var req = global.utils.makeCreepRequest(this.name, "workerCreepIds", [ATTACK, ATTACK, ATTACK, MOVE, MOVE, MOVE], [MOVE, ATTACK], priority, memory, 50, minBodies);
        req.important = true;
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
    logger.log(creep.name, this.flagPos, this.roomManager.roomName)
    
    var flag = Game.flags[this.flagName];
    if (flag) {
        this.flagPos = Game.flags[this.flagName].pos;
    }
    var parkSpot = this.flagPos;
    logger.log("starting", creep.name)
    var creepsClose = creep.pos.findClosestByPath(this.roomManager.hostiles);
    creepsClose = creep.pos.getRangeTo(creepsClose) < 7;
    
                creep.attackNearCreeps()
    //creepsClose = false;
    if (creep.pos.roomName == this.roomManager.roomName) {
        if (creepsClose && this.roomManager.hostiles.length > 0 ) {
            var hostile = false;
            if (this.roomManager.meleeCreeps.length > 0) {
                hostile = creep.pos.findClosestByRange(this.roomManager.meleeCreeps);
            } else if (this.roomManager.rangedCreeps.length > 0) {
                hostile = creep.pos.findClosestByRange(this.roomManager.rangedCreeps);
            } else if (this.roomManager.healerCreeps.length > 0) {
                hostile = creep.pos.findClosestByRange(this.roomManager.rangedCreeps);
            }   else {
                hostile = creep.pos.findClosestByRange(this.roomManager.hostiles);
            }
            if (hostile) {
                if (creep.pos.isNearTo(hostile)) {
                    creep.attack(hostile);
                }
                logger.log(creep, hostile);
                if (creep.shouldFlee(0.3)) {
                    if (!creep.flee(4)) {
                        
                    }
                } else {
                    global.utils.moveCreep(creep, hostile);
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
            } else {
                var structs = this.roomManager.room.find(FIND_HOSTILE_STRUCTURES,{filter:function(s) {
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
                if (creep.pos.isNearTo(target)) {
                    var res = creep.attack(target);
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
        global.utils.moveCreep(creep, parkSpot)
    }
    
    
}

obj.prototype.attackShit = function(creep) {
    
}

module.exports = obj;