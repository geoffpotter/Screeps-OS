/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('prototype.creep.military');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("prototype.creep.military");
logger.enabled = false;
Creep.prototype.attackNearCreeps = function() {
    var jerks = this.pos.findInRange(FIND_HOSTILE_CREEPS, 1);
    if (jerks.length > 0) {
        jerks = _.sortBy(jerks, function(c) {
            return c.hitsMax * (c.hits / c.hitsMax);
        }).reverse();
        
        var targetJerk = jerks[0];
        this.attack(targetJerk);
        return true;
    }
    return false;
}
Creep.prototype.rangeAttackNearCreeps = function() {
    var jerks = this.pos.findInRange(FIND_HOSTILE_CREEPS, 3);
    
    if (jerks.length > 0) {
        jerks = _.sortBy(jerks, function(c) {
            return c.hitsMax * (c.hits / c.hitsMax);
        }).reverse();
        logger.log(this.name, 'jerks', jerks.length)
        if (jerks.length > 2) {
            logger.log(this.name, "mass attack")
            //use mass attack
            this.rangedMassAttack();
        } else {
            var targetJerk = jerks[0];
            var res = this.rangedAttack(targetJerk);
            logger.log(this.name, "ranged attack", res)
        
        }
        return true;
    }
    return false;
}

Creep.prototype.attactStructUnderRedYellowFlag = function() {
    var flags = this.room.find(FIND_FLAGS, {filter: function(i) {
        return i.color = COLOR_RED && i.secondaryColor == COLOR_YELLOW;
    }});
    var target = false;
    if (flags.length > 0) {
        var itemsAll = this.room.lookAt(flags[0].pos);
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
        var range = 3;
        if (this.getActiveBodyparts(ATTACK) > 0) {
            range = 1;
        }
        if (!this.pos.inRangeTo(target, range)) {
            global.utils.moveCreep(this, target);
        }
        if (this.getActiveBodyparts(RANGED_ATTACK) > 0) {
            this.rangedAttack(target)    
        } 
        if (this.getActiveBodyparts(ATTACK) > 0) {
            this.attack(target);
        }
        
        return true;
    }
    return false;
}

Creep.prototype.healSelf = function() {
    if (this.hits < this.hitsMax) {
        this.heal(this);
        return true;
    }
    return false;
}
Creep.prototype.healCreepsNearMe = function(useRanged, useHeal) {
    if (useRanged == undefined) {
        useRanged = true;
    }
    if (useHeal == undefined) {
        useHeal = true;
    }
    var injuredInRange = this.pos.findInRange(FIND_MY_CREEPS, 3, {filter: function(c){
       //logger.log(c.name, c.hits , c.hitsMax)
       return c.hits < c.hitsMax;
   }});
   if (injuredInRange.length > 0) {
       creepToHeal = _.sortBy(injuredInRange, function(c) {
           return c.hitsMax * (c.hits / c.hitsMax)
       }).reverse()[0];
       if (this.pos.isNearTo(creepToHeal)) {
           useHeal && this.heal(creepToHeal);
       } else {
           useRanged && this.rangedHeal(creepToHeal)
       }
       
       return true;
   }
   return false;
}
Creep.prototype.healCreeps = function() {
    var friends = this.room.find(FIND_MY_CREEPS, {filter: function(c){
       //logger.log(c.name, c.hits , c.hitsMax)
       return c.hits <c.hitsMax;
   }});
   
   
   
   if (friends.length > 0 ) {
       var closeFriend = this.pos.findClosestByPath(friends);
       if (closeFriend) {
           if (this.pos.isNearTo(closeFriend)) {
               logger.log(creep.body, creep.heal(closeFriend));
           }
           if (this.pos.inRangeTo(closeFriend, 4)) {
               //logger.log(creep.name, 'healing', closeFriend.name)
               logger.log(creep, creep.rangedHeal(closeFriend));
           }
           
           if (!this.flee(3)) {
               if (!this.pos.isNearTo(closeFriend)) {
                   global.utils.moveCreep(creep, closeFriend);
               }
           }
           
       } else {
           logger.log('----------------You might be an idiot-----------------')
       }
   }
}