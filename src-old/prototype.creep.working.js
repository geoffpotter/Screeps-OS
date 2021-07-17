/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('prototype.creep');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("prototype.creep.w");
logger.enabled = false;


Creep.prototype.stashEnergyInStorage = function() {
    var target = this.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: (structure) => {
            var cont = (
                    structure.structureType == STRUCTURE_STORAGE
                ) && _.sum(structure.store) < structure.storeCapacity;
            return cont;
        }
    });
    if (target) {
        if (this.pos.isNearTo(target)) {
            this.transfer(target, RESOURCE_ENERGY);
        } else {
            global.utils.moveCreep(this, target);
        }
        return true;
    }
    return false
};


Creep.prototype.stashEnergyInTowers = function() {
    var target = this.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: (structure) => {
            var cont = (
                    structure.structureType == STRUCTURE_TOWER
                ) && structure.energy < structure.energyCapacity;
            return cont;
        }
    });
    if (target) {
        if (this.pos.isNearTo(target)) {
            this.transfer(target, RESOURCE_ENERGY);
        } else {
            global.utils.moveCreep(this, target);
        }
        return true;
    }
    return false
};

Creep.prototype.stashEnergyInTowersEmergency = function() {
    var target = this.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: (structure) => {
            var cont = (
                    structure.structureType == STRUCTURE_TOWER
                ) && structure.energy < structure.energyCapacity * 0.5;
            return cont;
        }
    });
    if (target) {
        if (this.pos.isNearTo(target)) {
            this.transfer(target, RESOURCE_ENERGY);
        } else {
            global.utils.moveCreep(this, target);
        }
        return true;
    }
    return false
};

Creep.prototype.stashEnergyInSourceContainers = function(onlyLocal) {
    var targetId = this.memory.targetId;
    var target = false;
    if (!targetId) {
        target = this.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: (structure) => {
                var cont = (
                        structure.structureType == STRUCTURE_CONTAINER
                    ) && structure.getSource() && _.sum(structure.store) < structure.storeCapacity;
                    
                return cont;
            }
        });
        if (onlyLocal && !this.pos.isNearTo(target)) {
            target = false;
        }
        if (target) {
            this.memory.targetId = target.id;
        }
    } else {
        target = Game.getObjectById(targetId);
    }
    
    
    
    //logger.log("==============",this.pos, target);
    if (target) {
        if (this.pos.isNearTo(target)) {
            this.transfer(target, RESOURCE_ENERGY);
            this.memory.targetId = false;
        } else {
            global.utils.moveCreep(this, target);
        }
        return true;
    }
    return false
};


Creep.prototype.stashEnergyInSpawnContainers = function() {
    var target = this.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: (structure) => {
            var cont = (
                    structure.structureType == STRUCTURE_CONTAINER
                ) && structure.getSpawn() && _.sum(structure.store) < structure.storeCapacity;
                
            return cont;
        }
    });
    //logger.log("==============",this.pos, target);
    if (target) {
        if (this.pos.isNearTo(target)) {
            this.transfer(target, RESOURCE_ENERGY);
        } else {
            global.utils.moveCreep(this, target);
        }
        return true;
    }
    return false
};



Creep.prototype.stashEnergyInSpawns = function() {
    var targetId = this.memory.targetId;
    var target = false;
    if (!targetId) {
        target = this.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: (structure) => {
                var nonEmptySpawn = (
                        structure.structureType == STRUCTURE_EXTENSION 
                        || structure.structureType == STRUCTURE_SPAWN
                    ) && structure.energy < structure.energyCapacity;
                return nonEmptySpawn;
            }
        });
        if (target) {
            this.memory.targetId = target.id;
        }
    } else {
        target = Game.getObjectById(targetId);
    }
    
    if (target) {
        if (this.pos.isNearTo(target)) {
            this.transfer(target, RESOURCE_ENERGY);
            this.memory.targetId = false;
        } else {
            global.utils.moveCreep(this, target);
        }
        return true;
    }
    return false
};


Creep.prototype.doUpgrade = function() {
    var site = this.room.controller;
    if(site) {
        if (!this.pos.inRangeTo(site, 2)) {
            global.utils.moveCreep(this, site);
        }
        if (this.pos.inRangeTo(site, 3)) {
            this.upgradeController(site)
        }
        //logger.log(this.name + " doing upgrade");
        return true;
    }
    return false;
};


Creep.prototype.doConstruction = function(byRange, onlyLocal) {
    
    var site = false;
    if (onlyLocal) {
        var range = onlyLocal === true ? 3 : onlyLocal;
        site = this.pos.findInRange(FIND_CONSTRUCTION_SITES, range)[0];
        
        logger.log(this.name, range, site)
    } else {
        
        var sites = this.room.find(FIND_CONSTRUCTION_SITES);
        if (byRange) {
            var _this = this;
            sites = _.sortBy(sites, function(s){
                return s.pos.getRangeTo(_this.pos);
            })
        } else {
            sites = _.sortBy(sites, function(s) {
                return 100000 - s.progressTotal;
            });
        }
        
        site = sites[0];
    }
    
    if(site) {
        
        if (this.pos.inRangeTo(site, 3)) {
            var res = this.build(site);
            if (res != ERR_NOT_IN_RANGE && res != 0) {
                logger.log(this.name, "error doing construction", res)
            }
        }
        if (!onlyLocal && !this.pos.isNearTo(site)) {
            global.utils.moveCreep(this, site)
        }
        
        //logger.log(this.name + " doing construction " + site);
        return true;
    }
    return false;
};

