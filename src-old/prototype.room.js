/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('base.role');
 * mod.thing == 'a thing'; // true
 */


RoomPosition.prototype.gridName = function() {
    return this.roomName + "-" + this.x + "-" + this.y;
}


var logger = require("screeps.logger");
logger = new logger("prototype.room");


Room.prototype.init = function() {
    if (!this.memory.buildings || Game.time % 100 == 0) {
        this.recacheBuildings();
    } else {
        this.loadBuildings();
    }
}


Room.prototype.getNonFullStorage = function(noSpawn) {
    var targets = [];
    if (this.storage) {
        targets.push(this.storage);
    }
    if (!noSpawn) { 
        var spawnConts = this.find(FIND_STRUCTURES, {filter: function(s) {return s.structureType == STRUCTURE_CONTAINER && s.getSpawn() && _.sum(s.store) < s.storeCapacity}});
        if (spawnConts.length > 0) {
            targets = spawnConts;
        }
    }
    if (targets.length == 0) {
        
        var conts = this.find(FIND_STRUCTURES, {filter: function(s) {return s.structureType == STRUCTURE_CONTAINER && !s.getSpawn() && !s.getMineral()}});
        if (conts.length > 0) {
            targets = targets.concat(conts);
        }
    }
    
    targets = _.filter(targets, function(t) {
        return _.sum(t.store) < t.storeCapacity;
    })
    //logger.log('non full storage', targets, conts)
    return targets;
}

Room.prototype.getStuffForPickup = function(includeAll) {
    var targets = [];
    var spawnConts = this.find(FIND_STRUCTURES, {filter: function(s) {return s.structureType == STRUCTURE_CONTAINER && s.getSpawn() && s.mineralAmount() > 0}});
    if (spawnConts.length > 0) {
        targets = targets.concat(spawnConts);
        logger.log("using spawn container", spawnConts)
    } else {
        var conts = this.find(FIND_STRUCTURES, {filter: function(s) {return s.structureType == STRUCTURE_CONTAINER && (includeAll || (!s.getSpawn() || s.getSpawn() && s.mineralAmount() > 0))}});
        if (conts.length > 0) {
            targets = targets.concat(conts);
        }
        
        targets = _.filter(targets, function(t) {
            return _.sum(t.store) > 200;
        })
        
        var piles = this.find(FIND_DROPPED_RESOURCES, {filter: function(p) {return p.amount > 100}});
        if (piles.length > 0) {
            targets = targets.concat(piles);
        }
    }
    
    
    logger.log('stuff for pickup', targets, "|")
    return targets;
}



Room.prototype.getSpawnToFill = function() {
    var nonFullSpawns = _.filter(_.concat(this.spawns, this.extensions), function(o) {
        return o.energy != o.energyCapacity;
    });
    _.orderBy(nonFullSpawns, ["energy"], ["desc"]);
    return nonFullSpawns[0];
}

Room.prototype.getContainerToFill = function() {
    _.orderBy(this.containers, ["energy"], ["desc"]);
    return this.containers[0];
}

Room.prototype.getContainerWithEnergy = function(capacity) {
    if (capacity == undefined) {
        capacity = 1;
    }
    _.orderBy(this.containers, ["energy"], ["asc"]);
    return this.containers[0];
}


Room.prototype.drawPath = function(path, opts) {
    if (!opts) {
        opts = {color: 'red', style: 'dashed'}
    }
    //console.log("here", JSON.stringify(path))
    for (var i = 0; i < path.length-1; i++) {
        var pos1 = path[i];
        var pos2 = path[i+1];
        this.visual.line(pos1, pos2, opts)
    }
};
Room.prototype.getHostileCreeps = function() {
    return this.find(FIND_HOSTILE_CREEPS, {filter:(c) => c.isHostile()});
}
Room.prototype.setDEFCON = function(value) {
    this.memory.defcon = 1;
    if (value == 1) {
        this.memory.structuresAtDEF1 = this.find(FIND_STRUCTURES).length;
    }
    this.memory.ticksAtDEF = 0;
    this.memory.ticksClear = 0;
}
Room.prototype.updateDEFCON = function() {
    var hostileCreeps = this.getHostileCreeps();
    
    if (!(this.memory.defcon > 0) && hostileCreeps.length > 0 && hostileCreeps.length < 2) {
        this.setDEFCON(1);
    } else if (hostileCreeps.length >= 2) {
        this.setDEFCON(2);
    }
    
    if (hostileCreeps.length > 1) {
        this.memory.ticksAtDEF++;
        this.memory.ticksClear = 0;
    } else {
        this.memory.ticksAtDEF = 0
        this.memory.ticksClear++;
    }
    if (this.memory.ticksAtDEF > 50) {
        this.setDEFCON(this.memory.defcon+1);
    }
    if (this.memory.defcon > 0 && this.memory.ticksClear > 25) {
        this.setDEFCON(this.memory.defcon-1)
    }
}