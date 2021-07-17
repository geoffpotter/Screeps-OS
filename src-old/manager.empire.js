/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('manager.empire');
 * mod.thing == 'a thing'; // true
 */




var logger = require("screeps.logger");
logger = new logger("manager.empire");
//logger.enabled = false;
var ownedRoomManagerClass = require("manager.ownedRoom");
var remoteMiningManagerClass = require("manager.remoteMiningRoom");
var claimManagerClass = require("manager.claimRoom");
var murderManagerClass = require("manager.murderRoom");
var keeperManagerClass = require("manager.keeperRoom");
var pathManagerClass = require("manager.paths");
//var roomManagerClass = require("manager.ownedRoom");

//global.profiler.registerObject(ownedRoomManagerClass, "ownedRoom")
//global.profiler.registerObject(remoteMiningManagerClass, "remoteRoom")
//global.profiler.registerObject(claimManagerClass, "claimRoom")
//global.profiler.registerObject(murderManagerClass, "murderRoom")
//global.profiler.registerObject(keeperManagerClass, "keeperRoom")
//global.profiler.registerObject(pathManagerClass, "paths")


var obj = function() {
    this.roomManagers = {};
}
var base = require('manager.base');
obj.prototype = new base();


global.utils.extendFunction(obj, "init", function() {
    // for(var i in Game.creeps) {
    //     var c = Game.creeps[i];
    //     c.memory.home="E47S56";
    //     c.memory.assignmentVar = "workerCreepIds"
    //     c.memory.role = "workers"
    // }
    this.pathManager = new pathManagerClass();
    this.pathManager.init();
    
    
    this.createOwnedRooms();
    this.createRemoteMiningRooms();
    this.createClaimRooms();
    this.createMurderRooms();
    this.createKeeperRooms();
});

global.utils.extendFunction(obj, "tickInit", function() {
    console.log("-------------------------------------------tickInit-------------------------------------------");
    this.roomManagersToDelete = [];
    this.createOwnedRooms();
    this.createRemoteMiningRooms();
    //logger.log("-0-0-0-0-0-0")
    this.createClaimRooms();
    this.createMurderRooms();
    this.createKeeperRooms();

    for(var roomName in this.roomManagers) {
        var rm = this.roomManagers[roomName];
        cpuStart = Game.cpu.getUsed();
        rm.tickInit();
        logger.log('init room ' +roomName, Game.cpu.getUsed() - cpuStart);
    }
    
    
    var cpuStart = Game.cpu.getUsed();
    this.pathManager.tickInit();
    logger.log('init path manager', Game.cpu.getUsed() - cpuStart);
});


global.utils.extendFunction(obj, "tick", function() {
    roomsStart = Game.cpu.getUsed();
    // _.each(this.roomManagers, function(rm, roomName) {
    //     roleStart = Game.cpu.getUsed();
    //     rm.tick();
    //     logger.log('tick room ' +roomName, Game.cpu.getUsed() - roleStart);
    // });
    cpuStart = Game.cpu.getUsed();
    var keys = _.keys(this.roomManagers);
    logger.log('get keys ' +roomName, Game.cpu.getUsed() - cpuStart);
    
    for(var roomName in this.roomManagers) {
        var cpuStart = Game.cpu.getUsed();
        var rm = this.roomManagers[roomName];
        rm.tick();
        logger.log('tick room ' +roomName, Game.cpu.getUsed() - cpuStart);
    }
    logger.log('all rooms', Game.cpu.getUsed() - roomsStart);
    cpuStart = Game.cpu.getUsed();
    this.pathManager.tick();
    logger.log('tick pathmanager', Game.cpu.getUsed() - cpuStart);
    
});

global.utils.extendFunction(obj, "tickEnd", function() {
    for(var roomName in this.roomManagers) {
        var rm = this.roomManagers[roomName];
        rm.tickEnd();
    }
    //logger.log("=====-=",_.keys(this.roomManagers.sim.roleObjects))
    this.killDeadRooms();
    
    if(Game.cpu.bucket > 5000 && Game.time%5==0) {
        //market shit.. if we got bucket
        global.utils.market.watchMarket();
    }
    
    //find jobs for creeps without room managers
    for(var c in Game.creeps) {
        var creep = Game.creeps[c];
        if (!this.roomManagers[creep.memory.home]) {
            logger.log(creep.name, "has no home, finding a job");
            if (!creep.memory.role) {
                console.log(creep.name, "don't know his job", creep.pos.roomName)
                this.findJobForCreep(creep.memory.home, creep, creep.name.split("-")[0])
            } else {
                this.findJobForCreep(creep.memory.home, creep, creep.memory.role.split("-")[0])
            }
        }
    }
    
    this.pathManager.tickEnd();
});

