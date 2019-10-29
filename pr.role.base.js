var logger = require("screeps.logger");
logger = new logger("pr.role.base");
//logger.enabled = false;

let processClass = require("INeRT.process");
let threadClass = require("INeRT.thread");

//let intelClass = require("pr.empire.intel");

let creepManager = require("pr.creepManager");

let CreepRequest = global.utils.creep.classes.CreepRequest;


class baseRole extends processClass {
    init() {
        if (!this.data.roomName || !this.data.pos) {
            throw new Error("Required data missing! " + this.data.roomName + " " + this.data.pos);
        }
        this.roomName = this.data.roomName;
        this.pos = new RoomPosition(this.data.pos.x, this.data.pos.y, this.data.roomName);

        this.roleName = "base";


        /** @type {creepManager} */
        this.creepManager = this.kernel.getProcess("creepManager");

        this.requiredParts = {

        };

        this.allowRefils = true;
        
        this.creepClass = "worker";
        this.spawnPriority = 1;
        this.priorityIncresePerCreep = 10;
        
        this.totalNeededParts = 0;
        this.totalParts = 0;
        
        
    }


    get myCreeps() {
        return this.creepManager.getProcCreeps(this.name)
    }

    get myTargetedCreeps() {
        return this.creepManager.getProcTargetCreeps(this.name)
    }

    initThreads() {
        return [
            this.createThread("base_initTick", "init"),
            this.createThread("display", "work"),
            this.createThread("handleSpawning", "empire")
        ]
    }

    base_initTick() {
        logger.log('baseRole initTick');
    }

    //-------------------spawnin shit------------------
    handleSpawning() {
    
        //if we don't have enough creeps, based on our part counts
        if (!this.creepNeedsMet()) {
            //logger.log(this.creepRole, "need creeps!", this.totalParts, this.totalNeededParts, this.pos)
            if (!this.pos) {
                logger.log(this.creepRole, "has no POS!  CAN'T SPAWN");
                return;
            }
            //umm.. fuckin spawn one?
            let pos = new RoomPosition(this.pos.x, this.pos.y+1, this.pos.roomName);
            logger.log(this.name, "making creep request")
            let creepRequest = new CreepRequest(this.name, pos, this.creepClass, this.spawnPriority+this.myCreeps.length * this.priorityIncresePerCreep)
            this.creepManager.requestCreep(creepRequest);
            
        }
        
    }
    creepNeedsMet() {
        let needsMet = true;
        this.totalNeededParts = 0;
        this.totalParts = 0;
        
        let allCreeps = this.myTargetedCreeps;

        for(let part in this.requiredParts) {
            let need = this.requiredParts[part];
            part = part.toLowerCase();
            this.totalNeededParts += need;
            let count = 0;
            for(let c in allCreeps) {
                let creep = allCreeps[c];
                let creepParts = _.groupBy(creep.body, (p) => p.type);
                //logger.log(creep, JSON.stringify(creepParts), count, creepParts[part.toLowerCase()], part);
                if (creepParts[part]) {
                    count += creepParts[part].length;
                    this.totalParts += creepParts[part].length;
                }
            }
            if (count < need) {
                needsMet = false;
                break;
            }
        }
        return needsMet;
    }

    display() {
        global.utils.visual.drawText(this.roleName + " " + this.totalNeededParts + " " + this.totalParts, this.pos);
    }
}

module.exports = baseRole;