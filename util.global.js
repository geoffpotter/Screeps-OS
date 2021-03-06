/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('util.global');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("util.global");

var creepRequest = require("util.creepRequest")

var traveler = require('util.traveler')({exportTraveler: true, installTraveler: true, installPrototype: false, defaultStuckValue: 2});
//global.profiler.registerObject(traveler, "traveler")
traveler = new traveler();



module.exports = {
   
   findPath : function(origin, destination, options = {}) {
        if (!options)
                options = {};
                //options.useFindRoute=true;
        if (!options.range) {
            options.range = 1;
        }
        if (!options.maxOps) {
            options.maxOps = 20000;
        }
        //opts.hostileLocation = "false";
        
        return traveler.findTravelPath(origin, destination, options);
    },
    moveCreep : function(creep, dest, opts) {
        // if (Memory.useMoveTo == undefined) {
        //     Memory.useMoveTo = false;
        // }
        
        if (!opts) {
            opts = {};
        }
        
        // if (Game.cpu.bucket < 1000) {
        //     Memory.useMoveTo = true;
        // } else if (Game.cpu.bucket > 2000) {
        //     Memory.useMoveTo = false;
        // } 
            
        
        

            
            // if (Memory.useMoveTo && !_.startsWith(creep.memory.role, 'miner')) {
            //     var ret = creep.moveTo(dest);
            //     // logger.log(creep.name, dest, ret)
            //     return ret;
            // }
            opts.useFindRoute=true;
            if (!opts.range) {
                opts.range = 1;
            }
            if (!opts.maxOps) {
                //opts.maxOps = 20000;
            }
            
            
            opts.allowHostile = true;
            
            //opts.hostileLocation = "false";
            opts.keepFromHostiles = 4;
            traveler.travelTo(creep, dest, opts);
        
            
        
    },
   
    
    extendFunction: function(obj, funcName, replacementFunc, prefix) {
        if (!prefix) {
            prefix = "_"
        }
        obj.prototype[prefix+funcName] = obj.prototype[funcName];
        obj.prototype[funcName] = replacementFunc;
    },
    
    makeCreepRequest: function(role, assignmentVar, baseBody, variableBody, priority, memory, maxBodies, minBodies) {
        var req = new creepRequest(role, assignmentVar, baseBody, variableBody, priority, memory, maxBodies, minBodies);
        
        //logger.log(JSON.stringify(req))
        return req;
    },
    buildCreepBody: function(baseBody, variableBody, maxEnergy, maxBodies, minBodies ) {
        //logger.log("building: ", baseBody, variableBody, maxEnergy, maxBodies, minBodies);
        if (maxBodies == 0) {
            maxBodies = 50;
        }
        var body = baseBody;
        var numBodies = 1;
        
        var overMin = numBodies >= minBodies;
        // logger.log(numBodies, maxBodies)
        // logger.log(numBodies < maxBodies && (maxEnergy==0 || this.creepCost(body) <= maxEnergy))
        // logger.log(numBodies < maxBodies, this.creepCost(body), maxEnergy)
        while(numBodies < maxBodies && (!overMin || maxEnergy==0 || this.creepCost(body) <= maxEnergy)) {
            var newBody = body.concat(variableBody);
            //logger.log(JSON.stringify(newBody), this.creepCost(newBody), minBodies, numBodies, (numBodies < minBodies || (maxEnergy==0 || this.creepCost(newBody) <= maxEnergy)))
            if (newBody.length <= 50 && (numBodies < minBodies || (maxEnergy==0 || this.creepCost(newBody) <= maxEnergy))) {
                //logger.log('used')
                body = newBody;
            } else {
                break;
            }
            numBodies++;
        }
        overMin = numBodies >= minBodies;
        //logger.log(this.creepCost(body), maxEnergy)
        //logger.log(JSON.stringify(body));
        return body;
    },
    
    creepCost: function(body) {
        var buildCost = 0;
        for(var bodypart in body){
            var part = body[bodypart];
            if (part.type != undefined) {
                part = part.type;
            }
            switch(part){
                case MOVE:
                case CARRY:
                    buildCost+=50;
                break;
                case WORK:
                    buildCost+=100;
                break;
                case HEAL:
                    buildCost+=250;
                break;
                case TOUGH:
                    buildCost+=10;
                break;
                case CLAIM:
                    buildCost+=600;
                break;
                case ATTACK:
                    buildCost+=80;
                break;
                case RANGED_ATTACK:
                    buildCost+=150;
                break;
            }
        }
        return buildCost;
    },
    
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

    /**
     * draw a circle at position
     * @param pos
     * @param color
     * @param opacity
     */

    circle: function(pos, color, opacity, radius) {
        if (!radius) 
            radius = .45;
        if (!opacity)
            opacity = 1;
        new RoomVisual(pos.roomName).circle(pos, {
            radius: radius, fill: "transparent", stroke: color, strokeWidth: .15, opacity: opacity});
    },
    
    drawFlowField: function(dest, flow) {
        this.circle(dest, "red");
        var roomVisuals = {};
        //logger.log(JSON.stringify(flow))
        for (var roomName in flow) {
            if (!roomVisuals[roomName]) {
                roomVisuals[roomName] = new RoomVisual(roomName)
            }
            var visual = roomVisuals[roomName];
            for(var x in flow[roomName]) {
                for(var y in flow[roomName][x]) {
                    var pos = new RoomPosition(x, y, roomName);
                    var dir = flow[roomName][x][y];
                    var charMap = {}
                    charMap[TOP] ="⬆";
                    charMap[TOP_LEFT] = "↖";
                    charMap[TOP_RIGHT] = "↗";
                    
                    charMap[LEFT] = "⬅";
                    charMap[RIGHT] ="➡";
                    charMap[BOTTOM] = "⬇";
                    charMap[BOTTOM_LEFT] ="↙";
                    charMap[BOTTOM_RIGHT] = "↘";
                    
                    //logger.log('here', roomName, x, y, dir, LEFT, charMap[dir], visual.circle)
                    //visual.circle(pos, {fill: 'transparent', radius: 0.55, stroke: 'red'})
                    visual.text(charMap[dir], pos.x, pos.y+0.3, {color: 'red', font: 0.8});
                }
            }
        }
    },
    
    /**
     * serialize a path, traveler style. Returns a string of directions.
     * @param startPos
     * @param path
     * @param color
     * @returns {string}
     */

    drawPath: function(path, color) {
        if (!color) {
            color = "orange"
        }
    
        let lastPosition = path[0];
        this.circle(lastPosition, color);
        for (let position of path) {
            if (position.roomName === lastPosition.roomName) {
                new RoomVisual(position.roomName)
                    .line(position, lastPosition, {color: color, lineStyle: "dashed"});
         
            }
            lastPosition = position;
        }
    },
    drawTextWall: function(text, basePos) {
        var viz = new RoomVisual(basePos.roomName);
        //logger.enabled = true;
        var yS = basePos.y;
        var lines = text.split("\n");
        for(var i in lines) {
            var s = lines[i];
            viz.text(s, basePos.x, yS + i*1, {align:"left"});
        }
        //logger.log(this.roomName, status);
        
    
    },
    drawText: function(t, pos) {
        new RoomVisual(pos.roomName).text(t,pos.x-0.0, pos.y);
    },
    drawCross: function(t, pos, style) {
        if (!pos) 
            return;
        var v = new RoomVisual(pos.roomName);
        v.text(t,pos.x-0.0, pos.y)
        v.line(pos.x-0.5, pos.y, pos.x+0.5, pos.y, style);
        v.line(pos.x, pos.y-0.5, pos.x, pos.y+0.5, style);
    }        
}