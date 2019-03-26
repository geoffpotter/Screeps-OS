/**
 * To start using Traveler, require it in main.js:
 *
 * There are 6 options available to pass to the module. Options are passed in the form
 *   of an object with one or more of the following:
 *
 *   exportTraveler:    boolean    Whether the require() should return the Traveler class. Defaults to true.
 *   installTraveler:   boolean    Whether the Traveler class should be stored in `global.Traveler`. Defaults to false.
 *   installPrototype:  boolean    Whether Creep.prototype.travelTo() should be created. Defaults to true.
 *   hostileLocation:   string     Where in Memory a list of hostile rooms can be found. If it can be found in
 *                                   Memory.empire, use 'empire'. Defaults to 'empire'.
 *   maxOps:            integer    The maximum number of operations PathFinder should use. Defaults to 20000
 *   defaultStuckValue: integer    The maximum number of ticks the creep is in the same RoomPosition before it
 *                                   determines it is stuck and repaths.
 *   reportThreshold:   integer    The mimimum CPU used on pathing to console.log() warnings on CPU usage. Defaults to 50
 * 
 * Examples: var Traveler = require('Traveler')();
 *           require('util.traveler')({exportTraveler: false, installTraveler: false, installPrototype: true, defaultStuckValue: 2});
 */
