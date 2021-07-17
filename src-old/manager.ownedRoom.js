/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('manager.ownedRoom');
 * mod.thing == 'a thing'; // true
 */
 
var logger = require("screeps.logger");
logger = new logger("manager.ownedRoom");
//logger.enabled = false;
var BuildingManagerClass = require("manager.building");
var LabManagerClass = require("manager.labs");
//global.profiler.registerObject(BuildingManagerClass, "building")
//global.profiler.registerObject(LabManagerClass, "lab")
var obj = function() {
    this.settings = false;
    
    this.creepQueue = [];
    this.roleObjects = {};
    
    this.alreadyHelped = false;
    this.remoteMode = false;
    
    this.labManager = false;
}
var base = require('manager.baseRoom');
obj.prototype = new base();
obj.prototype.isOwnedRoom = true;

global.utils.extendFunction(obj, "init", function(roomName) {
    
    this._init(roomName);
    this.buildingManager = new BuildingManagerClass(this.room);
    this.buildingManager.init(this);
    
    this.labManager = new LabManagerClass();
    this.labManager.init(this);
    
    if (global.utils.flagsByColor(this.roomFlags, COLOR_WHITE, COLOR_YELLOW).length > 0) {
        this.remoteEnergyTarget = true;
        this.remoteMode = true;
    } else {
        this.remoteEnergyTarget = false;
        this.remoteMode = false;
    }
    
    
    this.createStandardRoles();
});

global.utils.extendFunction(obj, "tickInit", function() {
    var enableCPULoggin = false;
    
    this.alreadyHelped = false;
    this.creepQueue = [];
    var cpuStart;
    enableCPULoggin && (cpuStart = Game.cpu.getUsed());
    this.labManager.tickInit();
    enableCPULoggin && logger.log('init lab manager', Game.cpu.getUsed() - cpuStart);
    if (global.utils.flagsByColor(this.roomFlags, COLOR_WHITE, COLOR_YELLOW).length > 0) {
        this.remoteEnergyTarget = true;
        this.remoteMode = true;
    } else {
        this.remoteEnergyTarget = false;
        this.remoteMode = false;
    }
    
    enableCPULoggin && (cpuStart = Game.cpu.getUsed());
    this._tickInit();
    enableCPULoggin && logger.log('base tick init', Game.cpu.getUsed() - cpuStart);
    
    enableCPULoggin && (cpuStart = Game.cpu.getUsed());
    this.buildingManager.tickInit();
    enableCPULoggin && logger.log('init build manager', Game.cpu.getUsed() - cpuStart);
    
    enableCPULoggin && (cpuStart = Game.cpu.getUsed());
    this.logEnergyInRoom();
    logger.log(this.roomName, "stuff in room E:", this.energyOnGround, this.energyInRoom, " m:",this.mineralsOnGround, this.mineralsInRoom)
    if (!this.remoteEnergyRooms || Game.time % 100 == 0) {
        this.remoteEnergyRooms = global.empire.getRemoteEnergyRoomsByRange(this.roomName, 3)
    }
    enableCPULoggin && logger.log('log energy in room', Game.cpu.getUsed() - cpuStart);
});


global.utils.extendFunction(obj, "tick", function() {
    var enableCPULoggin = false;
    
    var cpuStart;
    enableCPULoggin && (cpuStart = Game.cpu.getUsed());
    this._tick();
    enableCPULoggin && logger.log('base tick', Game.cpu.getUsed() - cpuStart);
    
    
    enableCPULoggin && (cpuStart = Game.cpu.getUsed());
    this.buildingManager.tick();
    enableCPULoggin && logger.log('building manager tick', Game.cpu.getUsed() - cpuStart);
    
    enableCPULoggin && (cpuStart = Game.cpu.getUsed());
    this.labManager.tick();
    enableCPULoggin && logger.log('lab manager tick', Game.cpu.getUsed() - cpuStart);
    
    enableCPULoggin && (cpuStart = Game.cpu.getUsed());
    this.requestHelpIfNeeded();
    enableCPULoggin && logger.log('get help', Game.cpu.getUsed() - cpuStart);
});

