/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('manager.keeperRoom');
 * mod.thing == 'a thing'; // true
 */


var logger_imported = require("./screeps.logger");
let logger = new logger_imported("manager.keeperRoom");

var obj = function() {}
var base = require('./manager.baseRoom');
obj.prototype = new base();

import roles from "./role.internal";

import utils from "./util.global.js"

utils.extendFunction(obj, "init", function(targetRoomName, homeRoomManager) {
  this._init(targetRoomName, true);
  this.homeRoomManager = homeRoomManager;
  this.remoteEnergyTarget = true;
});



utils.extendFunction(obj, "tickInit", function() {
  this._tickInit();
  this.logEnergyInRoom();
  if (!this.roleObjects["workerNextRoom"]) {

    var roleClasses = roles.getRoleClasses()
    //order here affects spawn order
    this.roleObjects["workerNextRoom"] = new roleClasses.workerNextRoom();
    this.roleObjects["workerNextRoom"].init("workerNextRoom", this, this.homeRoomManager);
    this.roleObjects["workerNextRoom"].requiredCreeps = 2;
    this.roleObjects["workerNextRoom"].dangerZone = true;
  }

  //logger.log('--------------------------', this.visibility && !this.room.memory.initDone , this.homeRoomManager.buildingManager.buildEnabledFlag)
  if (this.visibility && !this.room.memory.initDone && this.homeRoomManager.buildingManager.buildEnabledFlag) {
    var spawn = this.homeRoomManager.getAvailableSpawn();
    if (spawn) {
      var sourceFlags = global.utils.flagsByColor(this.roomFlags, COLOR_YELLOW, COLOR_YELLOW);
      sourceFlags.concat(global.utils.flagsByColor(this.roomFlags, COLOR_YELLOW, COLOR_PURPLE))
      if (sourceFlags.length) {
        for (var f in sourceFlags) {
          var flag = sourceFlags[f]
          var path = global.utils.findPath(spawn, flag);
          global.utils.drawPath(path.path, "white");
          this.homeRoomManager.buildingManager.addRoadsToPath(path.path);
          this.homeRoomManager.buildingManager.buildPlan.containers.push(path.path[path.path.length - 1])
        }
        this.room.memory.initDone = true;
      }
    }



  }
});



utils.extendFunction(obj, "tick", function() {
  this._tick();
});



utils.extendFunction(obj, "tickEnd", function() {
  this._tickEnd();

});



export default obj