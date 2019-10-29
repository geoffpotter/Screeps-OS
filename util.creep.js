/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('util.creepClasses');
 * mod.thing == 'a thing'; // true
 */

let logger = require("screeps.logger");
logger = new logger("util.creepClasses");
//logger.color = COLOR_YELLOW;
//logger.enabled = false;


class CreepRequest {

    constructor(procName, pos, creepClass, priority, memory={}) {
        this.procName = procName;
        this.targetProc = procName;
        this.pos = pos;
        this.creepClass = creepClass;
        this.priority = priority;
        this.memory = memory;

        this.forceMaxEnergy = false;
        this.important = false;

        this.maxLevel = 99;
        this.maxEnergy = false;

        this.orderWeights = {
            HEAL:-1,
            MOVE: 0,
            CLAIM:1,
            CARRY:2,
            WORK:3,
            RANGED_ATTACK:4,
            ATTACK:5,
            TOUGH:6
        };
    }

    get id() {
        return `${this.procName}_${this.pos.x}_${this.pos.y}_${this.pos.roomName}`;
    }

    getAvailableCreepName(baseName) {
        var r = baseName;//baseName.split("-")[0];
        var i = 1;
        while (Game.creeps[r+"-"+i] != undefined) {
            i++;
        }
        return r+"-"+i;
    }

    buildMemory() {
        let mem = _.clone(this.memory);
        mem.proc = this.procName;
        mem.targetProc = this.procName;
        mem.reqLoc = this.pos;

        return mem;
    }

    /**
     * 
     * @param {StructureSpawn} spawn 
     */
    buildBody(spawn) {
        /** @type {baseCreepClass} */
        let creepClass = exp[this.creepClass];
        if (!creepClass) {
            throw new Error("Creep class doesn't exist!!! "+ this.creepClass);
        }
        let energyAvail = this.forceMaxEnergy ? spawn.room.energyCapacityAvailable : spawn.room.energyAvailable;
        if (this.maxEnergy !== false) {
            energyAvail = this.maxEnergy;
        }
        return creepClass.buildCreepBody(this.maxLevel, energyAvail, this.orderWeights);
    }
}

class baseCreepClass {
    
    constructor() {
        this.name = "base"
        this.requiredBody = [];
        this.extendedBody = [];
        
        this.maxBodies = 50;
        this.minBodies = 0;
        this.maxLevel = 50;
        
        this.orderWeights = {
            HEAL:-1,
            MOVE: 0,
            CLAIM:1,
            CARRY:2,
            WORK:3,
            RANGED_ATTACK:4,
            ATTACK:5,
            TOUGH:6
        };
    }

    getCreepBodyByLevel(level, orderWeights) {
        let body = _.clone(this.requiredBody);
        for(let i=0;i<level;i++) {
            body = body.concat(_.clone(this.extendedBody));
        }

        if (orderWeights) {
            body = this.sortBody(body, orderWeights);
        }
        
        return body;
    }

    buildCreepBody(maxLevel, maxEnergy, orderOverride = true) {
        let orderWeights = orderOverride == true ? this.orderWeights : orderOverride;
        let level = 0;
        let body = this.getCreepBodyByLevel(level, orderWeights);
        while(this.creepCost(body) <= maxEnergy && level <= maxLevel) {
            level++;
            let newBody = this.getCreepBodyByLevel(level, orderWeights);
            if (this.creepCost(newBody) <= maxEnergy && newBody.length <= this.maxBodies) {
                logger.log('using level', level, "body")
                body = newBody;
            } else {
                level--;
                break;
            }
        }

        logger.log('made body', JSON.stringify(body), this.creepCost(body))
        if (body.length < this.minBodies || this.creepCost(body) > maxEnergy || !body) {
            body = false;
            level = false;
        }
        return {
            body: body ? body.reverse() : false,
            level: level,
            cost: body ? this.creepCost(body) :  false
        }
    }
    

    creepCost(body) {
        var buildCost = 0;
        for(var bodypart in body){
            var part = body[bodypart];
            if (part.type != undefined) {
                part = part.type;
            }
            switch(part){
                case MOVE:
                case CARRY:
                    buildCost+=50;
                break;
                case WORK:
                    buildCost+=100;
                break;
                case HEAL:
                    buildCost+=250;
                break;
                case TOUGH:
                    buildCost+=10;
                break;
                case CLAIM:
                    buildCost+=600;
                break;
                case ATTACK:
                    buildCost+=80;
                break;
                case RANGED_ATTACK:
                    buildCost+=150;
                break;
            }
        }
        return buildCost;
    }
    sortBody(body, orderWeights) {
        //logger.log(this.roomName, "====", creepData.role,JSON.stringify(body))
        var req = this;
        body = _.sortBy(body, function(p) {
            //logger.log(req.orderWeights[p], p, JSON.stringify(req.orderWeights))
            return orderWeights[p.toUpperCase()];
        })
        return body;
    }
}


class workerClass extends baseCreepClass {
    constructor() {
        super();
        this.name = "worker";
        this.requiredBody = [WORK, CARRY, MOVE, MOVE];
        this.extendedBody = [WORK, CARRY, MOVE, MOVE];
    }
}

class minerClass extends baseCreepClass {
    constructor() {
        super();
        this.name = "miner";
        this.requiredBody = [WORK, WORK, CARRY, MOVE];
        this.extendedBody = [WORK, WORK, MOVE];
        
        this.maxBodies = 4;
    }
}
class remoteMinerClass extends baseCreepClass {
    constructor() {
        super();
        this.name = "remoteMiner";
        this.requiredBody = [WORK, WORK, CARRY, MOVE];
        this.extendedBody = [WORK, WORK, MOVE, MOVE];
        
        
        this.maxBodies = 4;
    }
}

class builderClass extends baseCreepClass {
    constructor() {
        super();
        this.name = "builder";
        // this.requiredBody = [WORK, WORK, CARRY, MOVE];
        // this.extendedBody = [WORK, WORK, CARRY, MOVE];
        
        this.requiredBody = [WORK, CARRY, MOVE];
        this.extendedBody = [WORK, CARRY, MOVE];
    }
}

class transporterClass extends baseCreepClass {
    constructor() {
        super();
        this.name = "transporter";
        this.requiredBody = [CARRY, MOVE, CARRY, MOVE];
        this.extendedBody = [CARRY, MOVE];
    }
}

class fillerClass extends baseCreepClass {
    constructor() {
        super();
        this.name = "filler";
        this.requiredBody = [CARRY, CARRY, MOVE];
        this.extendedBody = [CARRY, CARRY, MOVE];
    }
}

class claimerClass extends baseCreepClass {
    constructor() {
        super();
        this.name = "claimer";
        this.requiredBody = [CLAIM, MOVE];
        this.extendedBody = [];
        this.maxBodies = 1;
    }
}

let classes = [
    workerClass,
    minerClass,
    builderClass,
    transporterClass,
    remoteMinerClass,
    fillerClass,
    claimerClass
];

let exp = {};
for(let claz in classes) {
    let clazz = classes[claz];
    let classObj = new clazz();
    logger.log(classObj.name)
    exp[classObj.name] = classObj;
}

module.exports = {
    classes: {
        CreepRequest,
    },
    creepClasses: exp
};