global.utils.extendFunction(obj, "tickEnd", function() {
    this._tickEnd();
    this.buildingManager.tickEnd();
    this.labManager.tickEnd();
    var towers = this.room.find(FIND_MY_STRUCTURES, {filter:function(s) {return s.structureType == STRUCTURE_TOWER}});
    for (var t in towers) {
        //logger.log(towers)
        towers[t].defend();
    }
    
    this.spawnCreeps();
    
    //hack the links
    var links = this.room.find(FIND_STRUCTURES, {filter:function(s){return s.structureType==STRUCTURE_LINK}});
    var spawnLink = false;
    var storageLink = false;
    for(var l in links) {
        var link = links[l];
        if (link.getSpawn()) {
            spawnLink = link;
        }
        if (link.getStorage()) {
            storageLink = link;
        }
    }
    //console.log("---0-0-0-0-0-0", storageLink, spawnLink)
    if (spawnLink && storageLink) {
        
        if (storageLink.energy == storageLink.energyCapacity && storageLink.cooldown == 0) {
            if (spawnLink.energy < spawnLink.energyCapacity) {
                var amt = spawnLink.energyCapacity - spawnLink.energy;
                if(amt > 100) {
                    storageLink.transferEnergy(spawnLink, amt);
                }
            }
        }
    }
    
    if (this.room.terminal && this.room.terminal.cooldown == 0 && Game.time % 10 == 0) {
        global.utils.market.sellMyMinerals(this.roomName, this.room.terminal.store);
    }
    
    //add remote rooms to build plan
    
    
});

obj.prototype.requestHelpIfNeeded = function() {
    var spawns = this.room.find(FIND_MY_SPAWNS)
    if (this.getAvailableSpawn() == false && spawns.length > 0 && this.creepQueue.length < 3) {
        //we have spawns, but they're busy.. if we're spawning, let's assume we don't need help
        return false;
    }
    if (this.creepQueue.length > 0) {
        for(var i in this.creepQueue) {
            var creepData = this.creepQueue[i].clone();;
            //creepData.useMaxEnergy = true;
            if (this.remoteMode || !this.canSpawn(creepData)) {
                // if (creepData.role != "guard" && this.room.memory.defcon > 0) {
                //     logger.log(this.roomName, "skipping", creepData.role, "because our defcon is", this.room.memory.defcon)
                //     continue;//only guards when you're under attack..
                // }
                global.empire.requestHelperCreep(this.roomName, creepData);
                //return true;
            }
            
        }
    }
    return false;
}
obj.prototype.getResourcesInRemoteTargets = function() {
    var tr = {
        energy:this.energyInRoom,
        energyOnGround:this.energyOnGround,
        minerals:this.mineralsInRoom,
        mineralsOnGround:this.mineralsOnGround
    }
    for(var r in this.remoteEnergyRooms) {
        var rm = this.remoteEnergyRooms[r];
        //logger.log(rm.roomName, rm.energyInRoom, rm.energyOnGround)
        tr.energy += rm.energyInRoom;
        tr.energyOnGround += rm.energyOnGround;
        tr.minerals += rm.mineralsInRoom;
        tr.mineralsOnGround += rm.mineralsOnGround;
    }
    return tr;
}
obj.prototype.getNextRemoteEnergyTarget = function() {
    var _this = this;
    var optionsWithDistance = [];
    logger.log("opts", optionsWithDistance)
    if (this.remoteEnergyRooms.length > 0) {
        optionsWithDistance = _.filter(this.remoteEnergyRooms, (r) => !r.room.memory || !r.room.memory.defCon > 0)
        optionsWithDistance = _.map(optionsWithDistance, function(r) {
            //find creeps targeting this room and add up their storage capacity
            var totalUsedCapacity = 0;
            var transportRole = _this.roleObjects["transporter"];
            
            var creepsTargetingRoom = _.filter(transportRole.workerCreepIds, (c) => (Game.creeps[c] ? Game.creeps[c].memory.targetRoom == r.roomName : false) && Game.creeps[c].memory.transporting == false);
            _.each(creepsTargetingRoom, function(c) {
                if (Game.creeps[c]) {
                    totalUsedCapacity += Game.creeps[c].carryCapacity;
                }
            });
            
            logger.log('-------------------------------------------')
            logger.log(r.roomName, r.energyInRoom, r.energyOnGround, creepsTargetingRoom, totalUsedCapacity)
            
            return {
                roomName: r.roomName,
                dist: Game.map.findRoute(_this.roomName, r.roomName).length,
                energy: Math.ceil((r.energyInRoom + r.energyOnGround * 10)/100),
                minerals: Math.ceil((r.mineralsInRoom + r.mineralsOnGround * 100)/10),
                stuff: Math.ceil((r.mineralsInRoom * 10 + r.mineralsOnGround*20 + r.energyInRoom + r.energyOnGround*2-totalUsedCapacity)/100)
            }
        })
    }
    var totalUsedCapacity = 0;
    var transportRole = this.roleObjects["transporter"];
    
    var creepsTargetingRoom = _.filter(transportRole.workerCreepIds, (c) => (Game.creeps[c] ? Game.creeps[c].memory.targetRoom == this.roomName : false) && Game.creeps[c].memory.transporting == false);
    _.each(creepsTargetingRoom, function(c) {
        if (Game.creeps[c]) {
            totalUsedCapacity += Game.creeps[c].carryCapacity;
        }
    });
    optionsWithDistance.push({
        roomName: this.roomName,
        dist: 0,
        energy: Math.ceil((this.energyInRoom + this.energyOnGround * 10)/1000),
        minerals: Math.ceil((this.mineralsInRoom + this.mineralsOnGround * 100)/10),
        stuff: Math.ceil((this.mineralsInRoom * 10 + this.mineralsOnGround*20 + this.energyInRoom + this.energyOnGround*2 - totalUsedCapacity)/100)
    });
    
    //logger.log("\\",JSON.stringify(optionsWithDistance))
    optionsWithDistance = _.sortBy(optionsWithDistance, function(o) {
        return o.stuff - o.dist * 1;
    })
    optionsWithDistance.reverse();
    console.log("/-------/",JSON.stringify(optionsWithDistance))
    if (optionsWithDistance.length) {
        return optionsWithDistance[0].roomName;
    }
    return false;
}
obj.prototype.canHelp = function(creepRequest) {
    //logger.log("can help?----------------------------------------")
    
    if (this.creepQueue.length > 3 || (this.remoteMode && this.room.controller.level !== global.empire.higestRCL())) {
        return false;
    }
    if (this.room.memory.defcon > 1) {
        return false;
    }
    
    var decentLevel = this.room.controller.level >= (global.empire.higestRCL()-1);
    var enoughEnergy = this.room.energyAvailable > this.room.energyCapacityAvailable*0.7;
    var canSpawnNow = this.canSpawn(creepRequest);
    //logger.log(!this.alreadyHelped, decentLevel, enoughEnergy, canSpawnNow)
    return !this.alreadyHelped && decentLevel && canSpawnNow;
}

