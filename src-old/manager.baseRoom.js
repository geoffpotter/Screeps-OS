/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('manager.baseRoom');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("manager.baseRoom");
//logger.enabled = false;
var obj = function() {
}



var base = require('manager.base');
obj.prototype = new base();


obj.prototype.init = function(roomName, noGuard) {
    this.roomName = roomName;
    if (!Memory.rooms) {
        Memory.rooms = {};
    }
    if (!Memory.rooms[this.roomName]) {
        Memory.rooms[this.roomName] = {
            defcon: 0
        }
    }
    this.visibility = false;
    this.numCreeps = 0;
    if (Game.rooms[roomName]) {
        this.visibility = true;
        this.room = Game.rooms[roomName];
    }
    
    this.roleObjects = {};
    
    
    if (!noGuard && roomName != "sim") {
        var roleClasses = global.utils.getRoleClasses();
        //order here affects spawn order
        this.roleObjects["guard"] = new roleClasses.guard();
        this.roleObjects["guard"].init("guard", this);
    }
    
    this.energyInRoom = 0;
    this.energyOnGround = 0;
    this.mineralsInRoom = 0;
    this.mineralsOnGround = 0;
    this.onlyEnergy = true;
    this.remoteEnergyTarget = false;
    this.mapRoomFlags();
}


obj.prototype.tickInit = function() {
    var enableCPULoggin = false;
    
    if (Game.rooms[this.roomName]) {
        this.visibility = true;
        this.room = Game.rooms[this.roomName];
    } else {
        this.visibility = false;
        this.room = false;
    }
    var cpuStart;
    enableCPULoggin && (cpuStart = Game.cpu.getUsed());
    this.indexHostiles();
    enableCPULoggin && logger.log(cpuStart, 'index hostiles', Game.cpu.getUsed() - cpuStart);
    

    if (this.visibility) {
        this.updateDEFCON();
    }
    enableCPULoggin && logger.log('setDefcon', Game.cpu.getUsed() - cpuStart);
    
    
    if (this.roleObjects["guard"]) {
        this.roleObjects['guard'].requiredCreeps = this.room.memory ? this.room.memory.defcon : 0;
        //logger.log('set num guards', Game.cpu.getUsed() - cpuStart);
    }
    

    this.setFlagRoles();
    enableCPULoggin && logger.log('set flag roles', Game.cpu.getUsed() - cpuStart);
    

    for(var roleName in this.roleObjects) {
        var roleObj = this.roleObjects[roleName];
        roleObj.numCreeps = 0;
    }
    this.assignCreeps();
    enableCPULoggin && logger.log('assign creeps', Game.cpu.getUsed() - cpuStart);
    

    for(var roleName in this.roleObjects) {
        var roleObj = this.roleObjects[roleName];
        //logger.log(roleName)
        var roleStart = Game.cpu.getUsed();
        roleObj.tickInit();
        enableCPULoggin && logger.log("role init:" + roleName, Game.cpu.getUsed() - roleStart)
    }
    enableCPULoggin && logger.log('role Init', Game.cpu.getUsed() - cpuStart);
}
var roleStats = {};
obj.prototype.tick = function() {
    var enableCPULoggin = true;
    for(var roleName in this.roleObjects) {
        enableCPULoggin && (cpuStart = Game.cpu.getUsed());
        var roleObj = this.roleObjects[roleName];
        roleObj.tick();
        if (enableCPULoggin) {
            var cpuPerCreep = (Game.cpu.getUsed() - cpuStart) / roleObj.numCreeps;
            if (cpuPerCreep == Number.POSITIVE_INFINITY) {
                cpuPerCreep = 0;
            }
            if (!roleStats[roleName]) {
                roleStats[roleName] = cpuPerCreep;
            }
            roleStats[roleName] = roleStats[roleName] * 0.9 + cpuPerCreep * 0.1;
            enableCPULoggin && logger.log('role tick ' +roleName, Game.cpu.getUsed() - cpuStart, "numCreeps", roleObj.numCreeps, "per creep:", cpuPerCreep, "avg cpc:", roleStats[roleName]);
        }
    }
}

obj.prototype.tickEnd = function() {
    for(var roleName in this.roleObjects) {
        var roleObj = this.roleObjects[roleName];
        roleObj.tickEnd();
    }
    logger.log(this.roomName, "defcon: ", Memory.rooms[this.roomName].defcon)
    //logger.log(this.roomName, JSON.stringify(_.keys(this.roleObjects)))
    this.displayRoleStatusInVisual();
}



