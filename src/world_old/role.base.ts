/*
 * Module code goes here. Use 'module.export const to export things:
 * module.export constthing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.base');
 * mod.thing == 'a thing'; // true
 */

var logger_imported = import ./screeps.logger;
let logger = new logger_imported("role.base");



var obj = function() {}


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

export default obj