let logger = require("screeps.logger");
logger = new logger("pr.roomObject");
//logger.color = COLOR_GREY;

let processClass = require("INeRT.process");
let threadClass = require("INeRT.thread");


let roomIntel = global.utils.intel.classes.RoomIntel;
let roomStatus = global.utils.intel.classes.RoomStatus;

let CreepRequest = global.utils.creep.classes.CreepRequest;
let CreepManager = require("pr.creepManager");

class roomObject extends processClass {
    init() {
        this.mainThread = false;
        
        this.creepManager = this.kernel.getProcess("creepManager");
    }

    initThreads() {
        return [
            this.createThread("tick", "empire"),
            this.createThread('manageMainThread', "init")
        ];
    }

    get myCreeps() {
        return this.creepManager.getProcCreeps(this.name)
    }

    getObject() {
        let obj = Game.getObjectById(this.data.targetId);

        if (!obj) {
            return false;
        }
        return obj;
    }

    manageMainThread() {
        if (!this.mainThread) {
            if (this.data.intel.type == STRUCTURE_SPAWN) {
                this.mainThread = this.createThread("runSpawn", "rooms");
                this.creepThread = this.createThread("runSpawnCreeps", "creepMove");
            }

            if (this.mainThread) {
                this.kernel.startThread(this.mainThread);
                this.kernel.startThread(this.creepThread);
            }
        }
    }
    
    runSpawnCreeps() {
        let creeps = this.myCreeps;
        logger.log(this.getObject(), "running it's creeps", creeps.length);
        for(let c in creeps) {
            /** @type {Creep} */
            let creep = creeps[c];
            logger.log("running creep", creep, creep.memory, creep.name, creep.spawning);
            if (creep.spawning) {
                logger.log("skipping creep");
                
            } else {
                let dest = new RoomPosition(creep.memory.reqLoc.x, creep.memory.reqLoc.y, creep.memory.reqLoc.roomName);
                if (creep.pos.inRangeTo(dest, 2)) {
                    creep.memory.proc = creep.memory.targetProc;
                } else {
                    global.utils.pStar.inst.moveTo(creep, {pos: dest, range:1});
                }
            }
        }
        logger.log("is continue === break now??")
    }

    runSpawn() {
        logger.log("spawn running!");
        /** @type {CreepManager} */
        let creepManager = this.kernel.getProcess("creepManager");
        /** @type {StructureSpawn} */
        let spawn = this.getObject();
        if (!this.spawnQueue || (this.spawnQueueUpdated + this.spawnQueueValid < Game.time)) {
            logger.log(spawn, "updating spawn queue")
            this.spawnQueue = creepManager.getSpawnQueue(spawn);
            this.spawnQueueUpdated = Game.time;
            this.spawnQueueValid = 5;
        }



        if (spawn.room.energyAvailable > 50 && !spawn.spawning) {
            let creepToSpawn = this.spawnQueue[0];
            if (!creepToSpawn) {
                //yay we're full up on creeps yo.
                return;
            }
            /** @type {CreepRequest} */
            let req = creepToSpawn.req;
            
            let creepBody = req.buildBody(spawn);
            let creepMemory = req.buildMemory();
            creepMemory.proc = this.name;
            creepMemory.level = creepBody.level;
            let creepName = req.getAvailableCreepName(req.targetProc + "-" + creepBody.level);

            let ret = spawn.spawnCreep(creepBody.body, creepName, {memory: creepMemory});
            logger.log("spawning creep for", req.targetProc, creepName, JSON.stringify(creepMemory), JSON.stringify(creepBody));
            logger.log("spawning creep for", req.targetProc, creepName, ret);
        }
        logger.log("spawn queue", JSON.stringify(this.spawnQueue))
        this.displaySpawnQueue(this.spawnQueue);
        
    }

    displaySpawnQueue(queue) {
        let lines = [];
        for(let r in queue) {
            let reqInfo = queue[r];
            lines.push(reqInfo.effectivePriority + " " + reqInfo.req.targetProc);
        }
        let spawn = this.getObject();
        global.utils.visual.drawTextLines(lines, spawn.pos)
    }

    tick() {
        logger.log("-------------------------------------------")
        logger.log(this.data.roomName, "object" , JSON.stringify(this.data))
    }
}

module.exports = roomObject;