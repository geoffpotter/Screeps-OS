/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.base');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("role.base");


var obj = function() {
}


obj.prototype.init = function(name, roomManager) {
    this.name = name;
    this.roomManager = roomManager;
    this.numCreeps = 0;
}

obj.prototype.tickInit = function() {
    
}

obj.prototype.tick = function() {
    
}

obj.prototype.tickEnd = function() {
    
}

obj.prototype.baseRoleName = function() {
    return this.name.split("-")[0];
}

module.exports = obj;