/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('pr.empire.intel');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("pr.empire.intel");
logger.enabled = false;

//let process = require("pos2.process");
let processClass = require("INeRT.process");
let threadClass = require("INeRT.thread");


class intelProc extends processClass {
    init() {
        if (!Memory.rooms) {
            Memory.rooms = {};
        }
    }
    
    initTick() {
        for(let roomName in Game.rooms) {
            let room = Game.rooms[roomName];
            //if (!room.memory.lastUpdate || room.memory.lastUpdate <= (Game.time - 10)) {
                //build or update room intel
                //logger.log("here!", room);
                this.updateRoomIntel(roomName);
                room.memory.lastUpdate = Game.time;
            //}
        }
    }
    
    endTick() {
        
    }
    getRoomIntel(roomName) {
        //logger.log(roomName, "get intel!---------------------", JSON.stringify(Memory.rooms[roomName].intel))
        if (!Memory.rooms[roomName]) {
            Memory.rooms[roomName] = {};
        }
        let intel = Memory.rooms[roomName].intel;
        if (!intel || !intel.sources) {
            this.updateRoomIntel(roomName);
            intel = Memory.rooms[roomName].intel;
        }
        logger.log(roomName, "got intel", intel);
        return intel;
    }
    updateRoomIntel(roomName) {
        let room = Game.rooms[roomName];
        if (!Memory.rooms) {
            Memory.rooms = {};
        }
        if (!Memory.rooms[roomName]) {
            Memory.rooms[roomName] = {};
        }
        if (!Memory.rooms[roomName].intel) {
            Memory.rooms[roomName].intel = {seen:false,structures:[]}
        }
        let intel = Memory.rooms[roomName].intel;
        
        //stash info about the controller
        if (!intel.controller && (room && !intel.seen && room.controller)) {
            intel.controller = {
                id: room.controller.id,
                pos: room.controller.pos
            }
        }
        intel.structures = {};
        this.updateSources(intel, roomName, room);
        if (room) {
            this.updateEnemyCreeps(intel, room);
            this.updateDefcon(intel, room);
            this.updateStructures(intel, room);
        }
        
        
        if (room && !intel.seen) {
            intel.seen = Game.time;
        }
        Memory.rooms[roomName].intel = intel;
    }
    
    updateSources(intel, roomName, room) {
        //stash info about the sources in the room
        if (room && !intel.sources || (!intel.sourcesSeen && room)) {
            logger.log("loading sources");
            //if we have a room, load the sources. 
            let sources = room.find(FIND_SOURCES);
            let index = 0;
            let sourceData = [];
            for(let s in sources) {
                let source = sources[s];
                let data = {
                    id:source.id,
                    pos:source.pos
                };
                sourceData.push(data);
            }
            intel.sources = sourceData;
            intel.sourcesSeen = true;
        
        } else if(!intel.sourcesSeen && !intel.flagsUsed) {
            //never had visiblity, check for flags
            let sourceFlags = global.utils.allFlagsByColor(COLOR_YELLOW, COLOR_YELLOW, roomName);
            let sourceData = [];
            for(let f in sourceFlags) {
                let flag = sourceFlags[f];
                let data = {
                    id: false,
                    pos: flag.pos
                }
                sourceData.push(data);
                flag.remove();
            }
            intel.sources = sourceData;
            intel.flagsUsed = true;
        }
    }
    
    updateStructures(intel, room) {
        intel.structures = {};
        intel.structures.spawns = [];
        intel.structures.extensions = [];
        intel.structures.roads = [];
        intel.structures.containers = [];
        intel.structures.links = [];
        intel.structures.towers = [];
        intel.structures.walls = [];
        intel.structures.ramparts = [];
        let structs = room.find(FIND_STRUCTURES);
        for(let s in structs) {
            let struct = structs[s];
            
            let structData = {
                id: struct.id,
                pos: struct.pos
            }
            switch(struct.structureType) {
                case STRUCTURE_SPAWN:
                        intel.structures.spawns.push(structData);
                    break;
                case STRUCTURE_EXTENSION:
                        intel.structures.extensions.push(structData);
                    break;
                case STRUCTURE_ROAD:
                    //logger.log("found road")
                        intel.structures.roads.push(structData);
                    break;
                case STRUCTURE_CONTAINER:
                        intel.structures.containers.push(structData);
                    break;
                case STRUCTURE_LINK:
                        intel.structures.links.push(structData);
                    break;
                case STRUCTURE_TOWER:
                        intel.structures.towers.push(structData);
                    break;
                case STRUCTURE_WALL:
                        intel.structures.walls.push(structData);
                    break;
                case STRUCTURE_RAMPART:
                        intel.structures.ramparts.push(structData);
                    break;
                default:
                    break;
            }
        }
        
        
    }
    
    updateEnemyCreeps(intel, room) {
        intel.creeps = {};
        intel.creeps.invaders = [];
        intel.creeps.sourceKeepers = [];
        intel.creeps.enemies = [];
            
        let guys = room.find(FIND_HOSTILE_CREEPS);
        for(let c in guys) {
            let badGuy = guys[c];
            
            if (badGuy.owner.username == "Invader") {
                intel.creeps.invaders.push(badGuy);
            } else if(badGuy.owner.username == "Source Keeper") {
                intel.creeps.sourceKeepers.push(badGuy);
            } else {
                intel.creeps.enemies.push(badGuy);
            }
        }
    }
    
    updateDefcon(intel, room) {
        let defcon = 0;
        //make sure we have creep data
        if (intel.creeps) {
            if (intel.creeps.invaders.length > 0) {
                defcon = 1;
            }
            if (intel.creeps.enemies.length > 0) {
                defcon = 2;
            }
        }
        
        intel.defcon = defcon;
    }
}



module.exports = intelProc;