obj.prototype.getRoleStatus = function() {
    var status = [];
    //status.push("Defcon: " + Memory.rooms[this.roomName].defcon)
    if (this.creepCrisis) {
        status.push("In Crisis mode: " + this.creepCrisis())
    }
    if (this.remoteEnergyRooms) {
        var s = _.map(this.remoteEnergyRooms, function(r) {return r.roomName});
        status.push("remote rooms: " + s.join(", "))
    }
    status.push("e in room:" + this.energyInRoom + " m in room:" + this.mineralsInRoom)
    
    
    for(var role in this.roleObjects) {
        var roleObj = this.roleObjects[role];
        var cpuUse = "";
        if (roleStats[role]) {
            cpuUse += " cpu:" + roleStats[role];
        }
        status.push(role + ": " + roleObj.numCreeps + " of " + roleObj.requiredCreeps + cpuUse);
    }
    
    if (this.isOwnedRoom) {
        var spawns = this.room.find(FIND_MY_SPAWNS);
        for(var i in spawns) {
            var s = spawns[i]
            if (s.spawning) {
                var mem = Memory.creeps[s.spawning.name];
                status.push("spawning " + mem.role + " for " + mem.home)
            }
        }
        
        var q = this.spawnQueue();
        var qs = '';
        for(var i in q) {
            qs += q[i].role + "("+ q[i].priority + ") ";
        }
        status.push(qs)
    }
    return status;
}

obj.prototype.displayRoleStatusInVisual = function() {
    var status = this.getRoleStatus();
    var viz = new RoomVisual(this.roomName);
    //logger.enabled = true;
    var yS = 1;
    for(var i in status) {
        var s = status[i];
        viz.text(s, 1, yS + i*1, {align:"left"});
    }
    //logger.log(this.roomName, status);
    

}

obj.prototype.setDEFCON = function(value) {
    this.room.memory.defcon = value;
    if (value == 1 && this.visibility) {
        this.room.memory.structuresAtDEF1 = this.room.find(FIND_STRUCTURES).length;
    }
    this.room.memory.ticksAtDEF = 0;
    this.room.memory.ticksClear = 0;
}
obj.prototype.updateDEFCON = function() {
    var hostileCreeps = this.hostiles;
    
    if (!(this.room.memory.defcon > 0) && hostileCreeps.length > 0 && hostileCreeps.length < 2) {
        this.setDEFCON(1);
    } else if (hostileCreeps.length >= 2) {
        this.setDEFCON(2);
    }
    
    if (hostileCreeps.length > 1) {
        Memory.rooms[this.roomName].ticksAtDEF++;
        Memory.rooms[this.roomName].ticksClear = 0;
    } else {
        Memory.rooms[this.roomName].ticksAtDEF = 0
        Memory.rooms[this.roomName].ticksClear++;
    }
    if (Memory.rooms[this.roomName].ticksAtDEF > 50) {
        this.setDEFCON(Memory.rooms[this.roomName].defcon+1);
    }
    if (Memory.rooms[this.roomName].defcon > 0 && Memory.rooms[this.roomName].ticksClear > 25) {
        this.setDEFCON(Memory.rooms[this.roomName].defcon-1)
    }
    if (Memory.rooms[this.roomName].defcon > 1 && this.room.find(FIND_STRUCTURES).length < Memory.rooms[this.roomName].structuresAtDEF1) {
        if (this.room.controller && this.room.controller.my && Memory.rooms[this.roomName].structuresAtDEF1 > 3) {
            //this.room.controller.activateSafeMode();
            this.room.createFlag(this.room.controller, "panic_"+this.roomName, COLOR_RED, COLOR_ORANGE)
        }
    }
}


