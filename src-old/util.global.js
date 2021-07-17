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

var stats = require("screeps.stats");
stats = new stats();

var traveler = require('util.traveler')({exportTraveler: true, installTraveler: true, installPrototype: false, defaultStuckValue: 2});
//global.profiler.registerObject(traveler, "traveler")
traveler = new traveler();

var creepRequest = require("util.creepRequest");

var market = require("util.market");



var roleClasses = false;
function getRoleClasses() {
    if (!roleClasses) {
        roleClasses = {
            "miner" : require("role.miner"),
            "minerRocks" : require("role.minerRocks"),
            "filler" : require("role.filler"),
            "alchemist" : require("role.alchemist"),
            "worker" : require("role.worker"),
            "builder" : require("role.builder"),
            "builderWalls" : require("role.builderWalls"),
            "upgrader" : require("role.upgrader"),
            "claimer" : require("role.claimer"),
            "reserver" : require("role.reserver"),
            "transporter" : require("role.transporter"),
            "workerNextRoom" : require("role.workerNextRoom"),
            "transporterNextRoom" : require("role.transporterNextRoom"),
            "minerNextRoom" : require("role.minerNextRoom"),
            "guard" : require("role.guard"),
            "fGuard" : require("role.fguard"),
            "fArcher" : require("role.fArcher"),
            "fHealer" : require("role.fHealer"),
            "fPaladin" : require("role.fPaladin"),
            "fMage" : require("role.fMage"),
        
        };
        
        // for(var r in roleClasses) {
        //     global.profiler.registerObject(roleClasses[r], r)
        // }
    }
    return roleClasses;
}

module.exports = {
    market:market,
    stats:stats,
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
            opts.keepFromHostiles = 5;
            traveler.travelTo(creep, dest, opts);
        
            
        
    },
    //finds the number of rooms between two rooms
    distBetweenRooms: function(from, to) {
        if(!Memory.roomDists) {
            Memory.roomDists = {};
        }
        if(!Memory.roomDists[from]) {
            Memory.roomDists[from] = {};
        }
        if(!Memory.roomDists[to]) {
            Memory.roomDists[to] = {};
        }
        
        if (Memory.roomDists[from] && Memory.roomDists[from][to]) {
            return Memory.roomDists[from][to];
        }
        if (Memory.roomDists[to] && Memory.roomDists[to][from]) {
            return Memory.roomDists[to][from];
        }
        
        var path = Game.map.findRoute(from, to);
        Memory.roomDists[from][to] = path.length;
        return path.length;
    },
    
    extendFunction: function(obj, funcName, replacementFunc, prefix) {
        if (!prefix) {
            prefix = "_"
        }
        obj.prototype[prefix+funcName] = obj.prototype[funcName];
        obj.prototype[funcName] = replacementFunc;
    },
    
    
    roleClasses: false,
    getRoleClasses: function() {
        return getRoleClasses();
    },
    
    creepRequest: creepRequest,
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
    
    flagsByColor: function(flags, color, secondaryColor) {
        var retFlags = [];
        for(var f in flags) {
            var flag = flags[f];
            if (flag.color == color && flag.secondaryColor == secondaryColor) {
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
    
    visual: function(matrix, roomName) {
        var xStart = 0;
        var yStart = 0;
        var xEnd = 60;
        var yEnd = 60;
        for(var x = xStart; x < xEnd; x++) {
            for(var y = yStart; y < yEnd; y++) {
                var val = matrix.get(x, y);
                new RoomVisual(roomName).circle(x, y, {opacity:val/255  * 0.8, radius:0.5, fill:"#000"})
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