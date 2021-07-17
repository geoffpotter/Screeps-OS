/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('prototype.creep');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("prototype.creep");


Creep.prototype.onEdge = function() {
    return this.pos.x == 0 || this.pos.y == 0 || this.pos.x == 49 || this.pos.y == 49;
}
Creep.prototype.byEdge = function() {
    return this.pos.x <= 3 || this.pos.y <= 3 || this.pos.x >= 47 || this.pos.y >= 47;
}
Creep.prototype.isHostile = function() {
    var notFriend = this.owner == undefined || 
        (this.owner.username != "RediJedi" 
        && this.owner.username != "MrMeseeks"
        && this.owner.username != "Jedislight"
        && this.owner.username != "leonyx");
    //logger.log(this, this.owner, this.owner.username, notFriend)
    return notFriend
        
        
}

Creep.prototype.hasEnergy = function() {
    return this.carry.energy > 0;
}
Creep.prototype.hasNotEnergy = function() {
    return (_.sum(this.carry) - this.carry.energy) > 0;
}


Creep.prototype.empty = function() {
    //logger.log(this.name, JSON.stringify(this.carry), _.sum(this.carry), this.carryCapacity)
    return _.sum(this.carry) == 0;
};

Creep.prototype.full = function() {
    //logger.log(this.name, JSON.stringify(this.carry), _.sum(this.carry), this.carryCapacity)
    return _.sum(this.carry) == this.carryCapacity;
};
Creep.prototype.fullEnough = function() {
    return _.sum(this.carry) > this.carryCapacity * 0.7;
};


Creep.prototype.transferTo = function(target, type, amt) {
    if (this.pos.isNearTo(target)) {
        for(const resourceType in this.carry) {
            if ((type == true && this.carry[resourceType] > 0) || resourceType == type) {
                var amt = Math.min(this.carry[resourceType], target.storeCapacity - _.sum(target.store))
                logger.log(this.name, resourceType, this.carry[resourceType])
                var ret = this.transfer(target, resourceType, amt);
                logger.log("----------------",this.name, type, ret, amt,  this.carry[resourceType])
                
            }
        }
        return true;
    } else {
        global.utils.moveCreep(this, target);
    }
    return false;
}
Creep.prototype.withdrawFrom = function(target, type, amt) {
    if (this.pos.isNearTo(target)) {
        if (target instanceof StructureLab) {
            var ret = this.withdraw(target, type, amt);
        } else {
            for(var resourceType in target.store) {
                
                if (type == true || resourceType == type) {
                    var ret = this.withdraw(target, resourceType, Math.min(amt, this.carryCapacity - _.sum(this.carry)));
                }
            }
        }
        logger.log(this.name, type, amt, ret)
        return true;
    } else {
        global.utils.moveCreep(this, target);
    }
    return false;
}

Creep.prototype.dropAll = function() {
    // drop all resources
    for(const resourceType in this.carry) {
        this.drop(resourceType);
    }
};
Creep.prototype.transferEnergy = function(target) {
    // transfer all resources
    
    //logger.log(this.name, "my store", JSON.stringify(this.store))
    var ret = this.transfer(target, RESOURCE_ENERGY);


};
Creep.prototype.transferAll = function(target, except) {
    // transfer all resources
    if (!except) 
        except = [];
        logger.log(this.name, "my store", JSON.stringify(this.store))
    for(const resourceType in this.carry) {
        logger.log(this.name, "xfer", resourceType, except.indexOf(resourceType))
        if (except.indexOf(resourceType) == -1) {
            var ret = this.transfer(target, resourceType);
        }
    }
};
Creep.prototype.withdrawEnergy = function(target) {
    // transfer all resources
    
    //logger.log(this.name, "my store", JSON.stringify(this.store))
    var ret = this.withdraw(target, RESOURCE_ENERGY);


};
Creep.prototype.withdrawAll = function(target, except) {
    if (!except) 
        except = [];
    // transfer all resources
    logger.log(target.store);
    for(const resourceType in target.store) {
        if (except.indexOf(resourceType) == -1) {
            logger.log(this.name, "pulling", resourceType)
            var ret = this.withdraw(target, resourceType);
        }
    }
};

