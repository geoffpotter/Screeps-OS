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
//logger.enabled = false;

//let process = require("pos2.process");
let processClass = require("INeRT.process");
let threadClass = require("INeRT.thread");


let pstarClass = require("pr.pStar");

class intelProc extends processClass {
    init() {
        if (!Memory.rooms) {
            Memory.rooms = {};
        }

        /** @type {pstarClass} */
        this.pStar = false;
    }
    
    initTick() {
        if (!this.pStar) {
            this.pStar = this.kernel.getProcess("pStar");
        }
        let roomsUpdated = 0;
        let updateLimit = 3;
        for(let roomName in Game.rooms) {
            let room = Game.rooms[roomName];
            if (!room.memory.lastUpdate || room.memory.lastUpdate <= (Game.time - 2000)) {
                //build or update room intel
                logger.log("here!", room);
                this.updateRoomIntel(roomName);
                room.memory.lastUpdate = Game.time;
            }
            roomsUpdated++;
            if (roomsUpdated > updateLimit) {
                break;
            }
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
            this.pStar.addRoomExitNodes(room);
        }
        
        
        if (room && !intel.seen) {
            intel.seen = Game.time;
        }
        Memory.rooms[roomName].intel = intel;
    }
    
    

    updateSources(intel, roomName, room) {
        //stash info about the sources in the room
        if (room && (!intel.sources || (!intel.sourcesSeen && room) || (Game.time - intel.sourcesSeen) > 1000) ) {
            logger.log("loading sources");
            //if we have a room, load the sources. 
            let sources = room.find(FIND_SOURCES);
            let index = 0;
            let sourceData = [];
            let Node = this.pStar.nodeClass();
            for(let s in sources) {
                let source = sources[s];

                // //add sources to pStar 
                let pos = source.pos.getSurroundingClearSpaces()[0];
                logger.log("adding source", pos, source, source.pos, source.room, source.pos.getSurroundingClearSpaces())
                let node = new Node(pos, Node.STATIC_RESOURCE);
                logger.log("struct", this.pStar.hasNode(node), node.id)
                if (!this.pStar.hasNode(node)) {
                    this.pStar.addNode(node);
                }

                let data = {
                    id:source.id,
                    pos:source.pos
                };
                sourceData.push(data);
            }
            intel.sources = sourceData;
            intel.sourcesSeen = Game.time;
        
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
        let Node = this.pStar.nodeClass();
        for(let s in structs) {
            let struct = structs[s];
            
            let structData = {
                id: struct.id,
                pos: struct.pos
            }
            
            let type = Node.BUILDING;

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
                    type = false;
                    break;
            }

            //make node for structure and add to pStar
            
            
            
            if (struct.structureType == STRUCTURE_SPAWN) {
                //spawns are bases for now
                type = Node.BASE;
            } else if (struct.structureType == STRUCTURE_CONTROLLER) {
                //spawns are bases for now
                if (struct.my) {
                    type = Node.CONTROLLER_OWNED;
                } else if (struct.reservation && struct.reservation.username == Game.spawns[Object.keys(Game.spawns)[0]]) {
                    type = Node.CONTROLLER_RESERVED;
                }
                
            }
            if (type) {
                let pos = struct.pos;
                if (!pos.isClearSpace()) {
                    pos = pos.getSurroundingClearSpaces()[0];//use first available open spot for structs
                }
                let node = new Node(pos, type);
                logger.log("struct", this.pStar.hasNode(node), node.id)
                if (!this.pStar.hasNode(node)) {
                    this.pStar.addNode(node);
                }
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
                intel.creeps.invaders.push(badGuy.id);
            } else if(badGuy.owner.username == "Source Keeper") {
                intel.creeps.sourceKeepers.push(badGuy.id);
            } else {
                intel.creeps.enemies.push(badGuy.id);
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