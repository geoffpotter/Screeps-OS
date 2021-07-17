/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.filler');
 * mod.thing == 'a thing'; // true
 */


var logger = require("screeps.logger");
logger = new logger("role.alchemist");
logger.enabled = false;

var obj = function() {
}
var base = require('role.worker');
obj.prototype = new base();

global.utils.extendFunction(obj, "init", function(name, roomManager) {
    this._init(name, roomManager);
    // if (roomManager.room.name == "W8S12") {
    //     logger.enabled = true;
    // }
    this.allowMining = false;
    this.requiredCreeps = 0;
    this.link = false;
    this.terminal = false;
    this.storage = false;
});

global.utils.extendFunction(obj, "tickInit", function() {
    if (this.roomManager.room.controller.level >= 6 && !this.roomManager.remoteMode) {
        this.requiredCreeps = 1;
    }
    if (this.roomManager.labManager.balancesNeeded && this.roomManager.labManager.balancesNeeded.length == 0) {
        this.requiredCreeps = 0;
    }
    this.link = false;
    this.terminal = false;
    this.storage = false;    
    if (this.roomManager.visibility) {
        this.terminal = this.roomManager.room.terminal;
        this.storage = this.roomManager.room.storage;
        if (this.terminal) {
            this.link = this.terminal.getLink();
        }
    }
    
    if (this.workerCreepIds.length < this.requiredCreeps) {
        if (!this.link || !this.storage || !this.terminal) {
            return;
        }
        //need some creeps
        var minBodies = 0;
        if (this.roomManager.room.energyCapacityAvailable >= 600) {
            minBodies = 5;
        } else {
            minBodies = this.roomManager.room.controller.level;
        }
        if (this.roomManager.creepCrisis()) {
            minBodies = 0;
        }
        
        var priority = 4;
        if (this.numCreeps == 0)
            priority = 14;
        var req = global.utils.makeCreepRequest(this.name, "workerCreepIds", [CARRY, CARRY, CARRY, MOVE], [CARRY, CARRY, CARRY, MOVE], priority, false, 30, minBodies)
        
        this.roomManager.requestCreep(req);
        return;
    }
});

global.utils.extendFunction(obj, "tick", function() {
    this._tick();
});

global.utils.extendFunction(obj, "tickEnd", function() {
});


obj.prototype.doWork = function(creep) {
    var op = creep.memory.op;
    if (!op) {
        if (logger.log("-=-=-=-=",creep.transferTo(this.roomManager.labManager.storage, true))) {
            creep.memory.op = false;
        } else {
            
        }
        return;
    }
    
    
    //if our carry is empty, grab type in from, else put type in to
    var from = Game.getObjectById(op.from.id);
    var to = Game.getObjectById(op.to.id);
    var type = op.from.type;
    var amt = Math.min(creep.carryCapacity, Math.abs(op.from.diff), Math.abs(op.to.diff), op.to.target, op.from.amt);
    logger.log("op", JSON.stringify(op))
    logger.log(from, to, type, amt)
    if (creep.carry[type] > 0) {
        //we have stuff put it in 
        logger.log(creep.name, type, "xfer")
        if (creep.transferTo(to, type, amt)) {
            creep.memory.op = false;
        }
    }
    
}

obj.prototype.getEnergy = function(creep) {
    var op = false;
    creep.memory.op = false;
    if (!creep.memory.op) {
        logger.log("balancesNeeded:" , JSON.stringify(this.roomManager.labManager.balancesNeeded))
        op = this.roomManager.labManager.balancesNeeded[0];
        creep.memory.op = op;
        logger.log(JSON.stringify(op));
    } else {
        op = creep.memory.op;
    }
    if (!op) {
        logger.log('bitches got no ops, can\'t make no sales');
        return;
    }
    logger.log(JSON.stringify(op))
    //grab type in from
    var from = Game.getObjectById(op.from.id);
    var to = Game.getObjectById(op.to.id);
    var type = op.from.type;
    var amt = Math.min(creep.carryCapacity, Math.abs(op.from.diff), op.to.target, op.from.amt);
    
    logger.log(op.from.type, amt, creep.carryCapacity, Math.abs(op.from.diff), Math.abs(op.to.diff), op.to.target, op.from.amt)
    if (creep.withdrawFrom(from, type, amt)) {
        
    }
    logger.log(creep.name, type, "gank")
}


// obj.prototype.getEnergy = function(creep) {
//     //logger.log("---===----",creep);
    
//     if (!creep.getNotEnergyFromStorage()) {
//         global.utils.moveCreep(creep, this.storage)
//         //if no mins in storage, grab energy from storage/terminal, which ever has more.
//         if (!this.terminal.belowMinEnergy()) {
//             creep.withdrawEnergy(this.terminal);
//         } else if(this.storage.store.energy > 0) {
//             creep.withdrawEnergy(this.storage);
//         }
//     }

//     return true;
// }

// obj.prototype.doWork = function(creep) {
//     var terminal = this.roomManager.room.terminal;
    
//     if (creep.hasNotEnergy()) {// all not energy goes to terminal for now
//         if (this.terminal) {
//             if (creep.pos.isNearTo(this.terminal)) {
//                 logger.log(creep.name, "dumping")
//                 creep.transferAll(this.terminal, [RESOURCE_ENERGY])
//             } else {
//                 global.utils.moveCreep(creep, this.terminal);
//             }
//         } else {
//             logger.log(creep.name, "no terminal!")
//         }
//     } else {
//         if (this.link.energy < this.link.energyCapacity) {
//             global.utils.moveCreep(creep, this.link)
//             creep.transferEnergy(this.link);
//         } else {
//             global.utils.moveCreep(creep, this.storage);
//             logger.log(creep.name, this.terminal.store.energy, this.storage.store.energy, this.storage, this.terminal)
//             //put remaining energy in whichever has less.
//             if (this.terminal.store.energy < this.storage.store.energy) {
//                 creep.transferEnergy(this.terminal);
//             } else {
//                 creep.transferEnergy(this.storage);
//             }
//         }
//     }
    


// }

module.exports = obj;