Creep.prototype.holdPosition = function(target, safeDistance, range, fleeHealth) {
    if (safeDistance == undefined) {
        safeDistance = 4;
    }
    if (range == undefined) {
        range = 0;
    }
    if (fleeHealth == undefined) {
        fleeHealth = 0.99;
    }
       
        
    if (this.shouldFlee(fleeHealth)) {
        if (!this.flee(safeDistance)) {
            //this.say("skerrd!")
        }
    } else {
        if (!this.pos.inRangeTo(target, range)) {
            //this.say("moving in")
            global.utils.moveCreep(this, target);
            
        } else {
            //should be in position
            //this.say("in range")
            return true;
        }
        
    }
    return false;
}

Creep.prototype.flee = function(range) {
  var nearCreeps = this.pos.findInRange(FIND_HOSTILE_CREEPS, range, {filter: i => i.isHostile() && (i.getActiveBodyparts(ATTACK) > 0 || i.getActiveBodyparts(RANGED_ATTACK) > 0)});
  var nearKeeperLairs = this.pos.findInRange(FIND_HOSTILE_STRUCTURES, range, {filter: function(s) {
      //logger.log(s.structureType, s.ticksToSpawn)
      return s.structureType == STRUCTURE_KEEPER_LAIR && s.ticksToSpawn < 13;
  }})
  //logger.log('--------------', nearKeeperLairs, nearCreeps)
  if (nearKeeperLairs && nearKeeperLairs.length > 0) {
      nearCreeps = nearCreeps.concat(nearKeeperLairs)
      //logger.log('--------------', nearKeeperLairs[0].pos, nearCreeps)
  }
  
  if(nearCreeps.length > 0) {
    var ret = PathFinder.search(this.pos, _.map(nearCreeps, i => ({pos: i.pos, range: range})), { maxRooms: 1, flee: true, roomCallback: function(roomName) {

        let room = Game.rooms[roomName];
        // In this example `room` will always exist, but since 
        // PathFinder supports searches which span multiple rooms 
        // you should be careful!
        if (!room) return;
        let costs = new PathFinder.CostMatrix;

        room.find(FIND_STRUCTURES).forEach(function(struct) {
          if (struct.structureType === STRUCTURE_ROAD) {
            // Favor roads over plain tiles
            costs.set(struct.pos.x, struct.pos.y, 1);
          } else if (struct.structureType !== STRUCTURE_CONTAINER &&
                     (struct.structureType !== STRUCTURE_RAMPART ||
                      !struct.my)) {
            // Can't walk through non-walkable buildings
            costs.set(struct.pos.x, struct.pos.y, 0xff);
          }
        });

        // Avoid creeps in the room
        room.find(FIND_CREEPS).forEach(function(creep) {
          costs.set(creep.pos.x, creep.pos.y, 0xff);
        });

        return costs;
      }}); 
    if(ret.path.length) { 
      this.moveTo(ret.path[0]); 
      this.say('flee'); 
      return true; 
    } 
  } 
  return false; 
}

Creep.prototype.shouldFlee = function(runawayPercent, minHP) {
    if (!runawayPercent) {
        runawayPercent = 0.9;
    }
    if (!minHP) {
        minHP = 200;
    }
    if (this.memory.fleeing == undefined) {
        this.memory.fleeing = false;
    }
    
    
    var hpPerct = this.hits / this.hitsMax;
    var underThresh = hpPerct < runawayPercent;
    if (this.memory.fleeing && hpPerct > 0.999) {
        this.memory.fleeing = false;
        return false;
    }
    if (underThresh || this.memory.fleeing) {
        this.memory.fleeing = true;
        return true;
    }
    return false;
    
}