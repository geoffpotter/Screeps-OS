let logger = require("screeps.logger");
logger = new logger("pr.roomManager");
//logger.color = COLOR_GREY;

let processClass = require("INeRT.process");
let threadClass = require("INeRT.thread");


let roomObjectClass = require("pr.roomObject");

let workerRoleClass = require("pr.role.worker");


let roomIntel = global.utils.intel.classes.RoomIntel;
let roomStatus = global.utils.intel.classes.RoomStatus;
let roomObjectIntel = global.utils.intel.classes.RoomObjectIntel;

class roomManager extends processClass {
    init() {
        this.mainThread = false;
    }

    get roomName() {
        return this.data.roomName;
    }

    /** @type {roomIntel} */
    get intel() {
        return this.data.intel;
    }

    initThreads() {
        return [
            this.createThread("tick", "rooms"),
            this.createThread("display", "work"),
            this.createThread("manageMainThread", "init")
        ]
    }

    manageMainThread() {
        if (!this.mainThread || this.mainThread.finished) {
            this.mainThread = false;
            if (this.intel.status.status == roomStatus.ROOM_STATUS_OWNED) {
                this.mainThread = this.createThread("ownedRoomManager", "rooms");    
            }
            //logger.log(this.roomName, this.intel.status.status, roomStatus.ROOM_STATUS_OWNED, this.intel.status.status == roomStatus.ROOM_STATUS_OWNED)
            //logger.log(this.roomName, "starting mainThread", this.mainThread, this.intel.status.status)
            
            if (this.mainThread) {
                this.kernel.startThread(this.mainThread);
            } else {
                //logger.log(this.roomName, "Has no main thread defined, this room ain't doin shit!")
            }
            
        } else {
            //logger.log(this.roomName, "main thread should be running..")
            //logger.log(this.mainThread);
        }


    }

    ownedRoomManager() {
        logger.log('here------------------');
        
        let nameFN = (o) => {
            //name function
            return this.roomName + "_" + o.type + "_" + o.id;
        };
        let dataFN = (o) => {
            //data function
            return {
                roomName: this.roomName,
                targetId: o.id,
                pos: o.pos,
                intel: o
            };
        };
        this.kernel.manageProcArray(this.intel.structures.getAll(), roomObjectClass, nameFN, dataFN);
        this.kernel.manageProcArray(this.intel.sources.getAll(), roomObjectClass, nameFN, dataFN);


        let workerRoleProcName = this.roomName + "-workers";
        let data = {
            roomName: this.roomName,
            pos: new RoomPosition(25, 25, this.roomName)
        }
        let workerProc = this.kernel.getProcess(workerRoleProcName);
        if (!workerProc) {
            workerProc = new workerRoleClass(workerRoleProcName, data);
            this.kernel.startProcess(workerProc);
        }
        workerProc.data = data;
    }





    tick() {
        logger.log(this.roomName, "Manager here!")
    }

    display() {
        let lines = [];
        lines.push(this.roomName + " RoomManager")
        let intelStatus = this.intel.getDisplayLines();
        lines = lines.concat(intelStatus);
        global.utils.visual.drawTextLines(lines, new RoomPosition(1, 1, this.roomName));
    }
}

module.exports = roomManager;