obj.prototype.indexHostiles = function() {

    this.hostiles = [];
    this.invaders = [];
    this.meleeCreeps = [];
    this.rangedCreeps = [];
    this.healerCreeps = [];
    if (this.visibility) {
        cpu = Game.cpu.getUsed();
        this.hostiles = this.room.getHostileCreeps();
        logger.log("get list of hostiles", Game.cpu.getUsed() - cpu)
        cpu = Game.cpu.getUsed();
        for (var i in this.hostiles) {
            var hostile = this.hostiles[i];
            //logger.log(this.roomName, JSON.stringify(hostile.owner))
            if (hostile.owner.username == "Invader") {
                this.invaders.push(hostile);
            }
            if (hostile.getActiveBodyparts(ATTACK)) {
                this.meleeCreeps.push(hostile);
            }
            if (hostile.getActiveBodyparts(RANGED_ATTACK)) {
                this.rangedCreeps.push(hostile);
            }
            if (hostile.getActiveBodyparts(HEAL)) {
                this.healerCreeps.push(hostile);
            }
        }
        logger.log("loop list of hostiles", Game.cpu.getUsed() - cpu)
        
        cpu = Game.cpu.getUsed();
        if (this.hostiles.length > 0) {
            this.room.memory.lastHostilePos = this.hostiles[0].pos;
            this.room.memory.lastHostilePos.tick = Game.time;
        }
        logger.log("last loc logic", this.hostiles.length, Game.cpu.getUsed() - cpu)
        if (this.room.memory.defcon == 0 || this.room.memory.lastHostilePos && (Game.time - this.room.memory.lastHostilePos.tick > 1000)) {
            this.room.memory.lastHostilePos = false;
        }
        logger.log("last loc logic2", this.hostiles.length, Game.cpu.getUsed() - cpu)
    }
    
}

obj.prototype.requestCreep = function(creepRequest) {
    global.empire.requestHelperCreep(this.roomName, creepRequest);
}

obj.prototype.assignCreeps = function() {
    //return;
    var _this = this;
    var creepNames = _.keys(Memory.creeps);
    var ourCreeps = _.filter(creepNames,function(c) {return Memory.creeps[c].home == _this.roomName});
    this.numCreeps = 0;
    for (var c in ourCreeps) {
        var creepName = ourCreeps[c]
        var creep = Game.creeps[creepName];
        //logger.log(creepName, "assigning", creep)
        if (!creep) {
            logger.log(creepName, "died, removing memory");
            //creeps dead yo, delete his shit.. and like.. unassign him?  can we do that?
            var memory = Memory.creeps[creepName];
            var roleObj =  _.find(this.roleObjects, function(r) {return r.name == memory.role});
            
            if (roleObj) {
                if (_.isArray(roleObj[memory.assignmentVar])) {
                    _.remove(roleObj[memory.assignmentVar], function(i) {
                        return i == creepName;
                    });
                    
                    
                } else {
                    roleObj[memory.assignmentVar] = false;
                }
            }
            
            delete Memory.creeps[creepName];
        } else {
            if (creep.memory) {
                var roleObj =  _.find(this.roleObjects, function(r) {return r.name == creep.memory.role});
                
                // logger.log("////////"+creep.memory.role);
                // logger.log(JSON.stringify(_.keys(this.roleObjects)))
                // logger.log(roleObj)
                if (roleObj) {
                    if (!roleObj.numCreeps) {
                        roleObj.numCreeps = 0;
                    }
                    if (_.isArray(roleObj[creep.memory.assignmentVar])) {
                        if (_.indexOf(roleObj[creep.memory.assignmentVar], creep.name) == -1) {
                            roleObj[creep.memory.assignmentVar].push(creep.name);
                        }
                        
                        roleObj.numCreeps++;
                    } else {
                        roleObj[creep.memory.assignmentVar] = creep.name;
                        roleObj.numCreeps++;
                    }
                    this.numCreeps++;
                    //logger.log(creep.name, roleObj.name, "assign", roleObj.numCreeps)
                } else {
                    logger.log(creep.name, "sees no role for themselves in the world.. ", creep.memory.role);
                    this.handleOrphanedCreep(creep);
                }
                   
            } else {
                logger.log(creep.name, "what was I doing? I forgot everything..");
            }
        }
    }
}

obj.prototype.hostilesByFlags = function() {
    var hostiles = [];
    for(var i in this.roomFlags) {
        var flag = this.roomFlags[i];
        var jerks = flag.hostilesInRange(10);
        //logger.log(flag, jerks, hostiles)
        hostiles = hostiles.concat(jerks);
    }
    //logger.log(hostiles);
    return _.uniq(hostiles);
}