obj.prototype.canSpawn = function(creepRequest, maxEnergy) {
    var spawn = this.getAvailableSpawn();
    if (spawn) {
        var e = this.room.energyAvailable;
        if (creepRequest.useMaxEnergy || maxEnergy) {
            e = this.room.energyCapacityAvailable;
        }
        var body = creepRequest.getBody(e);
        //logger.log(body)
        var canSpawn = spawn.spawnCreep(body, creepRequest.getName(), {dryRun:true});
        return canSpawn == 0;
    }
    return false;
}
obj.prototype.addHelperCreep = function(creepRequest) {
   // creepRequest.priority -= 10;
    this.creepQueue.push(creepRequest);
    //this.alreadyhelped = true;
}    
obj.prototype.requestCreep = function(creepRequest) {
    this.creepQueue.push(creepRequest);
    //this.alreadyhelped = true;
}


obj.prototype.getAvailableSpawn = function() {
    var spawns = this.room.find(FIND_MY_SPAWNS, {
        filter: {spawning:null}
    })
    if (spawns.length) {
        return spawns[0];
    } else {
        return false;
    }
}

obj.prototype.spawnQueue = function() {
    // if (this.roleObjects['workers'].numCreeps == 0) {
    //     return _.filter(this.creepQueue, function(t) {
    //         return t.role == "workers"
    //     })
    // }
    // if (this.roleObjects['builders'].numCreeps == 0) {
    //     return _.filter(this.creepQueue, function(t) {
    //         return t.role == "builders"
    //     })
    // }
    
    var q = this.creepQueue;
    var qs = "";
    for(var i in q) {
        qs += q[i].role + "("+ q[i].priority + ") ";
    }
    var thisRoom = this.roomName;
    var q2 = _.sortBy(q, function(c) {
        var pri = c.priority;
        
        if (!c.memory.home || c.memory.home == thisRoom) {
           // pri *= 1//00;
        }
        return pri
        
    });
    
    
    //if we have no workers, kill everything but them
    if (this.numWorkers() == 0) {
        q2 = _.filter(q2, function(req) {
            return req.role == "workers";
        })
    } else if (this.numMiners() == 0) {
        var minerRoles = this.getMinerRoles();
        q2 = _.filter(q2, function(req) {
            //logger.log(req.role, minerRoles)
            return _.indexOf(minerRoles, req.role) != -1;
        })
    }
    
    
    var qs2 = "";
    for(var i in q2) {
        qs2+= q2[i].role + "("+ q2[i].priority + ") ";
    }
    
    // logger.log('---------------------')
    // logger.log(qs)
    // logger.log(qs2)
    return q2.reverse();
}


