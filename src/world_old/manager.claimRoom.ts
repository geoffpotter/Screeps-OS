/*
 * Module code goes here. Use 'module.export const to export things:
 * module.export constthing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('manager.claimRoom');
 * mod.thing == 'a thing'; // true
 */

var logger_imported = import ./screeps.logger;
let logger = new logger_imported("manager.claimRoom");

var obj = function() {}
var base = require('./manager.baseRoom');
obj.prototype = new base();

var roles = import ./role.internal;

var utils = import ./util.global.js

utils.extendFunction(obj, "init", function(targetRoomName, homeRoomManager) {
  this._init(targetRoomName);
  this.homeRoomManager = homeRoomManager;
  var roleClasses = roles.getRoleClasses()

  //order here affects spawn order
  this.roleObjects["claimer"] = new roleClasses.claimer();
  this.roleObjects["claimer"].init("claimer", this.roomName, this);
});



utils.extendFunction(obj, "tickInit", function() {
  // if (!this.homeRoomManager) {
  //     logger.log(this.roomName, "has no home room to spawn from!")
  // }
  this._tickInit();
});



utils.extendFunction(obj, "tick", function() {
  this._tick();
});



utils.extendFunction(obj, "tickEnd", function() {
  this._tickEnd();
  //logger.log('here?', this.visibility, this.visibility ? this.room.controller.my : false)
  if (this.visibility && this.room.controller && this.room.controller.my) {
    var thisRoom = this.targetRoomName;
    var greenFlags = _.filter(Game.flags, function(f) {
      return f.pos.roomName == thisRoom && f.color == COLOR_GREEN && f.secondaryColor == COLOR_GREEN
    });
    logger.log("flags", greenFlags)
    for (var i in greenFlags) {
      var flag = greenFlags[i];
      flag.remove();
    }
    global.empire.killMe(thisRoom);
  }
});

export default obj