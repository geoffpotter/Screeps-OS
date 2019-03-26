/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('tasks.work');
 * mod.thing == 'a thing'; // true
 */
var logger = require("screeps.logger");
logger = new logger("tasks.work");
logger.enabled = false;

var Task = require("tasks.base");

class praise extends Task{
    constructor() {
        super();
        this.name = Task.PRAISE;
    }
    assignCreep(creep) {
        let amtAssigned = creep.carry.energy;
        this.assignments[creep.id] = amtAssigned;
    }
    preformTask(creep) {
        let controller = Game.getObjectById(this.data.controllerId);
        global.creepActions.moveTo(creep, controller, 2);
        if (creep.pos.inRangeTo(controller, 3)) {
            creep.upgradeController(controller);
        }
        return creep.carry.energy == 0;
    }
}

class feedUpgraders extends Task{
    constructor() {
        super();
        this.name = Task.FEEDUPGRADERS;
    }
    assignCreep(creep) {
        let amtAssigned = creep.carry.energy;
        this.assignments[creep.id] = amtAssigned;
    }
    preformTask(creep) {
        let controller = Game.getObjectById(this.data.controllerId);
        let cont = controller.getContainer(3);
        
        if (cont && cont.storeCapacity > _.sum(cont.store)) {
            global.creepActions.moveTo(creep, cont);
            if (creep.pos.inRangeTo(cont, 1)) {
                creep.transfer(cont, RESOURCE_ENERGY);
            }
        } else {
            global.creepActions.moveTo(creep, controller, 3);
            if (creep.pos.inRangeTo(controller, 3)) {
                creep.drop(RESOURCE_ENERGY);
            }
        }
        
        return creep.carry.energy == 0;
    }
}

class fillContainer extends Task{
    constructor() {
        super();
        this.name = Task.FEEDSPAWNS;
        //this.displayThisTask = true;
    }
    assignCreep(creep) {
        let amtAssigned = creep.carry.energy;
        this.assignments[creep.id] = amtAssigned;
    }
    preformTask(creep) {
        let cont = Game.getObjectById(this.data.targetId);
        
        if (cont) {
            global.creepActions.moveTo(creep, cont);
            if (creep.pos.inRangeTo(cont, 1)) {
                creep.transfer(cont, RESOURCE_ENERGY);
            }
        } else {
            return true;
        }
    
        return creep.carry.energy == 0 || _.sum(cont.store) == cont.storeCapacity;
    }
}

class fillSpawns extends Task{
    constructor() {
        super();
        this.name = Task.FILLSPAWNS;
        //this.displayThisTask = true;
    }
    assignCreep(creep) {
        let amtAssigned = creep.carry.energy;
        this.assignments[creep.id] = amtAssigned;
    }
    preformTask(creep) {
        let building = Game.getObjectById(this.data.spawnId);
        //moveto returns true when in range
        if(global.creepActions.moveTo(creep, building)) {
            let ret = creep.transfer(building, RESOURCE_ENERGY);
            logger.log(this.name, creep, ret);
        }
        
        return creep.carry.energy == 0 || building.energy == building.energyCapacity;
    }
}

class build extends Task{
    constructor() {
        super();
        this.name = Task.BUILD;
        this.displayThisTask = true;
    }
    assignCreep(creep) {
        let amtAssigned = creep.carry.energy;
        this.assignments[creep.id] = amtAssigned;
    }
    preformTask(creep) {
        let building = Game.getObjectById(this.data.siteId)
        if(!building) {
           return true;
        }
        
        //moveto returns true when in range
        if(global.creepActions.moveTo(creep, building, 3)) {
            let ret = creep.build(building);
        }
        
        return creep.carry.energy == 0 || building.progress == building.progressTotal;
    }
}

class repair extends Task{
    constructor() {
        super();
        this.name = Task.REPAIR;
        //this.displayThisTask = true;
    }
    assignCreep(creep) {
        let amtAssigned = creep.carry.energy;
        this.assignments[creep.id] = amtAssigned;
    }
    preformTask(creep) {
        
        
        let building = Game.getObjectById(this.data.structureId);
        if (!building) {
            logger.log(creep, "bad job!!------------", JSON.stringify(this), building, this.data.structureId);
            return true;
        }
        //moveto returns true when in range
        if(global.creepActions.moveTo(creep, building, 3)) {
            let ret = creep.repair(building);
        }
        
        return creep.carry.energy == 0 || building.hits == building.hitsMax;
    }

}

class deliverEnergy extends Task{
    constructor() {
        super();
        this.name = Task.DELIVERENERGY;
        //this.displayThisTask = true;
    }
    assignCreep(creep) {
        let amtAssigned = creep.carry.energy;
        this.assignments[creep.id] = amtAssigned;
    }
    preformTask(creep) {
        let target = Game.getObjectById(this.data.targetId);
        logger.log("deliver:", creep, target);
        if (!target) {
            logger.log(creep, "invalid task, no target", this.data.targetId);
            return true;
        }
        //moveto returns true when in range
        if(global.creepActions.moveTo(creep, target)) {
            let ret = creep.transfer(target, RESOURCE_ENERGY);
        }
        let targetFull = false;
        if (target.carryCapacity == _.sum(target.carry)) {
            targetFull = true;
        }
        if (target.storeCapacity == _.sum(target.store)) {
            targetFull = true
        }
        return creep.carry.energy == 0 || targetFull;
    }
}

class fillTowers extends Task{
    constructor() {
        super();
        this.name = Task.FILLTOWERS;
        //this.displayThisTask = true;
    }
    assignCreep(creep) {
        let amtAssigned = creep.carry.energy;
        this.assignments[creep.id] = amtAssigned;
    }
    preformTask(creep) {
        let target = Game.getObjectById(this.data.towerId);
        logger.log("deliver:", creep, target);
        if (!target) {
            logger.log(creep, "invalid task, no target", this.data.targetId);
            return true;
        }
        //moveto returns true when in range
        if(global.creepActions.moveTo(creep, target)) {
            let ret = creep.transfer(target, RESOURCE_ENERGY);
        }
        let targetFull = false;
        if (target.energyCapacity == target.energy) {
            targetFull = true;
        }
        return creep.carry.energy == 0 || targetFull;
    }
}


let all = [
    praise,
    feedUpgraders,
    fillSpawns,
    fillContainer,
    build,
    repair,
    deliverEnergy,
    fillTowers,
];
let map = {};


for(let i in all) {
    let one = all[i];
    let inst = new one();
    map[inst.name] = one;
}

module.exports = map;