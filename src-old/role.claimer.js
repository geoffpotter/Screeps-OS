/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.claimer');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("role.claimer");


var obj = function() {
}
var base = require('role.base');
obj.prototype = new base();

global.utils.extendFunction(obj, "init", function(name, targetRoomName, roomManager) {
    logger.log(roomManager)
    this._init(name, roomManager);
    
    this.targetRoomName = targetRoomName;
    
    this.creepId = false;//actually the name now
    this.creep = false;
});

global.utils.extendFunction(obj, "tickInit", function() {
    
    this.creep = Game.creeps[this.creepId];
    logger.log("num", this.name, this.creep, this.roomManager)
    if (!this.creep && this.roomManager) {
        //we don't have a creep!  spawn one dem mofos
        this.creepId = false;
        var memory = {
            home:this.targetRoomName
        }
        
        var priority = 200;
        // if (this.numCreeps == 0)
        //     priority = 10;
        var req = global.utils.makeCreepRequest(this.name, "creepId", [MOVE, CLAIM], [], priority, memory, 1)
        req.important = true;
        this.roomManager.requestCreep(req);
        //global.empire.requestHelperCreep(this.roomManager.roomName, req);
    }
});

global.utils.extendFunction(obj, "tick", function() {
    
    if (this.creep && !this.creep.spawning) {
        if (this.creep.pos.roomName == this.targetRoomName) {
            var c = Game.rooms[this.targetRoomName].controller;
            if (this.creep.pos.isNearTo(c)) {
                this.creep.claimController(c);
                for(var f in Game.flags) {
                    var flag = Game.flags[f];
                    if (flag.pos.roomName == this.targetRoomName && flag.color == COLOR_GREEN && flag.secondaryColor == COLOR_GREEN) {
                        logger.log(this.creep.name, "removing flag", flag)
                        flag.remove();
                    }
                }
            } else {
                global.utils.moveCreep(this.creep, c);
            }
        } else {
            global.utils.moveCreep(this.creep, new RoomPosition(25, 25, this.targetRoomName));
        }
    }
});

global.utils.extendFunction(obj, "tickEnd", function() {
});

module.exports = obj;