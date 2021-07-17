/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('prototype.costMatrix');
 * mod.thing == 'a thing'; // true
 */

PathFinder.CostMatrix.prototype.setInRange = function(x_in, y_in, range, cost) {
    var xStart = x_in - range;
    var yStart = y_in - range;
    var xEnd = x_in + range;
    var yEnd = y_in + range;
    
    for(var x = xStart; x < xEnd; x++) {
        for(var y = yStart; y < yEnd; y++) {
            this.set(x, y, cost);
        }
    }
}

PathFinder.CostMatrix.prototype.visual = function(roomName) {
    var xStart = 0;
    var yStart = 0;
    var xEnd = 60;
    var yEnd = 60;
    for(var x = xStart; x < xEnd; x++) {
        for(var y = yStart; y < yEnd; y++) {
            var val = this.get(x, y, cost);
            new RoomVisual(roomName).circle(x, y, val/255)
        }
    }
}