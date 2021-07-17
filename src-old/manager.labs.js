/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('manager.labs');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("manager.labs");
logger.enabled = false;
var obj = function() {
    
}

obj.prototype.init = function(roomManager) {
    this.roomManager = roomManager;
    this.storageDesiredLevels = this.makeStoreObject(10000, 1000, 1000);
    this.terminalDesiredLevels = this.makeStoreObject(30000, 200000, 1000);
    this.linkDesiredLevels = this.makeStoreObject(800, 0, 0);
    var labs = _.map(this.roomManager.room.find(FIND_MY_STRUCTURES, {filter: (s) => s.structureType == STRUCTURE_LAB}), (l) => l.id);
    this.labDesiredLevels = {};
    this.labIds = [];
    for (var l in labs) {
        var lab = labs[l];
        this.labDesiredLevels[lab] = this.makeStoreObject(2000, 0, 0);
        this.labIds.push(lab);
    }
    
    this.labs = false;
}



obj.prototype.tickInit = function() {
    if (!this.roomManager.room.terminal) {
        return;
    }
    this.storage = this.roomManager.room.storage;
    this.terminal = this.roomManager.room.terminal;
    this.link = this.terminal.getLink();
    this.labs = {};
    for(var i in this.labIds) {
        var id = this.labIds[i];
        this.labs[id] = Game.getObjectById(id);
    }
    this.mapImbalances();
}

obj.prototype.tick = function() {
    
}

obj.prototype.tickEnd = function() {
    
}

obj.prototype.mapImbalances = function() {
    this.balancesNeeded = [];
    if (!this.storage || !this.terminal) {
        return;
    }
    logger.log(this.roomManager.roomName, "mapping imbalance", this.link, this.terminal, JSON.stringify(this.terminal.store))
    for(var r in RESOURCES_ALL) {
        var type = RESOURCES_ALL[r];
        var locations = [];
        //add storage
        locations.push(this.mapImbalance(this.storage.id, type, this.storage.store, this.storageDesiredLevels));
        //add terminal
        locations.push(this.mapImbalance(this.terminal.id, type, this.terminal.store, this.terminalDesiredLevels));
        //add link
        if (this.link) {
            var linkStore = {
                energy:this.link.energy
            }
            locations.push(this.mapImbalance(this.link.id, type, linkStore, this.linkDesiredLevels));
        }
        //add labs
        for(var l in this.labs) {
            var lab = this.labs[l];
            var labStore = {
                energy:lab.energy
            }
            labStore[lab.mineralType] = lab.mineralAmount;
            //logger.log(JSON.stringify(labStore))
            locations.push(this.mapImbalance(lab.id, type, labStore, this.labDesiredLevels[lab.id]));
        }
        for(var l in locations) {
            var location = locations[l];
            if (location.diff > 0) {
                var locationToMoveTo = this.findPlaceForExtras(locations, location.type, location.id);
                if (locationToMoveTo) {
                    logger.log(this.roomManager.roomName, "has extra", JSON.stringify(location), JSON.stringify(locationToMoveTo))
                    
                    this.balancesNeeded.push({
                        from:location,
                        to:locationToMoveTo
                    });
                }
            }
            
        }
    }
    this.balancesNeeded = _.sortBy(this.balancesNeeded, function(op) {
        if (op.from.type == RESOURCE_ENERGY) {
            return op.from.diff;
        } else {
            return op.from.diff;
        }
    })
    
}

obj.prototype.findPlaceForExtras = function(locations, type, id) {
    for(var l in locations) {
        var location = locations[l];
        if (location.type == type && location.id != id && location.diff < 0 ) {
            //logger.log(JSON.stringify(location));
            return location;
        }
    }
    if (id == this.storage.id) {
        return false;
    }
    //no location was found, use storage
    return {
        id:this.storage.id,
        type:type,
        amt:0,
        target:2000,
        diff:-2000
    }
}

obj.prototype.mapImbalance = function(id, type, store, targetStore) {
    var amt = store[type];
    var target = targetStore[type];
    if (target === false) {
        target = 0;
    }
    if (amt == undefined) {
        amt = 0;
    }
     if (type == RESOURCE_ENERGY)
        logger.log(id, type, amt, target, amt-target, JSON.stringify(store))
    return {
        id:id,
        type:type,
        amt:amt,
        target:target,
        diff:amt-target
    }
}

obj.prototype.makeStoreObject = function(targetEnergy, targetBaseMinerals, targetAllMinerals) {

    var o = {};
    for(var r in RESOURCES_ALL) {
        var type = RESOURCES_ALL[r];
        if (type == RESOURCE_ENERGY) {
            o[type] = targetEnergy;
        } else if(type.length == 1) {
            o[type] = targetBaseMinerals;
        } else {
            o[type] = targetAllMinerals;
        }
        
    }
    return o;
}

module.exports = obj;