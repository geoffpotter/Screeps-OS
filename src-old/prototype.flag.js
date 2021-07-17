/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('prototype.flag');
 * mod.thing == 'a thing'; // true
 */
var logger = require("screeps.logger");
logger = new logger("prototype.flag");
Flag.prototype.hostilesInRange = function(range) {
    if (!this.room) {
        return [];
    }
    var hostiles =  this.pos.findInRange(FIND_HOSTILE_CREEPS, range, {filter: function(c) {
        //logger.log(c.name, c.isHostile())
        return c.isHostile();
    }});
    //logger.log(this.name, "found bad guys:", hostiles)
    return hostiles;
}