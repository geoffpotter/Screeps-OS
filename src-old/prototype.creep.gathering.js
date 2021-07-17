/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('prototype.creep');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("prototype.creep.g");
logger.enabled = false;



Creep.prototype.pickupEnergy = function(onlyLocal, notNearController) {
    var _this = this;
    var target = this.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {filter:function(r){
        return r.resourceType == RESOURCE_ENERGY && r.amount > _this.carryCapacity*2;
    }});
    if (!target) {
        target = this.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {filter:function(r){
            return r.resourceType == RESOURCE_ENERGY && r.amount > _this.carryCapacity*0.5;
        }});
    }
    if (target && onlyLocal) {
        if (!this.pos.inRangeTo(target, 2)) {
            target = false;
        }
    }
    if (notNearController && target.pos.inRangeTo(this.room.controller, 5)) {
        target = false;
    } 
    //logger.log(this.name, "energy target" , target)
    if(target) {
        if (this.pos.isNearTo(target)) {
            if(this.pickup(target) == 0) {
                this.memory.energyIn += Math.min(this.carryCapacity - this.carry.energy, target.amount);
            }
        } else {
            global.utils.moveCreep(this, target);
            
        }
        //logger.log(this.name, "picking up energy", target)
        return true;
    }
    return false;
}

Creep.prototype.pickupStuff = function(onlyLocal) {
    var _this = this;
    var target = this.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {filter:function(r){
        //logger.log(r.resourceType, r.amount)
        
        if (r.resourceType == RESOURCE_ENERGY) {
            return r.amount > _this.carryCapacity*4;
        }
        return r.amount > 0;
    }});
    if (!target) {
        target = this.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {filter:function(r){
            return r.amount > Math.min(_this.carryCapacity*2, 300);
        }});
    }
    if (target && onlyLocal) {
        if (!this.pos.inRangeTo(target, 2)) {
            target = false;
        }
    }
    //logger.log(this.name, "energy target" , target)
    if(target) {
        if (this.pos.isNearTo(target)) {
            if(this.pickup(target) == 0) {
                this.memory.energyIn += Math.min(this.carryCapacity - this.carry.energy, target.amount);
            }
        } else {
            global.utils.moveCreep(this, target);
            
        }
        //logger.log(this.name, "picking up energy", target)
        return true;
    }
    return false;
}

Creep.prototype.getEnergyFromAnywhere = function() {
    var _this = this;
    var target = this.memory.targetContId;
    if (target) {
        target = Game.getObjectById(target);
    } else {
        target = this.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: (structure) => {
                var cont = (
                        structure.structureType == STRUCTURE_STORAGE ||
                        structure.structureType == STRUCTURE_CONTAINER ||
                        structure.structureType == STRUCTURE_LINK
                    ) && (structure.store ? structure.store.energy : structure.energy) > _this.carryCapacity;
                return cont;
            }
        });
        if (target) {
            this.memory.targetContId = target.id;
        }
    }
    
    if (target) {
        if (this.pos.isNearTo(target)) {
            this.withdraw(target, RESOURCE_ENERGY);
             this.memory.targetContId = false;
        } else {
            global.utils.moveCreep(this, target);
        }
        //logger.log(this.name, "getting energy from container")
        return true;
    }
    return false;
}
Creep.prototype.getEnergyFromStorage = function() {
    var _this = this;
    var target = this.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: (structure) => {
            var cont = (
                    structure.structureType == STRUCTURE_STORAGE
                ) && structure.store.energy > _this.carryCapacity;
            return cont;
        }
    });
    if (target) {
        if (this.pos.isNearTo(target)) {
            target.transfer(this, RESOURCE_ENERGY);
        } else {
            global.utils.moveCreep(this, target);
        }
        //logger.log(this.name, "getting energy from container")
        return true;
    }
    return false;
}

Creep.prototype.getNotEnergyFromStorage = function() {
    var _this = this;
    var target = this.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: (structure) => {
            var cont = (
                    structure.structureType == STRUCTURE_STORAGE
                ) && (_.sum(structure.store) - structure.store.energy) > 0;
            return cont;
        }
    });
            logger.log(this.name, "withdrawlin", target);
    if (target) {
        if (this.pos.isNearTo(target)) {
            //logger.log(this.name,'gonna call', this.withdrawAll)
            this.withdrawAll(target, [RESOURCE_ENERGY]);
        } else {
            global.utils.moveCreep(this, target);
        }
        //logger.log(this.name, "getting energy from container")
        return true;
    }
    return false;
}

