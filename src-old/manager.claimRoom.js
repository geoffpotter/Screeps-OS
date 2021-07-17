/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('manager.claimRoom');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("manager.claimRoom");

var obj = function() {
}
var base = require('manager.baseRoom');
obj.prototype = new base();


global.utils.extendFunction(obj, "init", function(targetRoomName, homeRoomManager) {
    this._init(targetRoomName);
    this.homeRoomManager = homeRoomManager;
    var roleClasses = global.utils.getRoleClasses();

    //order here affects spawn order
    this.roleObjects["claimer"] = new roleClasses.claimer();
    this.roleObjects["claimer"].init("claimer", this.roomName, this);
});

global.utils.extendFunction(obj, "tickInit", function() {
    // if (!this.homeRoomManager) {
    //     logger.log(this.roomName, "has no home room to spawn from!")
    // }
    this._tickInit();
});

global.utils.extendFunction(obj, "tick", function() {
    this._tick();
});

global.utils.extendFunction(obj, "tickEnd", function() {
    this._tickEnd();
        //logger.log('here?', this.visibility, this.visibility ? this.room.controller.my : false)
    if (this.visibility && this.room.controller && this.room.controller.my) {
        var thisRoom = this.targetRoomName;
        var greenFlags = _.filter(Game.flags, function(f) {return f.pos.roomName == thisRoom && f.color == COLOR_GREEN && f.secondaryColor == COLOR_GREEN });
        logger.log("flags", greenFlags)
        for(var i in greenFlags) {
            var flag = greenFlags[i];
            flag.remove();
        }
        global.empire.killMe(thisRoom);
    }
});

module.exports = obj;