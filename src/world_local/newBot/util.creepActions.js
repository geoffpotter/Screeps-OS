/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * import mod  from "util.creepActions";
 * mod.thing == 'a thing'; // true
 */

import logger_import from "./screeps.logger";
let logger = new logger_import("util.creepActions");

class creepActions {
  mineEnergy(creep, source = false) {
    var target = false;
    if (source === false) {
      target = creep.pos.findClosestByRange(FIND_SOURCES_ACTIVE);
    } else {
      target = source;
    }
    //logger.log(this.name, "mining target", target)
    if (target) {
      if (creep.pos.isNearTo(target)) {
        creep.harvest(target);
      } else {
        global.utils.moveCreep(creep, target);
      }
      return true;
    }
    return false;
  }

  pickupEnergy(creep, range = false, notNearController = false, pileId = false) {
    if (pileId) {
      target = Game.getObjectById(pileId);
    } else {
      var target = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {
        filter: function(r) {
          return r.resourceType == RESOURCE_ENERGY && r.amount > creep.carryCapacity * 2;
        }
      });
      if (!target) {
        target = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {
          filter: function(r) {
            return r.resourceType == RESOURCE_ENERGY && r.amount > creep.carryCapacity * 0.5;
          }
        });
      }
      if (target && range) {
        if (!creep.pos.inRangeTo(target, range)) {
          target = false;
        }
      }
      if (notNearController && target.pos.inRangeTo(creep.room.controller, 5)) {
        target = false;
      }
    }

    logger.log(this.name, "pickup energy target", target, pileId)
    if (target) {
      if (creep.pos.isNearTo(target)) {
        if (creep.pickup(target) == 0) {
          creep.memory.energyIn += Math.min(creep.carryCapacity - creep.carry.energy, target.amount);
        }
      } else {
        global.utils.moveCreep(creep, target);

      }
      //logger.log(this.name, "picking up energy", target)
      return true;
    }
    return false;
  }




  //moves creep to target while returning false, returns true when creep has arrived. 
  moveTo(creep, target, range = 1) {
    if (creep.pos.inRangeTo(target, range)) {
      return true;
    } else {
      global.utils.moveCreep(creep, target);
    }
    return false;
  }

  transferTo(creep, target, type, amt) {
    if (!target) {
      logger.log("------------ transferTo has no target!");
      return false;
    }
    if (creep.pos.isNearTo(target)) {
      for (const resourceType in creep.carry) {
        if ((type == true && creep.carry[resourceType] > 0) || resourceType == type) {
          var amt = Math.min(creep.carry[resourceType], target.storeCapacity - _.sum(target.store))
          logger.log(creep.name, resourceType, creep.carry[resourceType])
          var ret = creep.transfer(target, resourceType, amt);
          logger.log("----------------", creep.name, type, ret, amt, creep.carry[resourceType])

        }
      }
      return true;
    } else {
      global.utils.moveCreep(creep, target);
      return true;
    }
    return false;
  }
}

export default new creepActions();