obj.prototype.spawnCreeps = function() {
    //logger.log(this.room.name, "queue: ", JSON.stringify(this.creepQueue));
    
    var q = this.spawnQueue();
    var qs = '';
    for(var i in q) {
        qs += q[i].role + "("+ q[i].priority + ") ";
    }
    logger.log(this.roomName, "----", qs)
    if (q.length > 0) {
        var spawn = this.getAvailableSpawn();
        logger.log("==",spawn, this.room.energyAvailable)
        if (spawn) {
            
            for(var i in q) {
                var creepData = q[i];
                if (this.room.memory.defcon > 1 && !creepData.important) {
                    continue;
                }
                var maxEnergy = Math.max(this.room.energyAvailable, this.room.energyCapacityAvailable*0.7);
                if (this.numCreeps < 3 || this.creepCrisis()) {
                    maxEnergy = this.room.energyAvailable;
                } else if (creepData.useMaxEnergy) {
                    maxEnergy = this.room.energyCapacityAvailable;
                }
                //logger.log('----------', creepData.role, maxEnergy, JSON.stringify(creepData))
                var body = creepData.getBody(maxEnergy)
                logger.log(this.roomName, "====", creepData.role,JSON.stringify(body))
                
                var memory = creepData.getMemory(this.room.name);
                var name = creepData.getName();
                //logger.log("-----------------", name);
                var res = spawn.createCreep(body, name, memory);
                if (res == 0) {
                    break;
                } else {
                    //wait till we can spawn the first guy
                    
                    //break;  //and now we're dead.  are you happy about blocking all creep spawns when an impossible spawns ends up in the queue?  jerk.
                    
                    //oh yeah... I did this for a reason... if you don't break then you'll never spawn the bigger creeps cuz the smaller ones drain the extensions before they can get filled... anddddd miners are fuckin important..
                    //... important.. that's a flag on my spawn request class.. 
                    //or only break if we have more than x creeps..
                    //going with breaking over x creeps.. but noting that this may be why the colony dies.
                     if (this.numCreeps > 1) {
                         break;
                     }
                }
            }
            if (res != 0) {
                logger.log(this.roomName, 'Cant spawn: ', q.length, q[0].role, res, this.room.energyAvailable, this.room.energyCapacityAvailable, global.utils.creepCost(body))
            }
        }
    } else if(this.creepQueue.length > 0) {
        logger.log('Waiting to spawn: ', this.creepQueue.length, this.creepQueue[0].role)
    }
}



obj.prototype.numWorkers = function () {
    return this.roleObjects["workers"].numCreeps;
}

obj.prototype.getMinerRoles = function() {
    var roles = [];
    var sources = this.room.find(FIND_SOURCES);
    for(var s in sources) {
        var roleName = "miner-"+sources[s].id;
        roles.push( roleName);
    }
    return roles;
}

obj.prototype.numMiners = function () {
    var num = 0;
    var sources = this.room.find(FIND_SOURCES);
    for(var s in sources) {
        var roleName = "miner-"+sources[s].id;
        num += this.roleObjects[roleName].numCreeps;
    }
    return num;
}

obj.prototype.creepCrisis = function () {
    var noWorkers = this.numWorkers() == 0;
    var noMiners = this.numMiners() == 0;
    if (noWorkers || noMiners || this.numCreeps < 5) {
        return true;
    } else {
        return false;
    }
}

obj.prototype.createStandardRoles = function() {
    var roleClasses = global.utils.getRoleClasses();

    //order here affects spawn order
    this.roleObjects["workers"] = new roleClasses.worker();
    this.roleObjects["workers"].init("workers", this);
    
    if (!this.remoteMode || this.room.energyCapacityAvailable > 1000) {
        this.roleObjects["fillers"] = new roleClasses.filler();
        this.roleObjects["fillers"].init("fillers", this);
    }
    
    //make miner roles for each source
    var sources = this.room.find(FIND_SOURCES);
    for(var s in sources) {
        var source = sources[s];
        var roleName = "miner-"+source.id;
        this.roleObjects[roleName] = new roleClasses.miner()
        this.roleObjects[roleName].init(roleName, this, source.pos);
        
        
    }
    if (!this.remoteMode) {
        roleName = "transporter";
        this.roleObjects[roleName] = new roleClasses.transporter()
        this.roleObjects[roleName].init(roleName, this);
    }
    
    var roleName = "minerRocks";
    this.roleObjects[roleName] = new roleClasses.minerRocks()
    this.roleObjects[roleName].init(roleName, this);
    
    if (!this.remote) {
        //order here affects spawn order
        this.roleObjects["builders"] = new roleClasses.builder();
        this.roleObjects["builders"].init("builders", this);
        
        this.roleObjects["builderWalls"] = new roleClasses.builderWalls();
        this.roleObjects["builderWalls"].init("builderWalls", this);
            
        this.roleObjects["upgraders"] = new roleClasses.upgrader();
        this.roleObjects["upgraders"].init("upgraders", this);
        
        this.roleObjects["alchemist"] = new roleClasses.alchemist();
        this.roleObjects["alchemist"].init("alchemist", this);
    }
}

module.exports = obj;