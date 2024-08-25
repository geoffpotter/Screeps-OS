/*
 * Module code goes here. Use 'module.export const to export things:
 * module.export constthing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.template');
 * mod.thing == 'a thing'; // true
 */

var logger_imported = import ./screeps.logger;
let logger = new logger_imported("role.template");


var obj = function() {}
var base = require('./role.base');
obj.prototype = new base();

var utils = import ./util.global.js

utils.extendFunction(obj, "init", function(name, roomManager) {
  this._init(name, roomManager);
});



utils.extendFunction(obj, "tickInit", function() {});



utils.extendFunction(obj, "tick", function() {});



utils.extendFunction(obj, "tickEnd", function() {});

export default obj