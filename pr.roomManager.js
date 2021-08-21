let logger = require("screeps.logger");
logger = new logger("pr.roomManager");
//logger.color = COLOR_GREY;

let processClass = require("INeRT.process");
let threadClass = require("INeRT.thread");


let actionManager = require("pr.actionManager");
let roomObjectClass = require("pr.roomObject");

let workerRoleClass = require("pr.role.worker");
let minerRoleClass = require("pr.role.miner");

let roomIntel = global.utils.intel.classes.RoomIntel;
let roomStatus = global.utils.intel.classes.RoomStatus;
let roomObjectIntel = global.utils.intel.classes.RoomObjectIntel;
let actionTypes = global.utils.action.classes.actionTypes;


class roomManager extends processClass {
    init() {
        this.mainThread = false;

        /** @type {actionManager} */
        this.actionManager = this.kernel.getProcess("actionManager");
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
        let sources = this.intel.sources.getAll();
        this.kernel.manageProcArray(this.intel.structures.getAll(), roomObjectClass, nameFN, dataFN);
        this.kernel.manageProcArray(this.intel.droppedResources.getAll(), roomObjectClass, nameFN, dataFN);
        this.kernel.manageProcArray(sources, roomObjectClass, nameFN, dataFN);

        //logger.log("here??", this.intel.sources)
        
        for(let s in sources) {
            let source = sources[s];
            let minerProcName = source.id + "-miner";
            let data = {
                roomName: this.roomName,
                sourceId: source.id,
                pos: source.pos
            }
            
            let minerProc = this.kernel.getProcess(minerProcName);
            logger.log('setting up miner proc', minerProcName, minerProc)
            if (!minerProc) {
                minerProc = new minerRoleClass(minerProcName, data);
                this.kernel.startProcess(minerProc);
            }
        }

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

        this.manageController();
    }



    manageController() {
        if (!this.praiseAction) {
            let amts = {};
            amts[RESOURCE_ENERGY] = 10000;
            this.praiseAction = global.utils.action.createAction(actionTypes.PRAISE, this.intel.controller.id, this.intel.controller.pos, amts);
            this.actionManager.addAction(this.praiseAction);
        }
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