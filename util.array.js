/*

 */

var logger = require("screeps.logger");
logger = new logger("util.arrays");




module.exports = {
    arrayContainsLoc: function(array, pos, debug) {
        for(var i in array) {
            var apos = array[i];
            if (debug)
                logger.log(pos, apos);
            if (apos.x == pos.x && apos.y == pos.y && apos.roomName == pos.roomName)
                return true;
        }
        return false;
    },
    
    setInRange: function(matrix, x_in, y_in, range, cost) {
        var xStart = x_in - range;
        var yStart = y_in - range;
        var xEnd = x_in + range;
        var yEnd = y_in + range;
        
        for(var x = xStart; x < xEnd; x++) {
            for(var y = yStart; y < yEnd; y++) {
                matrix.set(x, y, cost);
            }
        }
    },


    flagCount: function(flags, color, secondaryColor) {
        var num = 0;
        for(var f in flags) {
            var flag = flags[f];
            if (flag.color == color && flag.secondaryColor == secondaryColor) {
                num++;
            }
        }
        return num;
    },
    
    flagsByColor: function(flags = false, color, secondaryColor = false, roomName = false) {
        var retFlags = [];
        for(var f in flags) {
            var flag = flags[f];
            if (flag.color == color && (secondaryColor == false || flag.secondaryColor == secondaryColor) && (roomName == false || flag.pos.roomName == roomName)) {
                retFlags.push(flag);
            }
        }
            //logger.log(flags, color, secondaryColor)
        return retFlags;
    },
    allFlagsByColor: function(color, secondaryColor = false, roomName = false) {
        let flags = Game.flags;
        var retFlags = [];
        for(var f in flags) {
            var flag = flags[f];
            //logger.log(JSON.stringify(flag), color, secondaryColor)
            if (flag.color == color && (secondaryColor == false || flag.secondaryColor == secondaryColor) && (roomName == false || flag.pos.roomName == roomName)) {
                retFlags.push(flag);
            }
        }
            //logger.log(flags, color, secondaryColor)
        return retFlags;
    },
    flagsAtPos: function(flags, pos) {
        var retFlags = [];
        for(var f in flags) {
            var flag = flags[f];
            if (flag.pos.isEqualTo(pos)) {
                retFlags.push(flag);
            }
        }
            //logger.log(flags, color, secondaryColor)
        return retFlags;
    },
}