obj.prototype.logEnergyInRoom = function() {
    //figure out how much energy is in the room/on the ground
    if (this.visibility) {
        this.energyInRoom = 0;
        this.energyOnGround = 0;
        this.mineralsInRoom = 0;
        this.mineralsOnGround = 0;
        
        
        var stuffOnGround = this.room.find(FIND_DROPPED_RESOURCES);
        this.onlyEnergy = true;
        for(var i in stuffOnGround) {
            var stuff = stuffOnGround[i];
            //logger.log(this.room, 'on ground', stuff.resourceType, stuff.amount)
            if (stuff.resourceType != RESOURCE_ENERGY) {
                this.onlyEnergy = false;
                this.mineralsInRoom += stuff.amount;
                this.mineralsOnGround += stuff.amount;
            } else {
                this.energyInRoom += stuff.amount;
                this.energyOnGround += stuff.amount;
            }
        }
        
        var conts = this.room.find(FIND_STRUCTURES, {filter: function(s) {
            return s.structureType == STRUCTURE_CONTAINER && !s.getSpawn()
            
        }});
        logger.log(this.room, "num conts: ",conts.length)
        for(var i in conts) {
            var store = conts[i].store;
            //logger.log(JSON.stringify(store))
            for(var type in store) {
                var amt = store[type];
                //logger.log('here', type, amt)
                if (type != RESOURCE_ENERGY) {
                    this.onlyEnergy = false;
                    this.mineralsInRoom += amt;
                } else {
                    this.energyInRoom += amt;
                }
            }
        }
    }
}