obj.prototype.getHomeRooms = function() {
    var homeRooms = [];
    for (var i in this.roomManagers) {
        if (this.roomManagers[i].isOwnedRoom == true) {
            homeRooms.push(i);
        }
    }
    return homeRooms;
}


obj.prototype.findJobForCreep = function(currentRoom, creep, baseRole) {
    var options = this.roomManagers;
    var _this = this;
    optionsWithDistance = _.map(options, function(r) {
        //logger.log(currentRoom, r.roomName)
        return {
            roomName: r.roomName,
            dist: (r.roomName != currentRoom) ? global.utils.distBetweenRooms(currentRoom, r.roomName) : 100,
            num: r.creepsInBaseRole(baseRole)
        }
    })
    optionsWithDistance = _.sortBy(optionsWithDistance, ["dist", "num"])
    //logger.log("here???",JSON.stringify(optionsWithDistance));
    for(var i in optionsWithDistance) {
        var opt = optionsWithDistance[i];
        if (opt.roomName != currentRoom) {
            var rm = this.roomManagers[opt.roomName];
            logger.log(creep.name, "looking for job in", rm.roomName)
            if (rm.handleOrphanedCreep(creep, true)) {
                logger.log(creep.name, "found job")
                creep.memory.home = rm.roomName;
                return true;
            }
        }
    }
    
    logger.log(creep.name, "No job")
    return false;
}

obj.prototype.getHomeRoomByRange = function(fromLoc) {
    var options = this.getHomeRooms();
    optionsWithDistance = _.map(options, function(r) {
        return {
            roomName: r,
            dist: global.utils.distBetweenRooms(fromLoc.roomName, r),
            level: Game.rooms[r].controller.level
        }
    })
    
    optionsWithDistance = _.sortBy(optionsWithDistance, ["dist", "level"])
    optionsWithDistance = _.filter(optionsWithDistance, function(r) { return r.dist < 3})
    //logger.log(JSON.stringify(optionsWithDistance));
    if (optionsWithDistance.length > 0) {
        return optionsWithDistance[0].roomName;
    }
    return false;
}

obj.prototype.getRemoteEnergyRoomsByRange = function(startRoom, range) {
    var rooms = _.filter(this.roomManagers, function(rm) {
        var creepCrisis = false;
        var roomUseable = rm.remoteEnergyTarget && global.utils.distBetweenRooms(startRoom, rm.roomName) <= range;
        //logger.log(rm.roomName, rm.remoteEnergyTarget, global.utils.distBetweenRooms(startRoom, rm.roomName), roomUseable)
        return roomUseable;
        
    });
    //logger.log("------",startRoom, _.map(rooms, (c) => c.roomName))
    //sort by amount of stuff
    rooms = _.sortBy(rooms, function(r) {return r.energyInRoom + r.mineralsInRoom});
    //logger.log("////",startRoom, _.map(rooms, (c) => c.roomName))
    return rooms;
    
}
obj.prototype.createOwnedRooms = function() {
    for(var roomName in Game.rooms) {
        var room = Game.rooms[roomName];
        if (room && room.controller && room.controller.my && !this.roomManagers[roomName]) {
            logger.log("^^ Creating new Owned room",roomName);
            this.roomManagers[roomName] = new ownedRoomManagerClass();
            this.roomManagers[roomName].init(room.name);
        }
    }
}

obj.prototype.createRemoteMiningRooms = function() {
    
    for(var i in Game.flags) {
        var flag = Game.flags[i];
        var roomName = flag.pos.roomName;
        if (flag.color == COLOR_YELLOW && flag.secondaryColor == COLOR_GREEN && !this.roomManagers[roomName]) {
            logger.log("^^ Creating new remote room",i,flag.pos.roomName);
            this.roomManagers[roomName] = new remoteMiningManagerClass();
            this.roomManagers[roomName].init(flag.pos.roomName);
        }
        
    }
};


obj.prototype.createClaimRooms = function() {
    for(var i in Game.flags) {
        var flag = Game.flags[i];
        var roomName = flag.pos.roomName;
        
        if (flag.color == COLOR_GREEN && flag.secondaryColor == COLOR_GREEN && !this.roomManagers[roomName]) {
            var homeRoom = this.getHomeRoomByRange(flag.pos);
            logger.log("^^ Creating new claim room",i,flag.pos.roomName, this.roomManagers[homeRoom]);
            this.roomManagers[roomName] = new claimManagerClass();
            
            
            this.roomManagers[roomName].init(flag.pos.roomName, this.roomManagers[homeRoom]);
            
        }
    }
}


