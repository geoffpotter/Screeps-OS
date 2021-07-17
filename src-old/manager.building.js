/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('manager.building');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("manager.building");
logger.enabled = true;

var helper = require("util.building");

var obj = function() {
    
}

obj.prototype.init = function(roomManager) {
    this.roomManager = roomManager;
    this.building = false;
    this.reservedLocs = [];
    this.resetPlan();
    this.mapFlags();
}

obj.prototype.tickInit = function() {
    this.mapFlags();
    
    this.makeBuildPlan();
}

obj.prototype.tick = function() {
    
}

obj.prototype.tickEnd = function() {
    if (this.buildDisplayFlag || !this.buildEnabledFlag) {
        helper.displayBuildPlan(this.buildPlan);
    }
    if (this.roomManager.isOwnedRoom && !this.roomManager.remoteMode) {
        this.addRemoteRoomsToBuildPlan();
    }
    if (this.buildEnabledFlag && Game.time % 100 == 0) {
        
        
        logger.log(this.roomManager.roomName, "building")
        helper.executeBuildPlan(this.buildPlan, this.roomManager.room.controller.level);
    }
}


obj.prototype.mapFlags = function() {
    this.buildLocFlag = false;
    this.storageLocFlag = false;
    this.labsLocFlag = false;
    this.buildDisplayFlag = false;
    this.buildEnabledFlag = false;
    for(var i in Game.flags) {
        var flag = Game.flags[i];
        if (flag.pos.roomName == this.roomManager.roomName) {
            if (flag.color == COLOR_WHITE && flag.secondaryColor == COLOR_WHITE) {
                this.buildLocFlag = flag;
            }
            if (flag.color == COLOR_WHITE && flag.secondaryColor == COLOR_BLUE) {
                this.storageLocFlag = flag;
            }
            if (flag.color == COLOR_WHITE && flag.secondaryColor == COLOR_CYAN) {
                this.labsLocFlag = flag;
            }
            if (flag.color == COLOR_WHITE && flag.secondaryColor == COLOR_PURPLE) {
                this.buildDisplayFlag = flag;
            }
            if (flag.color == COLOR_WHITE && flag.secondaryColor == COLOR_RED) {
                this.buildEnabledFlag = flag;
            }
        }
        
    }
}

obj.prototype.addRemoteRoomsToBuildPlan = function() {
    if (Math.random() < 0.8) {
        return false;
    }
    var remoteRooms = this.roomManager.remoteEnergyRooms;
    for(var r in remoteRooms) {
        var rm = remoteRooms[r];
        if (!this.buildPlan.remoteRooms) {
            this.buildPlan.remoteRooms = [];
        }
        if (_.indexOf(this.buildPlan.remoteRooms, rm.roomName) == -1 && rm.visibility) {
            var sources = rm.room.find(FIND_SOURCES);
            var worked = true;
            for(var s in sources) {
                var source = sources[s];
                var target = this.buildPlan.storage ? this.buildPlan.storage : this.buildLocFlag;
                logger.log(rm.roomName, "wtf-----", this.buildPlan.storage, this.buildLocFlag)
                if (target) {
                    var thisWorked = this.addRoadsAndContainerToPosition(target, source.pos, true);
                    logger.log(this.roomManager.roomName, "adding", rm.roomName, JSON.stringify(source.pos), thisWorked);
                    worked = worked && thisWorked;
                } else {
                    worked = false;
                }
                
            }
            if (worked) {
                this.buildPlan.remoteRooms.push(rm.roomName);
            }
        }
    }
    
}


obj.prototype.resetPlan = function() {

    this.buildPlan = {
        spawns:[],
        extensions:[],
        containers:[],
        towers:[],
        links:[],
        roads:[],
        storage:false,
        terminal:false,
        extractors:[],
        labs:[],
        remoteRooms:[],
    };
    //this.room.memory.buildPlan = this.buildPlan
}