Creep.prototype.getEnergyFromSourceContainers = function(noSmallAmounts) {
    if (noSmallAmounts == undefined)
        noSmallAmounts = true;
    var sources = this.room.find(FIND_SOURCES);
    var conts = [];
    for (var s in sources) {
        var source = sources[s];
        var sc = source.getContainer();
        //logger.log(this.name, sc ? sc:0)
        if (sc && sc.store.energy > this.carryCapacity * 4) {
            conts.push(sc);
        }
    }
    var closestCont = this.pos.findClosestByRange(conts);
    if (!closestCont) {
        for (var s in sources) {
            var source = sources[s];
            var sc = source.getContainer();
            //logger.log(this.name, sc ? sc:0)
            if (sc && sc.store.energy > this.carryCapacity * 2) {
                conts.push(sc);
            }
        }
    }
    if (!closestCont && !noSmallAmounts) {
        var conts = [];
        for (var s in sources) {
            var source = sources[s];
            var sc = source.getContainer();
            
            if (sc && sc.store.energy > 200) {
                conts.push(sc);
            }
        }
        var closestCont = this.pos.findClosestByRange(conts);
    }
    if (closestCont) {
        if (this.pos.isNearTo(closestCont)) {
            this.withdraw(closestCont, RESOURCE_ENERGY);
        } else {
            global.utils.moveCreep(this, closestCont);
        }
        logger.log(this.name, "getting energy from container")
        return true;
    }
    return false;
}
Creep.prototype.getStuffFromSourceContainers = function(noSmallAmounts) {
    if (noSmallAmounts == undefined)
        noSmallAmounts = false;
    var creep = this;
    var conts = this.room.find(FIND_STRUCTURES, {filter: function(s) {return s.structureType == STRUCTURE_CONTAINER && (s.getSource() || s.getMineral()) && !s.getSpawn() && _.sum(s.store) > creep.carryCapacity * 0.5}});
    var closestCont = this.pos.findClosestByRange(conts);
    if (!closestCont && !noSmallAmounts) {
        conts = this.room.find(FIND_STRUCTURES, {filter: function(s) {return s.structureType == STRUCTURE_CONTAINER && (s.getSource() || s.getMineral()) && !s.getSpawn() && _.sum(s.store) > 200}});
        closestCont = this.pos.findClosestByRange(conts);
    }
    //logger.log(this.name, closestCont);
    if (closestCont) {
        if (this.pos.isNearTo(closestCont)) {
            var ret = this.withdrawAll(closestCont);
            //logger.log(this.name, "ret----------------------------------", ret)
        } else {
            global.utils.moveCreep(this, closestCont);
        }
        //logger.log(this.name, "getting energy from container")
        return true;
    }
    return false;
}

Creep.prototype.getMineralsFromContainers = function() {
    var conts = this.room.find(FIND_STRUCTURES, {filter: function(s) {return s.structureType == STRUCTURE_CONTAINER && (_.sum(s.store)-(s.store.energy > 0 ? s.store.energy : 0)) > 200}});
    if (conts.length) {
        var cont = this.pos.findClosestByRange(conts);
        if (this.pos.isNearTo(cont)) {
            this.withdrawAll(cont);
        } else {
            global.utils.moveCreep(this, cont);
        }
        return true;
    }
    return false;
}

Creep.prototype.getEnergyFromSpawnContainers = function() {
    var _this = this;
    var target = this.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: (structure) => {
            var cont = (
                    structure.structureType == STRUCTURE_CONTAINER
                    || structure.structureType == STRUCTURE_LINK
                ) && structure.getSpawn() && (structure.store? structure.store.energy : structure.energy) > 0;
                
            return cont;
        }
    });
    //logger.log("==============",this.pos, target);
    
    if (target) {
        if (this.pos.isNearTo(target)) {
            this.withdraw(target, RESOURCE_ENERGY);
        } else {
            global.utils.moveCreep(this, target);
        }
        //logger.log(this.name, "getting energy from container")
        return true;
    }
    return false
};


Creep.prototype.mineEnergyFromSource = function() {
    var _this = this;
    var target = this.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
    //logger.log(this.name, "mining target", target)
    if (target) {
        if (this.pos.isNearTo(target)) {
            this.harvest(target);
        } else {
            global.utils.moveCreep(this, target);
        }
        return true;
    }
    return false;
}






