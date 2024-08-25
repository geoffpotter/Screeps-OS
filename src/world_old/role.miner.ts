/*
 * Module code goes here. Use 'module.export const to export things:
 * module.export constthing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.miner');
 * mod.thing == 'a thing'; // true
 */

var logger_imported = import ./screeps.logger;
let logger = new logger_imported("role.miner");

var obj = function() {}
var base = require('./role.base');
obj.prototype = new base();


var utils = import ./util.global.js

utils.extendFunction(obj, "init", function(name, roomManager, sourceLoc, homeOverride) {
  this.__init(name, roomManager);
  this.sourceLoc = {
    x: sourceLoc.x,
    y: sourceLoc.y,
    roomName: sourceLoc.roomName
  };
  this.source = false;
  this.homeOverride = homeOverride;
  //logger.log("---------------------------------------init", roomManager, sourceLoc)
  this.sourceContainer = false;
  this.minerCreepId = false;
  this.minerCreep = false;


}, "__");



utils.extendFunction(obj, "tickInit", function() {
  //get the source object

  //logger.log("-----------",this.sourceLoc, this.sourceLoc.x);

  this.minerCreep = Game.creeps[this.minerCreepId];

  //logger.log("num", this.name, this.minerCreep, this.roomManager.room.name)
  if (!this.minerCreep) {
    //we don't have a creep!  spawn one dem mofos
    this.minerCreepId = false;
    var mem = false;
    if (this.homeOverride) {
      mem = {
        home: this.homeOverride
      }
    }
    var minBodies = 0;
    if (this.roomManager.room.energyCapacityAvailable >= 600 && !this.roomManager.creepCrisis()) {
      minBodies = 2;
    }

    var priority = 15;
    if (this.numCreeps == 0)
      priority = 150;
    var req = global.utils.makeCreepRequest(this.name, "minerCreepId", [WORK, WORK, MOVE], [WORK, WORK, MOVE], priority, mem, 5, minBodies)
    req.important = true;
    this.roomManager.requestCreep(req);
  }



  if (Game.rooms[this.sourceLoc.roomName]) {
    var room = Game.rooms[this.sourceLoc.roomName];

    //logger.log(room, this.sourceLoc, this.sourceLoc.x);
    var source = room.lookForAt(LOOK_SOURCES, this.sourceLoc.x, this.sourceLoc.y);
    if (source.length) {
      this.source = source[0];
      this.sourceContainer = this.source.getContainer();
    } else {
      logger.log("ain't no source here fool.. ", this.sourceLoc);
    }
  }
}, "__");



utils.extendFunction(obj, "tick", function() {
  if (this.minerCreep) {
    // if (this.minerCreep.flee(5)) {
    //     logger.log("miner", this.minerCreep.id, "is fleeing");
    //     return;
    // }
    logger.log('----------------------------here?', this.minerCreepId, this.minerCreep.pos.isNearTo(this.sourceLoc.x, this.sourceLoc.y), this.sourceLoc.x, this.sourceLoc.y)
    var targetPos = new RoomPosition(this.sourceLoc.x, this.sourceLoc.y, this.sourceLoc.roomName);
    // if (this.sourceContainer) {
    //     targetPos = this.sourceContainer.pos;
    // }

    if (!this.minerCreep.pos.isNearTo(targetPos)) {
      //logger.log(this.minerCreep, "moving to", JSON.stringify(targetPos))
      global.utils.moveCreep(this.minerCreep, targetPos, {
        ignoreCreeps: false
      });

    } else {
      //logger.log('here??>>>')
      if (this.sourceContainer) {
        if (this.sourceContainer.pos != this.minerCreep.pos) {
          //logger.log("==-=-=",this.sourceContainer.pos, this.minerCreep)
          global.utils.moveCreep(this.minerCreep, this.sourceContainer.pos, {
            ignoreCreeps: false
          });
        }

      } else {
        logger.log('this moving?', JSON.stringify(targetPos))
        global.utils.moveCreep(this.minerCreep, targetPos);
      }
      var res = this.minerCreep.harvest(this.source);
    }
  }
}, "__");



utils.extendFunction(obj, "tickEnd", function() {}, "__");



export default obj