obj.prototype.makeBuildPlan = function() {
    if (!this.roomManager.room || !this.roomManager.room.controller.my)
        return;
    var baseLoc = false;//this.room.getPositionAt(45, 22);
    if (this.buildLocFlag) {
        baseLoc = this.buildLocFlag.pos;
    } else if (this.buildEnabledFlag) {
        baseLoc = this.buildEnabledFlag.pos;
    }
    
    //logger.log(baseLoc,'----------------------------------------------')
    var room = this.roomManager.room;
    
    this.resetPlan();
    if (room.memory.buildPlan && room.memory.buildPlan.startLoc && (!baseLoc || (baseLoc.x == room.memory.buildPlan.startLoc.x && baseLoc.y == room.memory.buildPlan.startLoc.y))) {
        this.buildPlan = room.memory.buildPlan;
        //logger.log('got it')
        return;
    } else {
        this.resetPlan();
    }    
    if (!baseLoc)
        return;
    
    this.buildPlan.startLoc = baseLoc;
    
    this.reservedLocs[baseLoc] = true;

    
    
    logger.log('0--0000-------------------------------')
    //make roads
    var pathSpawnToController = PathFinder.search(baseLoc, {pos:room.controller.pos, range:3});
    //console.log(pathSpawnToController.path);
    pathSpawnToController = pathSpawnToController.path;
     
    
    //plan extensions
    var p;
    
    
    
    
    var dirs = [
        //up/down
        {x:1,y:0},
        {x:-1,y:0},
        {x:0,y:1},
        {x:0,y:-1},
        
    ];
    
    for(var i in dirs) {
        var dir = dirs[i];
        p = this.castPath(baseLoc, dir, 1, 3);
        this.clearExtensionsAlongPath(p);
        global.utils.drawPath(p)
        helper.addRoadsToPath(this.buildPlan, p);
        this.clipPathForExtentions(p, 2);
        if (p.length) {
            //global.utils.drawPath(p)
            helper.addExtentionsToPath(this.buildPlan, p);
        }
        
    }
    var dirs = [
        // //diag
        {x:1,y:1},
        {x:-1,y:1},
        {x:1,y:-1},
        {x:-1,y:-1},
    ];
    
    for(var i in dirs) {
        var dir = dirs[i];
        p = this.castPath(baseLoc, dir, 1, 3);
        this.clearExtensionsAlongPath(p);
        global.utils.drawPath(p)
        helper.addRoadsToPath(this.buildPlan, p);
        this.clipPathForExtentions(p, 1);
        if (p.length) {
            //global.utils.drawPath(p)
            helper.addExtentionsToPath(this.buildPlan, p, true);
        }
    } 


    
    this.buildPlan.extensions = _.sortBy(this.buildPlan.extensions, function(struct) {
        return new RoomPosition(struct.x, struct.y, struct.roomName).getRangeTo(baseLoc);
    });
    this.buildPlan.extensions = _.uniq(this.buildPlan.extensions, function(loc) {return loc.roomName + ":" + loc.x + "," + loc.y});
    this.buildPlan.extensions.splice(60);
    
    helper.removePlannedRoadsNotNearExtensions(this.buildPlan);
    
    
    //add spawn in base
    this.buildPlan.spawns.push({x:baseLoc.x-1, y:baseLoc.y, roomName:baseLoc.roomName});
    //add spawnContainer
    this.buildPlan.containers.push({x:baseLoc.x, y:baseLoc.y, roomName:baseLoc.roomName})
    //add towers in base
    this.buildPlan.towers.push({x:baseLoc.x+1, y:baseLoc.y, roomName:baseLoc.roomName});
    this.buildPlan.towers.push({x:baseLoc.x, y:baseLoc.y-1, roomName:baseLoc.roomName});
    //add base link
    this.buildPlan.links.push({x:baseLoc.x, y:baseLoc.y+1, roomName:baseLoc.roomName});
    
    var sourcePaths = [];
    var sources = room.find(FIND_SOURCES);
    var costMatrix = this.planCostMatrix();
    for(var i in sources) {
        var s = sources[i];
        this.addRoadsAndContainerToPosition(baseLoc, s.pos)
    }
    
    //console.log(JSON.stringify(costMatrix), _.sum(costMatrix._bits))
    
    var costMatrix = this.planCostMatrix();
    
    
    //plan storage
    var pathToStorage = false;
    var storagePathOffset = 2;
    var storagePos = false;
    if (this.storageLocFlag) {
        pathToStorage = PathFinder.search(baseLoc, {pos:this.storageLocFlag.pos, range:0}, {
            plainCost: 2,
            swampCost: 10,
            ignoreStructures: true,
            roomCallback: function(roomName) {return costMatrix;}
        });
        storagePathOffset = 1;
        storagePos = this.storageLocFlag.pos;
    } else if (room.storage) {
        pathToStorage = PathFinder.search(baseLoc, {pos:room.storage.pos, range:0}, {
            plainCost: 2,
            swampCost: 10,
            ignoreStructures: true,
            roomCallback: function(roomName) {return costMatrix;}
        });
        storagePathOffset = 1;
        storagePos = room.storage.pos;
    } else {
        pathToStorage = PathFinder.search(baseLoc, {pos:room.controller.pos, range:2}, {
            plainCost: 2,
            swampCost: 10,
            roomCallback: function(roomName) {return costMatrix;}
        });
        storagePos = pathToStorage.path[pathToStorage.path.length - storagePathOffset];
    }
    
    
    //logger.log(JSON.stringify(pathToStorage))
    //pathToStorage
    helper.addRoadsToPath(this.buildPlan, pathToStorage.path);
    
    
    
    logger.log("============",storagePos, JSON.stringify(pathToStorage, JSON.stringify(baseLoc)))
    this.buildPlan.storage = _.clone(storagePos);
    //this.buildPlan.roads.push({x:storagePos.x, y:storagePos.y, roomName:storagePos.roomName})
    var pos = {x:storagePos.x+1,y:storagePos.y, roomName:storagePos.roomName};
    var pos2 = {x:storagePos.x+1,y:storagePos.y+1, roomName:storagePos.roomName};
    for(var i=0;i<4;i++) {
        
        //console.log(JSON.stringify(pos))
        this.buildPlan.roads.push(_.clone(pos));
        this.buildPlan.roads.push(_.clone(pos2));
        helper.rotate(storagePos, pos, 90);
        helper.rotate(storagePos, pos2, 90);
    }
        //console.log("---", JSON.stringify(this.buildPlan.storage))
    
    
    //add Storage link
    var pos = pathToStorage.path[pathToStorage.path.length - (storagePathOffset+2)];
    this.buildPlan.links.push({x:pos.x, y:pos.y, roomName:pos.roomName});
    
    //add Storage terminal
    var pos = pathToStorage.path[pathToStorage.path.length - (storagePathOffset+1)];
    this.buildPlan.terminal = {x:pos.x, y:pos.y, roomName:pos.roomName};    
    
    //add labs
    if (this.labsLocFlag) {
        var pathToLabs = this.getPathTo(storagePos, {pos:this.labsLocFlag.pos, range:0});
        var openSpot = pathToLabs.path[pathToLabs.path.length-2];
        console.log('-------------------')
        console.log(openSpot, JSON.stringify(pathToLabs))
        
        global.utils.drawPath(pathToLabs.path)
        var start = this.labsLocFlag.pos;
        
        for(var x = start.x-1;x<=start.x+1;x++) {
            for(var y = start.y-1;y<=start.y+1;y++) {
                //logger.log(x, y)
                if (!(x == start.x && y == start.y)) {
                    //logger.log('1')
                    if (!(x == openSpot.x && y == openSpot.y)) {
                        //logger.log("2")
                        this.buildPlan.labs.push({x:x, y:y, roomName:start.roomName})
                    }
                }
            }
        }
        this.buildPlan.labs.splice(10);
        helper.addRoadsToPath(this.buildPlan, pathToLabs.path);
        //this.buildPlan.labs.push(openSpot)
    }
    
    //add extractor, terminal and labs(eventually)
    var minerals = room.find(FIND_MINERALS);
    if (minerals.length) {
        for(var m in minerals) {
            var mineral = minerals[m]
            this.buildPlan.extractors.push({x:mineral.pos.x, y:mineral.pos.y, roomName:mineral.pos.roomName});
            this.addRoadsAndContainerToPosition(storagePos, mineral.pos);
        }
        
    }
     
    
    
    
    room.memory.buildPlan = this.buildPlan;
    logger.log(room.name, "num exts:", this.buildPlan.extensions.length)
}
obj.prototype.addRoadsAndContainerToPosition = function(startPos, pos, skipCont) {
    var pathToPos = this.getPathTo(startPos, {pos:pos, range:1});
    if (!pathToPos.incomplete) {
        logger.log(JSON.stringify(pathToPos))
        helper.addRoadsToPath(this.buildPlan, pathToPos.path);
        if (!skipCont && pathToPos.path.length > 1) {
            var contPos = pathToPos.path[pathToPos.path.length-1];
            this.buildPlan.containers.push({x:contPos.x, y:contPos.y, roomName:contPos.roomName});
        }
        return true;
    }
    return false;
}
obj.prototype.getPathTo = function(startPos, targets) {
    var _this = this;
    logger.log("here?", startPos, targets)
    var path = PathFinder.search(startPos, targets, {
        plainCost: 2,
        swampCost: 10,
        maxOps:10000,
        roomCallback: function(roomName) {return _this.planCostMatrix(roomName)}
    });
    return path;
}
obj.prototype.addRoadsToPath = function(path) {
    return helper.addRoadsToPath(this.buildPlan, path)
}

