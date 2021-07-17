/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('screeps.logger');
 * mod.thing == 'a thing'; // true
 */


var logger = function(module) {
    this.module = module;
    this.enabled = true;
    this.log = function() {
        if (!this.enabled) 
            return;
        var t = module + " ";
        for(var i in arguments) {
            t += arguments[i] + " ";
        }
        console.log(t);
    }
}

module.exports = logger;