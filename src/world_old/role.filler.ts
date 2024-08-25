/*
 * Module code goes here. Use 'module.export const to export things:
 * module.export constthing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.filler');
 * mod.thing == 'a thing'; // true
 */


var logger_imported = import ./screeps.logger;
let logger = new logger_imported("role.filler");


var obj = function() {}
var base = require('./role.worker');
obj.prototype = new base();

var utils = import ./util.global.js


utils.extendFunction(obj, "init", function(name, roomManager) {
  this._init(name, roomManager);

  this.allowMining = false;
  this.requiredCreeps = 0;
});



utils.extendFunction(obj, "tickInit", function() {
  if (this.roomManager.room.controller.level >= 2 && this.roomManager.room.energyCapacityAvailable >= 500) {
    this.requiredCreeps = 1;
  }
  // if (this.roomManager.room.controller.level >= 4) {
  //     this.requiredCreeps = 2;
  // }
  if (this.roomManager.remoteMode) {
    this.requiredCreeps = 1;
  }
  if (this.workerCreepIds.length < this.requiredCreeps) {
    //need some creeps
    var minBodies = 1;

    if (this.roomManager.creepCrisis()) {
      minBodies = 0;
    }

    var priority = 4;
    if (this.numCreeps == 0)
      priority = 160;
    var req = global.utils.makeCreepRequest(this.name, "workerCreepIds", [CARRY, CARRY, MOVE], [CARRY, CARRY, MOVE], priority, false, 30, minBodies)
    req.useMaxEnergy = true;
    this.roomManager.requestCreep(req);
    return;
  }
});



utils.extendFunction(obj, "tick", function() {
  this._tick();
});


utils.extendFunction(obj, "tickEnd", function() {});

obj.prototype.getEnergy = function(creep) {
  //logger.log("---===----",creep);


  if (!creep.getEnergyFromSpawnContainers()) {
    if (!creep.getEnergyFromAnywhere()) {
      if (!creep.pickupEnergy()) {
        logger.log(creep.name, "Cant find energy")
        return false
      }
    }
  }

  return true;
}

obj.prototype.doWork = function(creep) {

  if (!creep.stashEnergyInSpawns()) {
    if (!creep.stashEnergyInTowers()) {
      logger.log(this.name, creep.pos.roomName, 'nothing to do')
      creep.memory.doneWorking = true;
    }

  }


}

export default obj