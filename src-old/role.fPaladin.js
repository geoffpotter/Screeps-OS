/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.fPaladin');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("role.fguard");
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
        
        var priority = 21;
        if (this.numCreeps == 0)
            priority = 210;
        var req = global.utils.makeCreepRequest(this.name, "workerCreepIds", [HEAL, ATTACK, TOUGH, MOVE, MOVE, MOVE], [ATTACK, MOVE, TOUGH, MOVE, ATTACK, MOVE], priority, memory, 50, minBodies);
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
    var iscreepsClose = creepsClose == true;
    if (this.attackRange > 0) {
        iscreepsClose = creep.pos.getRangeTo(creepsClose) < this.attackRange;
    }
    
    
    
    if (creep.pos.roomName == this.roomManager.roomName) {
        logger.log(creep.name, "in room", iscreepsClose)
        //find where we want to move to
        var moveTarget = this.flagPos;
        if (iscreepsClose) {
            moveTarget = creepsClose;
        }
        logger.log(moveTarget);
        //safeDistance, range, fleeHealth
        if (!creep.holdPosition(moveTarget, 4, 1, 0.7)) {
            
        }
        //
    } else {
        logger.log(creep.name, "moving to flag");
        global.utils.moveCreep(creep, this.flagPos);
    }

    if (!creep.healCreepsNearMe(false, true)) {
        
        creep.healSelf()
    }
    
    creep.attackNearCreeps();
    creep.rangeAttackNearCreeps();
}


module.exports = obj;