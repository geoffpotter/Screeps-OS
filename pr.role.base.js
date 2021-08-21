var logger = require("screeps.logger");
logger = new logger("pr.role.base");
//logger.enabled = false;

let processClass = require("INeRT.process");
let threadClass = require("INeRT.thread");

//let intelClass = require("pr.empire.intel");

let creepManager = require("pr.creepManager");
let actionManager = require("pr.actionManager");

let CreepRequest = global.utils.creep.classes.CreepRequest;

let actionTypes = global.utils.action.classes.actionTypes;
let baseAction = global.utils.action.classes.baseAction;
let actionOptIn = global.utils.action.classes.actionOptIn;


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
        /** @type {actionManager} */
        this.actionManager = this.kernel.getProcess("actionManager");

        this.requiredParts = {

        };

        this.allowRefils = true;
        
        this.creepClass = "worker";
        this.spawnPriority = 10;
        this.priorityIncresePerCreep = 10;
        
        this.totalNeededParts = 0;
        this.totalParts = 0;
        this.maxCreepCount = false;
        this.actionOptIns = [];

        this.actionsByCreep = {};
        
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
            this.createThread("handleSpawning", "empire"),
            
            this.createThread('findActions', "actionSearch"),
            this.createThread('runCreeps', "creepAct"),
            this.createThread('moveCreeps', "creepMove"),

        ]
    }

    base_initTick() {
        logger.log('baseRole initTick');
    }


    //---------------action shit------------------
    getCreepValidOptIns(creep) {
        let optins = [];
        for(let a in this.actionOptIns) {
            /** @type {actionOptIn} */
            let optIn = this.actionOptIns[a];
            let actionType = optIn.actionType;
            let actionClass = global.utils.action.getActionClass(actionType);
            if (actionClass.canDo(creep)) {
             optins.push(optIn);
            }
        }
        return optins;
    }

    getCreepAction(creep) {
        let start = Game.cpu.getUsed();
        let log = (...args) => {
            let usedNow = Game.cpu.getUsed();
            let used = usedNow - start;
            logger.log("cpu used:", used, ...args);
            start = usedNow;
        }

        logger.log("-------------------------------", creep)
        let action = false;
        if (creep.memory.actionId && this.actionManager.hasAction(creep.memory.actionId)) {
            //creep is assigned already, load and validate
            action = this.actionManager.getActionById(creep.memory.actionId);
            if (!action.isCreepAssigned(creep)) {
                action = false;
            }
            if (action && !action.instCanDo(creep) && action.isCreepAssigned(creep)) {
                action.unassignCreep(creep);
                action = false;
            }
            if (!action) {
                logger.log(creep, "invalided it's task!------------------")
            }
        } else {
            logger.log(creep, "has no stored task")
        }
        //log("1")
        if (!action) {
            //creep.say("need action")
            let validOptIns = this.getCreepValidOptIns(creep);
            let optinLookup = _.indexBy(validOptIns, 'actionType');
            //log("supported")
            //logger.log(creep, "supported actions", JSON.stringify(supportedActions))
            let actionOptions = this.actionManager.getActions(validOptIns, 1, creep.pos);
            //log("base actions")
            actionOptions = _.filter(actionOptions, (a) => {
                /** @type {actionOptIn} */
                let optIn = optinLookup[a.actionType];
                return optIn.filterFN ? optIn.filterFN(creep, a) : true
            });
            let ordered = _.sortBy(actionOptions, (a) => {
                /** @type {actionOptIn} */
                let optIn = optinLookup[a.actionType];
                let sortValue = optIn.sortFN(creep, a);
                return sortValue;
            });
            //log("sorted")
            action = ordered[0];
            if (action) {
                creep.say("got action")
                let priority = optinLookup[action.actionType].priority;
                action.assignCreep(creep, priority);
            } else {
                //creep can't find an action
                //logger.log(creep, "can't find an action");
                //creep.say("I'm bored");
                //global.utils.pStar.inst.moveTo(creep, {pos:this.pos, range: 1});
            }
            
        } else {
            
        }
        //log('done')
        creep.memory.actionId = action ? action.id : false;

        return action;
    }

    findActions() {
        let creeps = this.myCreeps;
        this.actionsByCreep = {};
        for(let c in creeps) {
            let creep = creeps[c];
            /** @type {baseAction} */
            let action = this.getCreepAction(creep);
            //logger.log(creep, action);
            if (!action) {
                logger.log(creep, "has nothing to do!");
                this.actionsByCreep[creep.id] = "idle";
            } else {
                this.actionsByCreep[creep.id] = action;
            }
            
        }
    }

    
    runCreeps() {
        for(let creepId in this.actionsByCreep) {
            let creep = Game.getObjectById(creepId);
            /** @type {baseAction} */
            let action = this.actionsByCreep[creepId];
            //logger.log(creep, action);
            if (action && action != "idle") {
                let done = action.preformJob(creep);
                if (done) {
                    creep.memory.actionId = false;
                    action.unassignCreep(creep);
                    this.actionsByCreep[creepId] = false;
                }
            }
            
        }
    }
    moveCreeps() {
        for(let creepId in this.actionsByCreep) {
            let creep = Game.getObjectById(creepId);
            /** @type {baseAction} */
            let action = this.actionsByCreep[creepId];
            if (action === false) {
                action = this.getCreepAction(creep)
            }
            if (action && action != "idle") {
                action.moveToPosition(creep);
            }
            
        }
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

        if (this.maxCreepCount !== false && this.maxCreepCount <= allCreeps.length) {
            return true;
        }


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