let logger = require("screeps.logger");
logger = new logger("pr.creepManager");
//logger.color = COLOR_GREY;

let processClass = require("INeRT.process");
let threadClass = require("INeRT.thread");

let IndexingCollection = global.utils.array.classes.IndexingCollection

let CreepRequest = global.utils.creep.classes.CreepRequest;

let intelClass = require("pr.intel");

class creepManager extends processClass {
    init() {
        this.creeps = new IndexingCollection("id", ["memory.proc", "memory.targetProc"], [100000, 100000]);
        this.creepQueue = new IndexingCollection("id");

        /** @type {intelClass} */
        this.intel = this.kernel.getProcess("intel");
        this.firstRun = true;
    }
    initThreads() {
        return [
            this.createThread("registerCreeps", "empire"),
            this.createThread("display", "work")
        ]
    }


    display() {
        let creepQueue = this.creepQueue.getAll();
        for(let i in creepQueue) {
            /** @type {CreepRequest} */
            let creepRequest = creepQueue[i];
            global.utils.visual.drawText(creepRequest.targetProc + "(" + creepRequest.priority + ")", creepRequest.pos);
        }
    }

    getProcTargetCreeps(procName) {
        let creeps = this.creeps.getGroupWithValue("memory.targetProc", procName);
        if (!creeps) {
            creeps = [];
        }
        let creepObjs = [];
        for(let c in creeps) {
            let creepId = creeps[c];
            let creep = this.creeps.getById(creepId);
            creepObjs.push(creep);
        }
        return creepObjs;
    }

    getProcCreeps(procName) {
        let creeps = this.creeps.getGroupWithValue("memory.proc", procName);
        if (!creeps) {
            creeps = [];
        }
        let creepObjs = [];
        for(let c in creeps) {
            let creepId = creeps[c];
            let creep = this.creeps.getById(creepId);
            creepObjs.push(creep);
        }
        return creepObjs;
    }

    /**
     * add/update a creep request
     * @param {CreepRequest} req 
     */
    requestCreep(req) {
        if (!req instanceof CreepRequest) {
            throw new Error("Creep request isn't a creep request.. what even are you doing?")
        }
        if (!this.creepQueue.has(req)) {
            this.creepQueue.add(req);
        } else {
            throw new Error("creep request already exists");
        }
        
    }

    registerCreeps() {
        logger.log("HERE!");
        this.creeps = new IndexingCollection("id", ["memory.proc", "memory.targetProc"], [100000, 100000]);
        this.creepQueue = new IndexingCollection("id");

        for(let creepName in Game.creeps) {
            let creep = Game.creeps[creepName];
            let proc = this.kernel.getProcess(creep.memory.proc);
            if (!proc && !this.firstRun) {
                //the creeps parent proc is gone?
                //it's an orphan
                //no one loves it.
                logger.log('orphaned creep???', creepName, creep.memory.proc);
                //creep.memory.proc = false;
            }

            this.creeps.add(creep);
        }

        this.firstRun = false;
    }

    getSpawnQueue(spawn, distLimit=150) {
        let safeReqs = [];
        this.creepQueue.forEach((r) => {
            if (global.utils.pStar.findDistance(spawn.pos, r.pos) <= distLimit && this.intel.getRoomIntel(r.pos.roomName).status.defcon == 0) {
                let reqInfo = {
                    req: r,
                    effectivePriority: r.priority + (global.utils.pStar.findDistance(spawn.pos, r.pos) / 25)
                };
                safeReqs.push(reqInfo);
            } else {
                logger.log("ignoring this req", JSON.stringify(r))
            }
        });
        safeReqs = _.sortBy(safeReqs, ["effectivePriority"]);

        return safeReqs;
    }
}

module.exports = creepManager;