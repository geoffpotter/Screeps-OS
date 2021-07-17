/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('class.template');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("template");

var obj = function() {
}
var base = require('manager.base');
obj.prototype = new base();


global.utils.extendFunction(obj, "init", function() {
});

global.utils.extendFunction(obj, "tickInit", function() {
});

global.utils.extendFunction(obj, "tick", function() {
});

global.utils.extendFunction(obj, "tickEnd", function() {
});

module.exports = obj;