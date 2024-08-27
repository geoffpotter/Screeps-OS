/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('class.template');
 * mod.thing == 'a thing'; // true
 */

var logger_imported = require("./screeps.logger");
let logger = new logger_imported("template");

var obj = function() {}
var base = require('./manager.base');
obj.prototype = new base();


var utils = require('./util.global.js')

utils.extendFunction(obj, "init", function() {});



utils.extendFunction(obj, "tickInit", function() {});



utils.extendFunction(obj, "tick", function() {});



utils.extendFunction(obj, "tickEnd", function() {});

module.exports = obj