obj.prototype.clearExtensionsAlongPath = function(path) {
    for(var p in path) {
        var pos = path[p];
        logger.log("???",pos)
        _.remove(this.buildPlan.extensions, function(e) {return e.x == pos.x && e.y == pos.y && e.roomName == pos.roomName})
    }
}
obj.prototype.planCostMatrix = function(roomName) {
    let costs = new PathFinder.CostMatrix;
    
    //planned roads cost 1
    for(var i in this.buildPlan.roads) {
        var pos = this.buildPlan.roads;
        if (pos.roomName == roomName) {
            costs.set(pos.x, pos.y, 1);
        }
    }
    



    if (Game.rooms[roomName]) {
        Game.rooms[roomName].find(FIND_STRUCTURES).forEach(function(struct) {
          if (struct.structureType === STRUCTURE_ROAD) {
            // Favor roads over plain tiles
            costs.set(struct.pos.x, struct.pos.y, 1);
          } else if (struct.structureType !== STRUCTURE_CONTAINER &&
                     (struct.structureType !== STRUCTURE_RAMPART ||
                      !struct.my)) {
            // Can't walk through non-walkable buildings
            costs.set(struct.pos.x, struct.pos.y, 0xff);
          }
        });
    }
    
    //planned buildings are impassable
    var buildingListsToAvoid = [
        this.buildPlan.extensions,
        this.buildPlan.spawns,
        this.buildPlan.towers,
        this.buildPlan.links,
        [this.buildPlan.storage],
        [this.buildPlan.terminal],
        this.buildPlan.labs
    ];
    
    for(var i in buildingListsToAvoid) {
        var list = buildingListsToAvoid[i];
        for(var j in list) {
            var pos = list[j];
            
            if (pos.roomName == roomName) {
                //logger.log("here", pos)
                costs.set(pos.x, pos.y, 0xff);
            }
        }
    }
    // // Avoid creeps in the room
    // this.room.find(FIND_CREEPS).forEach(function(creep) {
    //   costs.set(creep.pos.x, creep.pos.y, 0xff);
    // });
    
    
    return costs;
}

obj.prototype.castPath = function(start, differential, skipSteps, minSteps) {
    if (!skipSteps) {
        skipSteps = 0;
    }
    var pos = _.clone(start);
    
    var path = [];
    var offset = {x:1,y:1};
    while(minSteps > 0 || skipSteps > 0 || helper.canPlace(this.buildPlan, pos) || (path.length < 2 && !(pos.x <= 1 || pos.x >= 48 || pos.y <= 1 || pos.y >= 48))) {
        if (!skipSteps)
            path.push(this.roomManager.room.getPositionAt(pos.x, pos.y));
        pos.x+=differential.x;
        pos.y+=differential.y;
        if (skipSteps)
            skipSteps--;
        if (minSteps)
            minSteps--;
    }
    return path;
}

obj.prototype.clipPathForExtentions = function(path, offStart) {
    path.splice(0, offStart);
    //if (path.length > 7) {
    //    path.splice(path.length-3);
    //}
}

module.exports = obj;