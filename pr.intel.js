var logger = require("screeps.logger");
logger = new logger("pr.empire.intel");
//logger.enabled = false;

//let process = require("pos2.process");
let processClass = require("INeRT.process");
let threadClass = require("INeRT.thread");

let IndexingCollection = global.utils.array.classes.IndexingCollection;
let pstarClass = require("pr.pStar");

let RoomIntel = global.utils.intel.classes.RoomIntel;


class intelProc extends processClass {
    init() {
        
        this.intel = new IndexingCollection("roomName", ["status.status"], [20000, 20000, 1000000]);
        this.intel.serializeSeperator = "ժ";
    }
    
    initThreads() {
        return [
            this.createThread("loadIntel", "empire"),
            this.createThread("saveIntel", "work"),
            this.createThread("gatherIntel", "empire"),
            //this.createThread("displayIntel", "work")
        ]
    }

    displayIntel() {
        this.intel.forEach((i) => {
            //logger.log("displaying", i.roomName)
            i.display()
        })
    }
    /**
     * Handles gathering intel
     */
    gatherIntel() {
        for(let roomName in Game.rooms) {
            let room = Game.rooms[roomName];
            /** @type {RoomIntel} */
            let roomIntel;
            if (!this.intel.hasId(roomName)) {
                roomIntel = new RoomIntel(roomName);
                this.intel.add(roomIntel);
            } else {
                roomIntel = this.intel.getById(roomName);
            }
            
            if (roomIntel.lastUpdated == 0) {
                //update static structures
                roomIntel.updateStaticStructures(room);
            }

            if (roomIntel.needsUpdating()) {
                //grab structure intel
                roomIntel.updateStructures(room);
            }


            //grab creep intel
            roomIntel.updateCreeps(room);
            roomIntel.updateRuinsAndTombStones(room);
            roomIntel.updateStatus(room);
        }
    }

    getRoomIntel(roomName) {
        return this.intel.getById(roomName);
    }

    getAllIntel() {
        return this.intel.thingsById;
    }

    /**
     * load intel from Memory
     */
    loadIntel() {
        if (Memory.intel) {
            logger.log("loading intel:", Memory.intel)
            this.intel = IndexingCollection.deserialize(Memory.intel, RoomIntel);
        }
        return threadClass.DONE;
    }

    /**
     * Saves the intel to memory
     */
    saveIntel() {
        logger.log("------------------------------------serialize intel-------------")
        let start = Game.cpu.getUsed();
        Memory.intel = this.intel.serialize();
        let used = Game.cpu.getUsed() - start;
        logger.log("intel serialized.  CPU used:", used, " data length:", Memory.intel.length, "num rooms", this.intel.getAll().length)
        return 10;
    }
}

module.exports = intelProc;