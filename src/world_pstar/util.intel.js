var logger = require("screeps.logger");
logger = new logger("util.intel");
//logger.enabled = false;

//let process = require("pos2.process");

let arrayHelpers = require("util.array");
let IndexingCollection = arrayHelpers.classes.IndexingCollection;

let visual = require("util.visual");
let WorldPosition = require('util.worldposition')

class RoomStatus {

    static get ROOM_STATUS_OWNED() {return "owned"};
    static get ROOM_STATUS_RESERVED() {return "reserved"};

    static get ROOM_STATUS_ENEMY_OWNED() {return "enemyOwned"};
    static get ROOM_STATUS_ENEMY_RESERVED() {return "enemyReserved"};

    static get ROOM_STATUS_NEUTRAL() {return "neutral"};
    static get ROOM_STATUS_HIGHWAY() {return "highwayRoom"};
    static get ROOM_STATUS_MIDDLEROOM() {return "middleRoom"}


    constructor() {
        this.level = 0;
        this.defcon = 0;
        this.status = "";
    }

    display() {
        //logger.log("roomStatus", this.level, this.defcon, this.status);
        //meh
    }

    serialize() {
        let vals = [
            this.level,
            this.defcon,
            this.status
        ];
        return vals.join("է");
    }

    static deserialize(str) {
        let arr = str.split("է");
        let inst = new RoomStatus();
        inst.level = Number.parseInt(arr[0]);
        inst.defcon = Number.parseInt(arr[1]);
        inst.status = arr[2];
        return inst;
    }
}

class RoomObjectIntel {
    constructor(id, pos, type, owner=false) {
        /** @type {String} */
        this.id = id;

        /** @type {RoomPosition} */
        this.pos = pos;

        this.type = type;
        this.owner = owner;

        this._inst = false;
    }

    getInst() {
        if (!this._inst) {
            this._inst = Game.getObjectById(this.id);
        }
        if (this._inst == null) this._inst = false;

        return this._inst;
    }

    display() {
        //logger.log("RoomObjectIntel", this.id, this.type, this.pos);
        visual.drawText(this.type, this.pos);
    }

    serialize() {
        let arr = [
            this.id,
            this.pos.toWorldPosition().serialize(),
            this.type,
            this.owner
        ]
        return arr.join("ը")
    }

    static deserialize(str) {
        let arr = str.split("ը");
        let id = arr[0];
        let pos = WorldPosition.deserialize(arr[1]).toRoomPosition();
        let type = arr[2];
        let owner = arr[3];
        let inst = new RoomObjectIntel(id, pos, type, owner);
        return inst;
    }
}


class RoomIntel {


    constructor(roomName) {
        this.roomName = roomName;
        /** @type IndexingCollection */
        this.structures = new IndexingCollection("id", ["structureType"], [2000, 2000, 4000]);
        /** @type IndexingCollection */
        this.sources = new IndexingCollection("id", [], [5,5]);
        /** @type IndexingCollection */
        this.minerals = new IndexingCollection("id", [], [5,5]);
        /** @type IndexingCollection */
        this.deposits = new IndexingCollection("id", [], [5,5]);

        /** @type IndexingCollection */
        this.creeps = new IndexingCollection("id", ["owner"], [200, 200, 400]);
        /** @type IndexingCollection */
        this.powerCreeps = new IndexingCollection("id", ["owner"], [200, 200, 400]);
        /** @type IndexingCollection */
        this.npcs = new IndexingCollection("id", ["owner"], [200, 200, 400]);

        /** @type {RoomStatus} */
        this.status = new RoomStatus();

        /** @type {RoomObjectIntel} */
        this.controller = false;

        /** @type IndexingCollection */
        this.droppedResources = new IndexingCollection("id", [], [50,50]);
        /** @type IndexingCollection */
        this.tombstones = new IndexingCollection("id", [], [50,50]);
        /** @type IndexingCollection */
        this.ruins = new IndexingCollection("id", [], [50,50]);


        this.lastUpdated = 0;
        this.ticksValid = 5;
    }

    display() {
        let collections = [
            this.structures,
            this.sources,
            this.minerals,
            this.deposits,
            this.creeps,
            this.powerCreeps,
            this.npcs,
            this.droppedResources,
            this.tombstones,
            this.ruins
        ]

        for(let c in collections) {
            /** @type {IndexingCollection} */
            let coll = collections[c];
            coll.forEach((i) => {
                i.display();
            })
        }

        let status = [];
        status.push("Defcon: " + this.status.defcon);
        status.push("Level: " + this.status.level);
        status.push("Status: " + this.status.status);
        visual.drawTextLines(status, new RoomPosition(1,1, this.roomName))
        //this.status.display();
        if (this.controller) {
            this.controller.display();
        }
    }