obj.prototype.createMurderRooms = function() {
    logger.log('creating murder rooms');
    var rooms = {};
    for(var i in Game.flags) {
        var flag = Game.flags[i];
        var roomName = flag.pos.roomName;
        
        if (flag.color == COLOR_RED && flag.secondaryColor == COLOR_RED) {
            rooms[roomName] = 1;
            if (!this.roomManagers[roomName]) {
                logger.log("^^ Creating new murder room",i,flag.pos.roomName);
                
                this.roomManagers[roomName] = new murderManagerClass();
                this.roomManagers[roomName].init(flag.pos.roomName);
            }
        }
    }
    rooms = _.keys(rooms);
    logger.log("kill rooms", rooms);
}

obj.prototype.createKeeperRooms = function() {
    logger.log('creating keeper rooms');
    var rooms = {};
    for(var i in Game.flags) {
        var flag = Game.flags[i];
        var roomName = flag.pos.roomName;
        
        if (flag.color == COLOR_RED && flag.secondaryColor == COLOR_ORANGE) {
            rooms[roomName] = 1;
            if(!this.roomManagers[roomName]) {
                var homeRoom = this.getHomeRoomByRange(flag.pos);
                logger.log("^^ Creating new keeper room",i,flag.pos.roomName, this.roomManagers[homeRoom]);
                
                this.roomManagers[roomName] = new keeperManagerClass();
                this.roomManagers[roomName].init(flag.pos.roomName, this.roomManagers[homeRoom]);
            }
        }
    }
    rooms = _.keys(rooms);
    logger.log("keeper rooms", rooms);
}

obj.prototype.requestHelperCreep = function(roomManagerNeedingHelp, creepNeeded) {
    //logger.log(roomManagerNeedingHelp, "is a little bitch")
    var needHelpRM = this.roomManagers[roomManagerNeedingHelp];
    if (!needHelpRM) {
        logger.log("<p style='color:red'>help for peeps that don't exist", roomManagerNeedingHelp)
    }
    var helpers = _.filter(this.roomManagers, function(rm) {
        // if (rm.roomName == needHelpRM.roomName) {
        //     return false;
        // }
        var creepCrisis = false;
        if (needHelpRM.isOwnedRoom) {
            creepCrisis = needHelpRM.creepCrisis();
        }
        return rm.isOwnedRoom == true && (creepCrisis || creepNeeded.important || global.utils.distBetweenRooms(roomManagerNeedingHelp, rm.roomName) < 5)
        
    })
    if (helpers.length == 0) {
        return false;
    }
    helpers = _.sortBy(helpers, function (rm) {return rm.room.energyAvailable});
    helpers = helpers.reverse();
    // for(var r in helpers) {
    //     var helper = helpers[r]
    //     logger.log(helper.roomName, helper.room.energyAvailable, helper.room.energyCapacityAvailable)
    // }
    for(var r in helpers) {
        var rm = helpers[r];
        if (rm.requestCreep) {
            if (rm.roomName != roomManagerNeedingHelp) {
                var canHelp = rm.canHelp(creepNeeded);
                //logger.log(roomManagerNeedingHelp, rm.roomName, canHelp,"=====", creepNeeded.role)
                if (canHelp) {
                    if (!creepNeeded.memory) {
                        creepNeeded.memory = {};
                    }
                    
                    if (!creepNeeded.memory.home) {
                        creepNeeded.memory.home = roomManagerNeedingHelp;
                    }
                    creepNeeded.memory.helperCreep = true;
                    rm.addHelperCreep(creepNeeded);
                    logger.log(JSON.stringify(roomManagerNeedingHelp), "getting help from", rm.roomName);
                    return;
                }
            }
        }
    }
    logger.log(roomManagerNeedingHelp, "needs to handle it's own problems, shits rough out here");
}
obj.prototype.higestRCL = function() {
    var highest = 0;
    for(var r in Game.rooms) {
        var room = Game.rooms[r];
        if (room.controller && room.controller.my) {
            highest = Math.max(highest, room.controller.level);
        }
    }
    return highest;
}
obj.prototype.killMe = function(roomName) {
    this.roomManagersToDelete.push(roomName);
}
obj.prototype.killDeadRooms = function() {
    for(var i in this.roomManagersToDelete) {
        var roomName = this.roomManagersToDelete[i];
        logger.log("dead room!",roomName)
        delete this.roomManagers[roomName];
    }
};

module.exports = obj;