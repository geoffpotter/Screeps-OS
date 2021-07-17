/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('prototype.position');
 * mod.thing == 'a thing'; // true
 */

RoomPosition.prototype.getName = function() {
    return this.roomName + "-" + this.x + "-" + this.y;
}