"use strict";
module.exports = function(globalOpts = {}){
    const gOpts = _.defaults(globalOpts, {
        exportTraveler:    true,
        installTraveler:   false,
        installPrototype:  true,
        hostileLocation:   'empire',
        maxOps:            20000,
        defaultStuckValue: 2,
        reportThreshold:   50,
    });
    class Traveler {
        constructor() {
            // change this memory path to suit your needs
            this.memory = _.defaultsDeep(_.get(Memory, gOpts.hostileLocation, {}), { hostileRooms: {} });
        }
        findAllowedRooms(origin, destination, options = {}) {
            _.defaults(options, { restrictDistance: 16 });
            if (Game.map.getRoomLinearDistance(origin, destination) > options.restrictDistance) {
                return;
            }
            let allowedRooms = { [origin]: true, [destination]: true };
            let ret = Game.map.findRoute(origin, destination, {
                routeCallback: (roomName) => {
                    if (options.routeCallback) {
                        let outcome = options.routeCallback(roomName);
                        if (outcome !== undefined) {
                            return outcome;
                        }
                    }
                    if (Game.map.getRoomLinearDistance(origin, roomName) > options.restrictDistance)
                        return false;
                    let parsed;
                    if (options.preferHighway) {
                        parsed = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName);
                        let isHighway = (parsed[1] % 10 === 0) || (parsed[2] % 10 === 0);
                        if (isHighway) {
                            return 1;
                        }
                    }
                    if (!options.allowSK && !Game.rooms[roomName]) {
                        if (!parsed) {
                            parsed = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName);
                        }
                        let isSK = ((parsed[1] % 10 === 4) || (parsed[1] % 10 === 6)) &&
                            ((parsed[2] % 10 === 4) || (parsed[2] % 10 === 6));
                        if (isSK) {
                            return 10;
                        }
                    }
                    if (!options.allowHostile && this.memory.hostileRooms[roomName] &&
                        roomName !== destination && roomName !== origin) {
                        return Number.POSITIVE_INFINITY;
                    }
                }
            });
            if (!_.isArray(ret)) {
                console.log(`couldn't findRoute to ${destination}`);
                return;
            }
            for (let value of ret) {
                allowedRooms[value.room] = true;
            }
            return allowedRooms;
        }
        findTravelPath(origin, destination, options = {}) {
            _.defaults(options, {
                ignoreCreeps: true,
                range: 1,
                obstacles: [],
                maxOps: gOpts.maxOps,
            });
            let origPos = (origin.pos || origin),
                destPos = (destination.pos || destination);
                
                //console.log(origPos, destPos)
            let allowedRooms;
            // if (origPos.getRangeTo(destPos) > 1 && options.range == 1) {
            //     console.log("here")
            //     options.range = 2;
            // }
            if (options.useFindRoute || (options.useFindRoute === undefined &&
                Game.map.getRoomLinearDistance(origPos.roomName, destPos.roomName) > 2)) {
                allowedRooms = this.findAllowedRooms(origPos.roomName, destPos.roomName, options);
            }
            let callback = (roomName) => {
                if (options.roomCallback) {
                    let outcome = options.roomCallback(roomName, options.ignoreCreeps);
                    if (outcome !== undefined) {
                        return outcome;
                    }
                }
                if (allowedRooms) {
                    if (!allowedRooms[roomName]) {
                        return false;
                    }
                }
                else if (this.memory.hostileRooms[roomName] && !options.allowHostile) {
                    return false;
                }
                let room = Game.rooms[roomName];
                if (!room)
                    return;
                let matrix;
                if (options.ignoreStructures) {
                    matrix = new PathFinder.CostMatrix();
                    if (!options.ignoreCreeps) {
                        Traveler.addCreepsToMatrix(room, matrix, options.keepFromHostiles);
                    }
                }
                else if (options.ignoreCreeps || roomName !== origin.pos.roomName) {
                    matrix = this.getStructureMatrix(room);
                }
                else {
                    matrix = this.getCreepMatrix(room, options.keepFromHostiles);
                }
                for (let obstacle of options.obstacles) {
                    matrix.set(obstacle.pos.x, obstacle.pos.y, 0xff);
                }
                return matrix;
            };
            var pre = Game.cpu.getUsed();
            var path = PathFinder.search(origPos, { pos: destPos, range: options.range }, {
                swampCost: options.ignoreRoads ? 5 : 10,
                plainCost: options.ignoreRoads ? 1 : 2,
                maxOps: options.maxOps,
                roomCallback: callback
            });
            var used = Game.cpu.getUsed() - pre;
            //global.utils.stats.pathSearched(pre);
            //if (path.ops > 50) {
                //empire.pathManager.savePath(destPos, path);
            //}
            return path;
        }
        travelTo(creep, destination, options = {}) {
            // register hostile rooms entered
            let creepPos = creep.pos, destPos = (destination.pos || destination);
            if (creep.room.controller) {
                if (creep.room.controller.owner && !creep.room.controller.my) {
                    this.memory.hostileRooms[creep.room.name] = creep.room.controller.level;
                }
                else {
                    this.memory.hostileRooms[creep.room.name] = undefined;
                }
            }
            // initialize data object
            if (!creep.memory._travel) {
                creep.memory._travel = { stuck: 0, tick: Game.time, cpu: 0, count: 0 };
            }
            let travelData = creep.memory._travel;
            if (creep.fatigue > 0) {
                global.utils.circle(creep.pos, "aqua", 0.3)
                travelData.tick = Game.time;
                return ERR_BUSY;
            }
            if (!destination) {
                return ERR_INVALID_ARGS;
            }
            
            
            
            // manage case where creep is nearby destination
            let rangeToDestination = creep.pos.getRangeTo(destPos);
            if (rangeToDestination <= 1) {
                let outcome = OK;
                if (rangeToDestination === 1) {
                    outcome = creep.move(creep.pos.getDirectionTo(destPos));
                }
                if (options.returnPosition && outcome === OK) {
                    return destPos;
                }
                else {
                    return outcome;
                }
            }
            // check if creep is stuck
            let hasMoved = true;
            if (travelData.prev) {
                travelData.prev = new RoomPosition(travelData.prev.x, travelData.prev.y, travelData.prev.roomName);
                if (creepPos.inRangeTo(travelData.prev, 0)) {
                    hasMoved = false;
                    global.utils.circle(creepPos, "fuchsia", travelData.stuck * .2);
                    travelData.stuck++;
                }
                else {
                    travelData.stuck = 0;
                }
            }
            
            
            global.utils.circle(destPos, "orange", 0.3)
            // handle case where creep is stuck
            if (travelData.stuck >= gOpts.defaultStuckValue) {
                if (options.ignoreStuck) {
                    console.log(creep, "------------------------ignoring stuck")
                    if (options.returnPosition && travelData.path && travelData.path.length > 0) {
                        let direction = parseInt(travelData.path[0]);
                        return Traveler.positionAtDirection(creepPos, direction);
                    }
                    else {
                        return OK;
                    }
                }
                else {
                    console.log(creep, "is stuck, repathin")
                    options.ignoreCreeps = false;
                    delete travelData.path;
                }
            }
            //if the creep is on an room exit, reset path without ignore creeps.  
            if (creep.pos.x == 0 || creep.pos.y == 0 || creep.pos.x == 49 || creep.pos.y == 49) {
                options.ignoreCreeps = false;
                delete travelData.path;
            }
            
            if (options.repath) {
                options.ignoreCreeps = false;
                delete travelData.path;
            }
            
            // handle case where creep wasn't traveling last tick and may have moved, but destination is still the same
            // if (Game.time - travelData.tick > 1 && hasMoved) {
            //     delete travelData.path;
            // }
            travelData.tick = Game.time;
            // delete path cache if destination is different
            if (!travelData.dest || travelData.dest.x !== destPos.x || travelData.dest.y !== destPos.y ||
                travelData.dest.roomName !== destPos.roomName) {
                delete travelData.path;
            }
            
            // //if creep isn't stuck and has no path, try using flow fields
            // var moveDir = empire.pathManager.getFlowDir(destPos, creep.pos);
            // if (moveDir && !travelData.stuck && !travelData.path) {
            //     creep.say("flowin " + moveDir);
            //     creep.move(moveDir);
            //     global.utils.stats.flowUsed();
            //     travelData.prev = creep.pos;
            //     global.utils.circle(destPos, "red", 0.3)
            //     return OK;
            // }
            // global.utils.stats.pathUsed();
            // creep.say("pathin " + moveDir)
            
            // pathfinding
            if (!travelData.path) {
                if (creep.spawning)
                    return ERR_BUSY;
                travelData.dest = destPos;
                let cpu = Game.cpu.getUsed();
                
                let ret = 0;
                
                travelData.prev = undefined;
                ret = this.findTravelPath(creep, destPos, options);
                travelData.cpu += (Game.cpu.getUsed() - cpu);
                travelData.count++;
                if (travelData.cpu > gOpts.reportThreshold) {
                    console.log(`TRAVELER: heavy cpu use: ${creep.name}, cpu: ${_.round(travelData.cpu, 2)}, pos: ${creep.pos}`);
                }
                if (ret.incomplete) {
                    console.log(`TRAVELER: incomplete path for ${creep.name}`);
                    if (ret.ops < 2000 && options.useFindRoute === undefined && travelData.stuck < gOpts.defaultStuckValue) {
                        options.useFindRoute = false;
                        ret = this.findTravelPath(creep, destPos, options);
                        console.log(`attempting path without findRoute was ${ret.incomplete ? "not" : ""} successful`);
                    }
                }
                travelData.path = Traveler.serializePath(creep.pos, ret.path);
                travelData.stuck = 0;
                
            }
            if (!travelData.path || travelData.path.length === 0) {
                return ERR_NO_PATH;
            }
            // consume path and move
            if (travelData.prev && travelData.stuck === 0) {
                travelData.path = travelData.path.toString().substr(1);
            }
            travelData.prev = creep.pos;
            let nextDirection = parseInt(travelData.path[0]);
            let outcome = creep.move(nextDirection);
            if (!options.returnPosition || outcome !== OK) {
                return outcome;
            }
            else {
                return Traveler.positionAtDirection(creep.pos, nextDirection);
            }
        }
        refreshMatrices() {
            if (Game.time !== this.currentTick) {
                this.currentTick = Game.time;
                this.structureMatrixCache = {};
                this.creepMatrixCache = {};
            }
        }
        getStructureMatrix(room) {
            this.refreshMatrices();
            if (!this.structureMatrixCache[room.name]) {
                let matrix = new PathFinder.CostMatrix();
                this.structureMatrixCache[room.name] = Traveler.addStructuresToMatrix(room, matrix, 1);
            }
            return this.structureMatrixCache[room.name];
        }
        static addStructuresToMatrix(room, matrix, roadCost) {
            for (let structure of room.find(FIND_STRUCTURES)) {
                if (structure instanceof StructureRampart) {
                    if (!structure.my && !structure.isPublic) {
                        matrix.set(structure.pos.x, structure.pos.y, 0xff);
                    }
                }
                else if (structure instanceof StructureRoad) {
                    matrix.set(structure.pos.x, structure.pos.y, roadCost);
                }
                else if (structure.structureType !== STRUCTURE_CONTAINER) {
                    // Can't walk through non-walkable buildings
                    matrix.set(structure.pos.x, structure.pos.y, 0xff);
                }
            }
            for (let site of room.find(FIND_CONSTRUCTION_SITES)) {
                if (site.structureType === STRUCTURE_CONTAINER || site.structureType === STRUCTURE_ROAD || !site.my) {
                    continue;
                }
                matrix.set(site.pos.x, site.pos.y, 0xff);
            }
            return matrix;
        }
        getCreepMatrix(room, keepFromHostiles) {
            this.refreshMatrices();
            if (!this.creepMatrixCache[room.name]) {
                this.creepMatrixCache[room.name] = Traveler.addCreepsToMatrix(room, this.getStructureMatrix(room).clone(), keepFromHostiles);
            }
            return this.creepMatrixCache[room.name];
        }
        static addCreepsToMatrix(room, matrix, keepFromHostiles) {
            room.find(FIND_CREEPS).forEach(function(creep) {
                //console.log("here????????", creep.isHostile(), creep)
                if (creep.isHostile() && keepFromHostiles) {
                    if (keepFromHostiles === true) {
                        keepFromHostiles = 3;
                    }
                    //console.log("-------------------------", creep.pos.roomName, creep.pos, keepFromHostiles)
                    //console.log(JSON.stringify(matrix))
                    global.utils.setInRange(matrix, creep.pos.x, creep.pos.y, keepFromHostiles, 0xff)
                } else {
                    //console.log(creep, "here")
                    matrix.set(creep.pos.x, creep.pos.y, 0xff)
                }
                
            });
            //console.log(matrix.visual, "------------------------------------------", global.utils.visual);
            //global.utils.visual(matrix, room.name)
            return matrix;
        }
        static serializePath(startPos, path, color) {
            if (!color) {
                color = "orange"
            }
            global.utils.circle(startPos, color, 0.3);
            let serializedPath = "";
            let lastPosition = startPos;
            for (let position of path) {
                if (position.roomName === lastPosition.roomName) {
                    new RoomVisual(position.roomName)
                    .line(position, lastPosition, {color: color, lineStyle: "dashed"});
                    serializedPath += lastPosition.getDirectionTo(position);
                }
                lastPosition = position;
            }
            return serializedPath;
        }
        static positionAtDirection(origin, direction) {
            let offsetX = [0, 0, 1, 1, 1, 0, -1, -1, -1];
            let offsetY = [0, -1, -1, 0, 1, 1, 1, 0, -1];
            return new RoomPosition(origin.x + offsetX[direction], origin.y + offsetY[direction], origin.roomName);
        }
    }    

    if(gOpts.installTraveler){
        global.Traveler = Traveler;
        global.traveler = new Traveler();
        global.travelerTick = Game.time;
    }

    if(gOpts.installPrototype){
        // prototype requires an instance of traveler be installed in global
        if(!gOpts.installTraveler) {
            global.traveler = new Traveler();
            global.travelerTick = Game.time;
        }

        Creep.prototype.travelTo = function (destination, options) {
            if(global.traveler && global.travelerTick !== Game.time){
                global.traveler = new Traveler();
            }
            return traveler.travelTo(this, destination, options);
        };
    }

    if(gOpts.exportTraveler){
        return Traveler;
    }
}