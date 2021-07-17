/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.fMage');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("role.fMage");
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
    this.attackRange = 14;
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
            priority = 210;
        var req = global.utils.makeCreepRequest(this.name, "workerCreepIds", [HEAL, RANGED_ATTACK, MOVE, MOVE], [MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE, HEAL], priority, memory, 50, minBodies);
        req.important = true;
        req.useMaxEnergy = true;
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

obj.prototype.getTarget = function(creep) {
    logger.log('------', creep)
    if (!creep) {
        logger.log("no creep..")
        return false;
    }
    var creeps = this.roomManager.hostilesByFlags(5);
    logger.log("creeps", creeps)
    var creepsClose = false;
    if (creeps && creep) {
        creepsClose = creep.pos.findClosestByPath(creeps);
    }
    if (!creepsClose) {
        creepsClose = creep.pos.findClosestByPath(this.roomManager.hostiles);
        if (this.attackRange > 0) {
            creepsClose = (creep.pos.getRangeTo(creepsClose) < this.attackRange) ? creepsClose : false;
        }
    }
    if (!creepsClose) {
        logger.log("--",this.roomManager)
        var flags = global.utils.flagsByColor(this.roomFlags, COLOR_RED, COLOR_YELLOW);
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
            if (target) {
                creepsClose = target;
            }
        }
    }
    return creepsClose;
}

obj.prototype.runCreep = function(creep) {
    logger.log(creep.name, this.flagPos, this.roomManager.roomName)
    
    var flag = Game.flags[this.flagName];
    if (flag) {
        this.flagPos = Game.flags[this.flagName].pos;
    }
    var parkSpot = this.flagPos;
    logger.log("starting", creep.name)
    var creepsClose = this.getTarget(creep)
    
    
    if (creep.pos.roomName == this.roomManager.roomName) {
        logger.log(creep.name, "in room")
        //find where we want to move to
        var moveTarget = this.flagPos;
        //find where we want to move to
        var moveTarget = this.flagPos;
        if (creepsClose) {
            moveTarget = creepsClose;
        }
        //safeDistance, range, fleeHealth
        creep.holdPosition(moveTarget, 6, creepsClose ? 3 : 1, 0.7)
        //
    } else {
        logger.log(creep.name, "moving to flag");
        global.utils.moveCreep(creep, this.flagPos);
    }
    if (!creep.healSelf()) {
        creep.healCreepsNearMe(false);
    }
    creep.rangeAttackNearCreeps();
}


module.exports = obj;