Creep.prototype.buildWalls = function() {
    var sites = this.room.find(FIND_CONSTRUCTION_SITES, {filter: (s) => s.structureType == STRUCTURE_WALL});
    var site = this.pos.findClosestByRange(sites);
    if (site) {
        if (this.pos.inRangeTo(site, 3)) {
            var res = this.build(site);
            if (res != ERR_NOT_IN_RANGE && res != 0) {
                logger.log(this.name, "error doing construction", res)
            }
        }
        if (!this.pos.isNearTo(site)) {
            global.utils.moveCreep(this, site)
        }
    }
}
Creep.prototype.buildRamparts = function() {
    var sites = this.room.find(FIND_CONSTRUCTION_SITES, {filter: (s) => s.structureType == STRUCTURE_RAMPART});
    var site = this.pos.findClosestByRange(sites);
    if (site) {
        if (this.pos.inRangeTo(site, 3)) {
            var res = this.build(site);
            if (res != ERR_NOT_IN_RANGE && res != 0) {
                logger.log(this.name, "error doing construction", res)
            }
        }
        if (!this.pos.isNearTo(site)) {
            global.utils.moveCreep(this, site)
        }
    }
}


Creep.prototype.doRepairRamparts = function() {
    site = this.pos.findClosestByRange(FIND_STRUCTURES, {
        // the second argument for findClosestByPath is an object which takes
        // a property called filter which can be a function
        // we use the arrow operator to define it
        filter: (s) => s.hits < 100000 && s.structureType == STRUCTURE_RAMPART
    });
    if(site) {
        if (this.pos.inRangeTo(site, 3)) {
            var res = this.repair(site);
            if (res != ERR_NOT_IN_RANGE && res != 0) {
                logger.log(this.name, "error doing repair", res)
            }
        }
        if (!this.pos.isNearTo(site)) {
            global.utils.moveCreep(this, site)
        }
        return true;
    } else {
        return false;
    }
}
Creep.prototype.doRepairWalls = function() {
    site = this.pos.findClosestByRange(FIND_STRUCTURES, {
        // the second argument for findClosestByPath is an object which takes
        // a property called filter which can be a function
        // we use the arrow operator to define it
        filter: (s) => s.hits < 100000 && s.structureType == STRUCTURE_WALL
    });
    if(site) {
        if (this.pos.inRangeTo(site, 3)) {
            var res = this.repair(site);
            if (res != ERR_NOT_IN_RANGE && res != 0) {
                logger.log(this.name, "error doing repair", res)
            }
        }
        if (!this.pos.isNearTo(site)) {
            global.utils.moveCreep(this, site)
        }
        return true;
    } else {
        return false;
    }
}


Creep.prototype.doRepair = function(onlyLocal) {
    
    var site = false;
    if (onlyLocal) {
        var range = onlyLocal === true ? 3 : onlyLocal;
        site = this.pos.findInRange(FIND_STRUCTURES, range, {
            // the second argument for findClosestByPath is an object which takes
            // a property called filter which can be a function
            // we use the arrow operator to define it
            filter: function(s) {
            return s.hits < s.hitsMax || ((s.structureType == STRUCTURE_WALL || s.structureType == STRUCTURE_RAMPART) && s.hits < 100000)}
        })[0];
    } else {
        
        site = this.pos.findClosestByRange(FIND_STRUCTURES, {
            // the second argument for findClosestByPath is an object which takes
            // a property called filter which can be a function
            // we use the arrow operator to define it
            filter: (s) => s.hits < s.hitsMax && !(s.structureType == STRUCTURE_WALL || s.structureType == STRUCTURE_RAMPART || s.structureType == STRUCTURE_ROAD)
        });
        if (!site) {
            site = this.pos.findClosestByRange(FIND_STRUCTURES, {
                // the second argument for findClosestByPath is an object which takes
                // a property called filter which can be a function
                // we use the arrow operator to define it
                filter: (s) => ((s.structureType == STRUCTURE_WALL || s.structureType == STRUCTURE_RAMPART) && s.hits < 50000) || (s.structureType == STRUCTURE_ROAD && s.hits < s.hitsMax * 0.8)
            });
        }
        
    }
    //logger.log(this.name + " repairing " + site);
    if(site) {
        if (this.pos.inRangeTo(site, 3)) {
            var res = this.repair(site);
            if (res != ERR_NOT_IN_RANGE && res != 0) {
                logger.log(this.name, "error doing repair", res)
            }
        }
        if (!this.pos.isNearTo(site)) {
            global.utils.moveCreep(this, site)
        }
        return true;
    } else {
        return false;
    }
}