obj.prototype.handleOrphanedCreep = function(creep, onlyLocal) {
    var baseRole = false;
    if (creep.memory.role) {
        //grab name before the dash
        baseRole = creep.memory.role.split("-")[0];
        
    } else {
        logger.log(creep.name, "doesn't even know his damn job.. try by name")
        baseRole = creep.name.split("-")[0];
    }
    
    if (baseRole) {
        var roleOptions = this.getRoleByBaseRole(baseRole);
        roleOptions = _.sortBy(roleOptions, function(r) {
            return r.numCreeps;
        })
        logger.log(baseRole, roleOptions, _.keys(this.roleObjects))
        if (roleOptions.length > 0) {
            logger.log(creep.name, "found a job", roleOptions[0].name)
            creep.memory.role = roleOptions[0].name;
            return true;
        } else  {
            logger.log(creep.name, "can't find a job", baseRole);
            //currentRoom, creep, baseRole
            if (!onlyLocal) {
                global.empire.findJobForCreep(this.roomName, creep, baseRole);
            }
        }
    }
    return false;
}
obj.prototype.getRoleByBaseRole = function(baseRole) {
    var roles = [];
    for(var roleName in this.roleObjects) {
        var role = this.roleObjects[roleName];
        if (baseRole == role.baseRoleName()) {
            roles.push(role);
        }
    }
    return roles;
}
obj.prototype.creepsInBaseRole = function(baseRole) {
    var roles = this.getRoleByBaseRole(baseRole);
    var num = 0;
    for(var i in roles) {
        num += roles[i].numCreeps;
    }
    return num;
}
obj.prototype.setFlagRoles = function() {
    this.mapRoomFlags();
    var roleClasses = global.utils.getRoleClasses();
    var roomManager = this;
    //set keeper squad roles
    
    this.flagRoleDefinitions = {
        //Keeper roles
        "keeperMage": {
            roleClass: "fMage",
            flagColor: COLOR_RED,
            flagSecondaryColor: COLOR_ORANGE,
            initFunc: function(role, roleName, flag) {
                role.init(roleName, roomManager, flag);
                role.requiredCreeps = 2;
            },
            rolePerFlag:true
        },
        // "keeperPaladin": {
        //     roleClass: "fPaladin",
        //     flagColor: COLOR_RED,
        //     flagSecondaryColor: COLOR_ORANGE,
        //     initFunc: function(role, roleName, flag) {
        //         role.init(roleName, roomManager, flag);
        //         role.requiredCreeps = 1;
        //     },
        //     rolePerFlag:true
        // },
        "keeperHealer": {
            roleClass: "fHealer",
            flagColor: COLOR_RED,
            flagSecondaryColor: COLOR_ORANGE,
            initFunc: function(role, roleName, flag) {
                role.init(roleName, roomManager, flag);
                role.requiredCreeps = 1;
            },
            rolePerFlag:true
        },
        
    
        //remote mining roles
        
        "miner": {
            roleClass: "minerNextRoom",
            flagColor: COLOR_YELLOW,
            flagSecondaryColor: COLOR_YELLOW,
            initFunc: function(role, roleName, flag) {
                if (!roomManager.homeRoomManager) {
                    logger.log("-------------CAN'T remote transport without a home room manager")
                }
                role.init(roleName, roomManager, flag.pos, roomManager.roomName);
                role.requiredCreeps = 1;
                role.dangerZone = true;
            },
            rolePerFlag:true
        },
        "minerRocks": {
            roleClass: "minerRocks",
            flagColor: COLOR_YELLOW,
            flagSecondaryColor: COLOR_PURPLE,
            initFunc: function(role, roleName, flag) {
                if (!roomManager.homeRoomManager) {
                    logger.log("-------------CAN'T remote transport without a home room manager")
                }
                role.init(roleName, roomManager);
                role.requiredCreeps = 1;
                role.dangerZone = true;
            },
            rolePerFlag:true
        },
        // "transporter": {
        //     roleClass: "transporterNextRoom",
        //     flagColor: COLOR_YELLOW,
        //     flagSecondaryColor: COLOR_YELLOW,
        //     initFunc: function(role, roleName, flag) {
        //         if (!roomManager.homeRoomManager) {
        //             logger.log("-------------CAN'T remote transport without a home room manager")
        //         }
        //         role.init(roleName, roomManager, roomManager.homeRoomManager);
        //         role.requiredCreeps = 1;
        //         if (roomManager.homeRoomManager.room && roomManager.homeRoomManager.room.controller.level < 4) {
        //             role.requiredCreeps = 4;
        //         }
        //         role.dangerZone = true;
        //     },
        //     rolePerFlag:true
        // },
        "transporter-ex": {
            roleClass: "transporterNextRoom",
            flagColor: COLOR_YELLOW,
            flagSecondaryColor: COLOR_BLUE,
            initFunc: function(role, roleName, flag) {
                if (!roomManager.homeRoomManager) {
                    logger.log("-------------CAN'T remote transport without a home room manager")
                }
                role.init(roleName, roomManager, roomManager.homeRoomManager);
                role.requiredCreeps = 3;
                role.dangerZone = true;
            },
            rolePerFlag:true
        },
        
    }
    
    
    for(var roleName in this.flagRoleDefinitions) {
        var def = this.flagRoleDefinitions[roleName];
        
        
        var flags = global.utils.flagsByColor(this.roomFlags, def.flagColor, def.flagSecondaryColor);
        
        
        if (flags.length > 0) {
            //logger.log(this.roomFlags, flags);
            //logger.log(this.roomFlags[1] && this.roomFlags[1].color, def.color);
            var name = roleName;
            if (def.rolePerFlag) {
                //one role per flag
                for(var f in flags) {
                    var flag = flags[f];
                    var flagsAtPos = global.utils.flagsAtPos(flags, flag.pos);
                    var thisName = name + "-" + flag.pos.roomName + "-" + flag.pos.x + "-" + flag.pos.y;
                    //logger.log("=/=/=/=/", thisName, flagsAtPos)
                    this.addRemoveRolesForFlags(thisName, def.roleClass, flagsAtPos, def.initFunc);
                }
                
            } else {
                this.addRemoveRolesForFlags(name, def.roleClass, flags, def.initFunc);
            }
            
            
        }
    }
    //logger.log(_.keys(this.roleObjects))

    
  
}

obj.prototype.addRemoveRolesForFlags = function(roleName, roleClassName, flags, initFunc) {
    var roleClasses = global.utils.getRoleClasses();
    for (var i=0; i<10; i++) {
        var name = roleName + "-" + i;
        var flag = flags[i];
        //logger.log(name, flag);
        if (flag) {
            //need a role
            if (!this.roleObjects[name]) {
                this.roleObjects[name] = new roleClasses[roleClassName]();
                initFunc(this.roleObjects[name], name, flag);
            }
        } else {
            //don't need a role.. bye bye mofo, may your creeps die with zero ticks to live.
            if (this.roleObjects[name]) {
                delete this.roleObjects[name];
            }
        }
    }
}

obj.prototype.mapRoomFlags = function() {
    this.roomFlags = [];
    for(var i in Game.flags) {
        var flag = Game.flags[i];
        if (flag.pos.roomName == this.roomName) {
                this.roomFlags.push(flag);
        }
    }
}

module.exports = obj;