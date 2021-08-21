/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.template');
 * mod.thing == 'a thing'; // true
 */

var logger_imported = require("./screeps.logger");
let logger = new logger_imported("role.template");


var obj = function() {}
var base = require('./role.base');
obj.prototype = new base();

import utils from "./util.global.js"

utils.extendFunction(obj, "init", function(name, roomManager) {
  this._init(name, roomManager);
});



utils.extendFunction(obj, "tickInit", function() {});



utils.extendFunction(obj, "tick", function() {});



utils.extendFunction(obj, "tickEnd", function() {});

export default obj