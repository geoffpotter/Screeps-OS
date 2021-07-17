/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.template');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("role.template");


var obj = function() {
}
var base = require('role.base');
obj.prototype = new base();

global.utils.extendFunction(obj, "init", function(name, roomManager) {
    this._init(name, roomManager);
});

global.utils.extendFunction(obj, "tickInit", function() {
});

global.utils.extendFunction(obj, "tick", function() {
});

global.utils.extendFunction(obj, "tickEnd", function() {
});

module.exports = obj;