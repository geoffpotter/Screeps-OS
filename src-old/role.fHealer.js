/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.fHealer');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("role.fHealer");
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
    //logger.log("tickinit", this.flagName, JSON.stringify(this.requiredCreeps))
        //logger.log('-------------------------------------------',this.workerCreepIds , this.requiredCreeps)
        
    if (Game.flags[this.flagName]) {
        this.flagPos = Game.flags[this.flagName].pos;
    }
    if (this.workerCreepIds.length < this.requiredCreeps) {
        logger.log("spawnin")
        var minBodies = 0;
        // if (this.roomManager.room.controller.level > 4) {
        //     minBodies = 3;
        // }
        //need some creeps
        
        var memory = {
            home: this.roomManager.roomName
        };
        
        var priority = 11;
        if (this.numCreeps == 0)
            priority = 200;
        var req = global.utils.makeCreepRequest(this.name, "workerCreepIds", [HEAL, HEAL, MOVE, MOVE], [MOVE, HEAL], priority, memory, 50, minBodies);
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

obj.prototype.runCreep = function(creep) {
    //logger.log(creep.name, this.flagPos)
    
    var moveOpts = {keepFromHostiles: 5};
    
    var flag = Game.flags[this.flagName];
    if (flag) {
        this.flagPos = Game.flags[this.flagName].pos;
    }
    
    var parkSpot = this.flagPos;
    
    if (creep.pos.roomName == this.roomManager.roomName) {
       var friends = creep.room.find(FIND_MY_CREEPS, {filter: function(c){
           logger.log(c.name, c.hits , c.hitsMax)
           return c.hits <c.hitsMax && creep.name != c.name;
       }});
       
       if (creep.hits < creep.hitsMax) {
           creep.heal(creep);
       }
       
       if (friends.length > 0 ) {
           var closeFriend = creep.pos.findClosestByPath(friends);
           if (closeFriend) {
               if (creep.pos.isNearTo(closeFriend)) {
                   logger.log(creep.body, creep.heal(closeFriend));
               }
               if (creep.pos.inRangeTo(closeFriend, 4)) {
                   //logger.log(creep.name, 'healing', closeFriend.name)
                   logger.log(creep, creep.rangedHeal(closeFriend));
               }
               
               if (!creep.flee(4)) {
                   if (!creep.pos.isNearTo(closeFriend)) {
                       global.utils.moveCreep(creep, closeFriend, moveOpts);
                   }
               }
               
           } else {
               logger.log('----------------You might be an idiot-----------------')
           }
       } else {
           friends = creep.room.find(FIND_MY_CREEPS, {filter: function(c){
               //logger.log(c.name, c.hits , c.hitsMax)
               return c.getActiveBodyparts(RANGED_ATTACK) > 0 || c.getActiveBodyparts(ATTACK) > 0;
           }});
           
           if (friends.length > 0 ) {
               var closeFriend = creep.pos.findClosestByPath(friends);
               if (closeFriend) {
                   global.utils.moveCreep(creep, closeFriend, moveOpts)
               } 
           }else {
                   global.utils.moveCreep(creep, parkSpot, moveOpts)
               }
       }
       
    } else {
        global.utils.moveCreep(creep, parkSpot, moveOpts)
    }
    
    
}
obj.prototype.runCreep = function(creep) {
    logger.log(creep.name, this.flagPos, this.roomManager.roomName)
    
    var flag = Game.flags[this.flagName];
    if (flag) {
        this.flagPos = Game.flags[this.flagName].pos;
    }
    var parkSpot = this.flagPos;
    logger.log("starting", creep.name);
    
    if (creep.pos.roomName == this.roomManager.roomName) {
        logger.log(creep.name, "in room")
        //find where we want to move to
        var moveTarget = this.flagPos;
        var friends = creep.room.find(FIND_MY_CREEPS, {filter: function(c){
            //logger.log(c.name, c.hits , c.hitsMax)
            return c.hits <c.hitsMax && creep.name != c.name;
        }});
        if (friends.length > 0) {
            moveTarget = creep.pos.findClosestByRange(friends);
        }
        //safeDistance, range, fleeHealth
        creep.holdPosition(moveTarget, 4, 1, 0.99)
        //
    } else {
        logger.log(creep.name, "moving to flag");
        global.utils.moveCreep(creep, this.flagPos);
    }
    if (!creep.healSelf()) {
        creep.healCreepsNearMe();
    }
}
obj.prototype.attackShit = function(creep) {
    
}

module.exports = obj;