    getDisplayLines() {
        let collections = {
            structures: this.structures,
            sources: this.sources,
            minerals: this.minerals,
            deposits: this.deposits,
            creeps: this.creeps,
            powerCreeps: this.powerCreeps,
            npcs: this.npcs,
            droppedShit: this.droppedResources,
            dedpeeps: this.tombstones,
            dedshit: this.ruins
        }
        let status = [];

        for(let c in collections) {
            /** @type {IndexingCollection} */
            let coll = collections[c];
            status.push(c + ":" + coll.getAll().length);
        }


        status.push("Defcon: " + this.status.defcon);
        status.push("Level: " + this.status.level);
        status.push("Status: " + this.status.status);
        return status;
    }


    needsUpdating() {
        logger.log(this.roomName, "needs updating?", this.lastUpdated + this.ticksValid, Game.time, (this.lastUpdated + this.ticksValid) < Game.time)
        return (this.lastUpdated + this.ticksValid) < Game.time;
    }

    /**
     * Updates all the static items in the room.  Sources, controller, etc
     * @param {Room} room
     */
    updateStaticStructures(room) {
        logger.log("updating static structures", room.name);
        let sources = room.find(FIND_SOURCES);
        for(let s in sources) {
            let source = sources[s];
            if (!this.sources.hasId(source.id)) {
                let objIntel = new RoomObjectIntel(source.id, source.pos, "source");
                this.sources.add(objIntel);
                logger.log("adding source", source.id, source.pos, objIntel.serialize())
            } else {
                logger.log("source already there?????")
            }
        }

        let minerals = room.find(FIND_MINERALS);
        for(let m in minerals) {
            let mineral = minerals[m];
            if (!this.minerals.hasId(mineral.id)) {
                let objIntel = new RoomObjectIntel(mineral.id, mineral.pos, "mineral");
                this.minerals.add(objIntel);
            }
        }

        let deposits = room.find(FIND_DEPOSITS);
        for(let s in deposits) {
            let deposit = deposits[s];
            if (!this.deposits.hasId(deposit.id)) {
                let objIntel = new RoomObjectIntel(deposit.id, deposit.pos, "deposit");
                this.deposit.add(objIntel);
            }
        }

        let controller = room.controller;
        if (controller) {
            let objIntel = new RoomObjectIntel(controller.id, controller.pos, "controller");
            this.controller = objIntel;
        }

    }


    updateStructures(room) {
        logger.log("updating structures", room.name);
        this.structures = new IndexingCollection(this.structures.idField, this.structures.groupByFields, this.structures.limits);
        let structures = room.find(FIND_STRUCTURES);
        for(let s in structures) {
            /** @type {Structure} */
            let structure = structures[s];
            if (!this.structures.hasId(structure.id) && structure.structureType != STRUCTURE_CONTROLLER) {
                let objIntel = new RoomObjectIntel(structure.id, structure.pos, structure.structureType, structure.owner ? structure.owner.username : false);
                this.structures.add(objIntel);
            }
        }

        this.lastUpdated = Game.time;
    }

    updateCreeps(room) {
        //logger.log("updating creeps", room.name);
        this.creeps = new IndexingCollection(this.creeps.idField, this.creeps.groupByFields, this.creeps.limits);
        let creeps = room.find(FIND_CREEPS);
        for(let c in creeps) {
            let creep = creeps[c];
            let objIntel = new RoomObjectIntel(creep.id, creep.pos, "creep", creep.owner.username);
            if (creep.owner.username == "Invader" || creep.owner.username == "Source Keeper") {
                objIntel.type = "npc";
                this.npcs.add(objIntel);
            } else {
                this.creeps.add(objIntel);
            }

        }


        this.powerCreeps = new IndexingCollection(this.powerCreeps.idField, this.powerCreeps.groupByFields, this.powerCreeps.limits);
        let pcs = room.find(FIND_POWER_CREEPS);
        for(let c in pcs) {
            let creep = pcs[c];
            let objIntel = new RoomObjectIntel(creep.id, creep.pos, "powerCreep", creep.owner.username);
            this.powerCreeps.add(objIntel);
        }
    }

    updateRuinsAndTombStones(room) {
        //logger.log("updating ruins and tombstones", room.name);
        this.ruins = new IndexingCollection(this.ruins.idField, this.ruins.groupByFields, this.ruins.limits);
        let ruins = room.find(FIND_RUINS);
        for(let r in ruins) {
            let ruin = ruins[r];
            if (!this.ruins.hasId(ruin.id)) {
                let objIntel = new RoomObjectIntel(ruin.id, ruin.pos, "ruin");
                this.ruins.add(objIntel);
            }
        }

        this.tombstones = new IndexingCollection(this.tombstones.idField, this.tombstones.groupByFields, this.tombstones.limits);
        let tombstones = room.find(FIND_TOMBSTONES);
        for(let r in tombstones) {
            let tombstone = tombstones[r];
            if (!this.tombstones.hasId(tombstone.id)) {
                let objIntel = new RoomObjectIntel(tombstone.id, tombstone.pos, "tombstone");
                this.tombstones.add(objIntel);
            }
        }

        this.droppedResources = new IndexingCollection(this.droppedResources.idField, this.droppedResources.groupByFields, this.droppedResources.limits);
        let droppedResources = room.find(FIND_DROPPED_RESOURCES);
        for(let r in droppedResources) {
            let droppedResource = droppedResources[r];
            if (!this.droppedResources.hasId(droppedResource.id)) {
                let objIntel = new RoomObjectIntel(droppedResource.id, droppedResource.pos, "droppedResource");
                this.droppedResources.add(objIntel);
            }
        }
    }

