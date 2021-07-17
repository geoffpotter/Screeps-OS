/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('manager.murderRoom');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("manager.murderRoom");

var obj = function() {
}
var base = require('manager.baseRoom');
obj.prototype = new base();


global.utils.extendFunction(obj, "init", function(targetRoomName) {
    this._init(targetRoomName, true);


});

global.utils.extendFunction(obj, "tickInit", function() {
    this.setRoles();
    this._tickInit();
});

global.utils.extendFunction(obj, "tick", function() {
    this._tick();
});

global.utils.extendFunction(obj, "tickEnd", function() {
    this._tickEnd();
    
});

obj.prototype.setRoles = function() {
    this.mapFlags();
    var roleClasses = global.utils.getRoleClasses();
    for(var i in this.groupFlags) {
        var flag = this.groupFlags[i];
        
        this.roleObjects["fPaladin-"+i] = new roleClasses.fPaladin();
        this.roleObjects["fPaladin-"+i].init("fPaladin-"+i, this, flag);
        this.roleObjects["fPaladin-"+i].requiredCreeps = 0;
        
        this.roleObjects["fguard-"+i] = new roleClasses.fGuard();
        this.roleObjects["fguard-"+i].init("fguard-"+i, this, flag);
        this.roleObjects["fguard-"+i].requiredCreeps = 1;
        
        this.roleObjects["fMage-"+i] = new roleClasses.fMage();
        this.roleObjects["fMage-"+i].init("fMage-"+i, this, flag);
        this.roleObjects["fMage-"+i].requiredCreeps = 2;
        
        this.roleObjects["fArcher-"+i] = new roleClasses.fArcher();
        this.roleObjects["fArcher-"+i].init("fArcher-"+i, this, flag);
        this.roleObjects["fArcher-"+i].requiredCreeps = 1;
        
        this.roleObjects["fHealer-"+i] = new roleClasses.fHealer();
        this.roleObjects["fHealer-"+i].init("fHealer-"+i, this, flag);
        this.roleObjects["fHealer-"+i].requiredCreeps = 2;
    }
    
  
}

obj.prototype.mapFlags = function() {
    this.groupFlags = [];
    for(var i in Game.flags) {
        var flag = Game.flags[i];
        if (flag.pos.roomName == this.roomName) {
            if (flag.color == COLOR_RED && flag.secondaryColor == COLOR_RED) {
                this.groupFlags.push(flag);
            }
        }
        
    }
}

module.exports = obj;