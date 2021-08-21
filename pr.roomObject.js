let logger = require("screeps.logger");
logger = new logger("pr.roomObject");
//logger.color = COLOR_GREY;

let processClass = require("INeRT.process");
let threadClass = require("INeRT.thread");


let roomIntel = global.utils.intel.classes.RoomIntel;
let roomStatus = global.utils.intel.classes.RoomStatus;

let CreepRequest = global.utils.creep.classes.CreepRequest;
let CreepManager = require("pr.creepManager");

let actionTypes = global.utils.action.classes.actionTypes;
let actionMap = global.utils.action.actionMap;
let baseAction = global.utils.action.classes.baseAction;

class roomObject extends processClass {
    init() {
        this.mainThread = false;
        
        this.creepManager = this.kernel.getProcess("creepManager");
        this.actionManager = this.kernel.getProcess("actionManager");
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

            if (this.data.intel.type == "source") {
                this.mainThread = this.createThread("runSource", "rooms");
            }

            if (this.data.intel.type == "droppedResource") {
                this.mainThread = this.createThread("runDroppedShit", "rooms");
            }

            





            if (this.mainThread) {
                this.kernel.startThread(this.mainThread);
            }

            if (this.creepThread) {
                this.kernel.startThread(this.creepThread);
            }
        }
    }

    runDroppedShit() {
        let target = this.getObject();
        logger.log('setting up dropped shit action', target, )
        if (!target) {
            return threadClass.DONE;
        }

        let action = this.getAction(actionTypes.PICKUP, (action) => {})
        action.resourceAmounts[target.resourceType] = target.amount;
    }
    
    runSource() {
        
        let action = this.getAction(actionTypes.MINE, (action) => {
            action.maxAssignments= this.data.pos.getSurroundingClearSpaces().length;
            action.resourceAmounts[RESOURCE_ENERGY] = 1500;
        });

        let dropAction = this.getAction(actionTypes.DROP, (action) => {
            action.resourceAmounts[RESOURCE_ENERGY] = 1000;
            action.targetRange=1;
            action.maxRange=3;
        });

        /** @type {Source} */
        let source = this.getObject();
        if (source) {
            action.resourceAmounts[RESOURCE_ENERGY] = source.energy;
            //logger.log(source, "updated task", action.id)
        }
    }


    getAction(actionType, initFN = (a) => {}) {
        if (!this.actions) {
            this.actions = {};
        }
        if (!this.actions[actionType]) {
            this.actions[actionType] = global.utils.action.createAction(actionType, this.data.targetId, this.data.pos, {});
            initFN(this.actions[actionType]);
            this.actionManager.addAction(this.actions[actionType]);
            
        }

        return this.actions[actionType];
    }

    runSpawn() {
        logger.log("spawn running!");
        /** @type {CreepManager} */
        let creepManager = this.kernel.getProcess("creepManager");
        /** @type {StructureSpawn} */
        let spawn = this.getObject();

        //setup fill action
        let fillAction = this.getAction(actionTypes.DROPOFF_SPAWN);
        fillAction.resourceAmounts[RESOURCE_ENERGY] = spawn.store.getFreeCapacity(RESOURCE_ENERGY);


        if (!this.spawnQueue || (this.spawnQueueUpdated + this.spawnQueueValid < Game.time)) {
            //logger.log(spawn, "updating spawn queue")
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
        //logger.log("-------------------------------------------")
        //logger.log(this.data.roomName, "object" , JSON.stringify(this.data))
    }
}

module.exports = roomObject;