    /**
     * by this point all the objects should have been found and indexed, so we can use that info for decisions.
     * @param {Room} room
     */
    updateStatus(room) {
        //logger.log("updating status", room.name);
        let allCreeps = this.creeps.getAll();
        let enemyCreeps = [];
        for(let c in allCreeps) {
            let creep = allCreeps[c];
            if (creep.owner != (Game.spawns[Object.keys(Game.spawns)[0]].owner.username)) {
                enemyCreeps.push(creep);
            }
        }

        this.status.defcon = 0;
        if (this.npcs.length > 0) {
            this.status.defcon = 1;
        }
        if (enemyCreeps.length > 0) {
            this.status.defcon = 2;
        }


        if (!this.controller) {
            if (this.sources.length > 0) { //gotta be an SK room
                this.status.status = RoomStatus.ROOM_STATUS_MIDDLEROOM;
            } else {
                this.status.status = RoomStatus.ROOM_STATUS_HIGHWAY;
            }
            return;
        }


        /** @type {StructureController} */
        let controller = Game.getObjectById(this.controller.id);
        let username = Game.spawns[Object.keys(Game.spawns)[0]].owner.username;
        this.status.status = RoomStatus.ROOM_STATUS_NEUTRAL;
        if (controller.owner) {
            if (controller.owner.username == username) {
                this.status.status = RoomStatus.ROOM_STATUS_OWNED;
            } else {
                this.status.status = RoomStatus.ROOM_STATUS_ENEMY_OWNED;
            }
        } else if (controller.reservation) {
            if (controller.reservation.username == username) {
                this.status.status = RoomStatus.ROOM_STATUS_RESERVED;
            } else {
                this.status.status = RoomStatus.ROOM_STATUS_ENEMY_RESERVED;
            }
        }

        if (controller) {
            //logger.log("got controller", controller.level)
            this.status.level = controller.level;
        } else {
            //logger.log("no controller!", this.roomName)
        }


    }

    serialize() {

        let arr = [
            this.roomName,
            this.structures.serialize(),
            this.sources.serialize(),
            this.minerals.serialize(),
            this.deposits.serialize(),
            this.creeps.serialize(),
            this.powerCreeps.serialize(),
            this.npcs.serialize(),
            this.status.serialize(),
            this.controller ? this.controller.serialize() : false,
            this.droppedResources.serialize(),
            this.tombstones.serialize(),
            this.ruins.serialize(),
            this.lastUpdated
        ];
        //logger.log("-0---------------------------------------------")
        //logger.log(arr.join("թ"));
        return arr.join("թ");
    }

    static deserialize(str) {
        let arr = str.split("թ");
        let inst = new RoomIntel(arr[0]);
        if (arr[1]) {
            logger.log(arr);
            inst.structures = IndexingCollection.deserialize(arr[1], RoomObjectIntel);
        }
        if (arr[2]) {
            inst.sources = IndexingCollection.deserialize(arr[2], RoomObjectIntel);
        }
        if (arr[3]) {
            inst.minerals = IndexingCollection.deserialize(arr[3], RoomObjectIntel);
        }
        if (arr[4]) {
            inst.deposits = IndexingCollection.deserialize(arr[4], RoomObjectIntel);
        }
        if (arr[5]) {
            inst.creeps = IndexingCollection.deserialize(arr[5], RoomObjectIntel);
        }
        if (arr[6]) {
            inst.powerCreeps = IndexingCollection.deserialize(arr[6], RoomObjectIntel);
        }
        if (arr[7]) {
            inst.npcs = IndexingCollection.deserialize(arr[7], RoomObjectIntel);
        }
        if (arr[8]) {
            inst.status = RoomStatus.deserialize(arr[8])
        }
        if (arr[9] && arr[9] != "false") {
            inst.controller = RoomObjectIntel.deserialize(arr[9]);
        }
        if (arr[10]) {
            inst.droppedResources = IndexingCollection.deserialize(arr[10], RoomObjectIntel);
        }
        if (arr[11]) {
            inst.tombstones = IndexingCollection.deserialize(arr[11], RoomObjectIntel);
        }
        if (arr[12]) {
            inst.ruins = IndexingCollection.deserialize(arr[12], RoomObjectIntel);
        }
        if (arr[13]) {
            inst.lastUpdated = Number.parseInt(arr[13]);
        }

        return inst;
    }
}


module.exports = {
    classes: {
        RoomObjectIntel,
        RoomIntel,
        RoomStatus
    },
}
