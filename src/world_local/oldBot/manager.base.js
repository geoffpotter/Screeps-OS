/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('manager.base');
 * mod.thing == 'a thing'; // true
 */

var logger_imported = require("./screeps.logger");
let logger = new logger_imported("manager.base");

var obj = function() {

}

obj.prototype.init = function() {
  logger.log("init")
}

obj.prototype.tickInit = function() {

}

obj.prototype.tick = function() {

}

obj.prototype.tickEnd = function() {

}

export default obj