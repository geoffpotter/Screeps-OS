/*
 * Module code goes here. Use 'module.export const to export things:
 * module.export constthing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('class.template');
 * mod.thing == 'a thing'; // true
 */

var logger_imported = import ./screeps.logger;
let logger = new logger_imported("template");

var obj = function() {}
var base = require('./manager.base');
obj.prototype = new base();


var utils = import ./util.global.js

utils.extendFunction(obj, "init", function() {});



utils.extendFunction(obj, "tickInit", function() {});



utils.extendFunction(obj, "tick", function() {});



utils.extendFunction(obj, "tickEnd", function() {});

export default obj