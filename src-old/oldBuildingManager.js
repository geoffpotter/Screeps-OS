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



var spawnsByLevel = [
    0,
    1,
    1,
    1,
    1,
    1,
    1,
    2,
    3
];

var extensionsByLevel = [
    0,
    0,
    5,
    10,
    20,
    30,
    40,
    50,
    60
];
var towersByLevel = [
    0,
    0,
    0,
    1,
    1,
    2,
    2,
    3,
    3
];
var linksByLevel = [
    0,
    0,
    0,
    0,
    0,
    2,
    3,
    4,
    6
];
var labsByLevel = [
    0,
    0,
    0,
    0,
    0,
    0,
    3,
    6,
    10
];
var buildingManager = function(room) {
    this.room = room;
    this.building = false;
    this.reservedLocs = [];
    
    this.resetPlan();
    
}

buildingManager.prototype.resetPlan = function() {
    this.spawns = [];
    this.extensions = [];
    this.containers = [];
    this.towers = [];
    this.links = [];
    this.roads = [];
    this.storage = false;
    this.terminal = false;
    this.extractor = false;
    this.labs = [];
    
    this.buildPlan = {
        spawns:[],
        extensions:[],
        containers:[],
        towers:[],
        links:[],
        roads:[],
        storage:false,
        terminal:false,
        extractor:false,
        labs:[]
    };
    //this.room.memory.buildPlan = this.buildPlan
}

buildingManager.prototype.indexBuildings = function() {
    //this.resetPlan();

    
    // for(var i in Game.spawns) {
    //     var s = Game.spawns[i];
    //     if (this.room.name == s.room.name) {
    //         this.spawns.push(s);
    //     }
    // }
    
    var buildings = this.room.find(FIND_MY_STRUCTURES);
    for(var i in buildings) {
        var b = buildings[i];
        switch (b.structureType) {
            case STRUCTURE_EXTENSION:
                    this.extensions.push(b);
                    //this.buildPlan.extensions.push(b.pos);
                break;
            case STRUCTURE_SPAWN:
                    this.spawns.push(b);
                    //this.buildPlan.spawns.push(b.pos);
                break;
            case STRUCTURE_TOWER:
                    this.towers.push(b);
                    //this.buildPlan.towers.push(b.pos);
                break;
            case STRUCTURE_CONTAINER:
                    this.containers.push(b);
                    //this.buildPlan.containers.push(b.pos);
                break;
            case STRUCTURE_LINK:
                    this.links.push(b);
                    //this.buildPlan.links.push(b.pos);
                break;
            case STRUCTURE_STORAGE:
                    this.storage = b;
                    //this.buildPlan.links.push(b.pos);
                break;
            case STRUCTURE_LAB:
                    this.labs.push(b);
                    //this.buildPlan.links.push(b.pos);
                break;
                
            case STRUCTURE_EXTRACTOR:
                    this.extractor = b;
                    //this.buildPlan.links.push(b.pos);
                break;
            case STRUCTURE_TERMINAL:
                    this.terminal = b;
                    //this.buildPlan.links.push(b.pos);
                break;
            case STRUCTURE_ROAD:
                    this.roads.push(b);
                    //this.buildPlan.roads.push(b.pos);
                break;
        }
    }
}

buildingManager.prototype.build = function() {       
    if (!this.room.controller) {
        return;
    }
    this.mapFlags();
    //this.indexBuildings();
    this.makeBuildPlan();
    
        this.displayBuildPlan();
    if (this.buildDisplayFlag) {
    }
    
    if (this.buildEnabledFlag && Game.time % 10 ==0) {
        this.executeBuildPlan();
    }
    
    this.building = false;
   
};

buildingManager.prototype.mapFlags = function() {
    this.buildLocFlag = false;
    this.buildDisplayFlag = false;
    this.buildEnabledFlag = false;
    for(var i in Game.flags) {
        var flag = Game.flags[i];
        if (flag.pos.roomName == this.room.name) {
            if (flag.color == COLOR_WHITE && flag.secondaryColor == COLOR_WHITE) {
                this.buildLocFlag = flag;
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

buildingManager.prototype.makeBuildPlan = function() {
    if (!this.room.controller.my)
        return;
    var baseLoc = false;//this.room.getPositionAt(45, 22);
    if (this.buildLocFlag) {
        baseLoc = this.buildLocFlag.pos;
    }
    logger.log(baseLoc,'----------------------------------------------')

    
    
    if (this.room.memory.buildPlan && this.room.memory.buildPlan.startLoc && (!baseLoc || (baseLoc.x == this.room.memory.buildPlan.startLoc.x && baseLoc.y == this.room.memory.buildPlan.startLoc.y))) {
        this.buildPlan = this.room.memory.buildPlan;
        logger.log('got it')
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
    var pathSpawnToController = PathFinder.search(baseLoc, {pos:this.room.controller.pos, range:3});
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
        p = this.castPath(baseLoc, dir);
        this.addRoadsToPath(p);
        this.clipPathForExtentions(p, 2);
        this.addExtentionsToPath(p);
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
        p = this.castPath(baseLoc, dir);
        this.addRoadsToPath(p);
        this.clipPathForExtentions(p, 1);
        this.addExtentionsToPath(p, true);
    }    
    
    var room = this.room;
    this.buildPlan.extensions = _.sortBy(this.buildPlan.extensions, function(struct) {
        return room.getPositionAt(struct.x, struct.y).getRangeTo(baseLoc);
    });

    this.buildPlan.extensions.splice(60);
    
    this.removePlannedRoadsNotNearExtensions();
    
    
    //add spawn in base
    this.buildPlan.spawns.push({x:baseLoc.x-1, y:baseLoc.y});
    //add spawnContainer
    this.buildPlan.containers.push({x:baseLoc.x, y:baseLoc.y})
    //add towers in base
    this.buildPlan.towers.push({x:baseLoc.x+1, y:baseLoc.y});
    this.buildPlan.towers.push({x:baseLoc.x, y:baseLoc.y-1});
    //add base link
    this.buildPlan.links.push({x:baseLoc.x, y:baseLoc.y+1});
    
    var sourcePaths = [];
    var sources = this.room.find(FIND_SOURCES);
    var costMatrix = this.planCostMatrix();
    for(var i in sources) {
        var s = sources[i];
        var _this = this;
        var p = PathFinder.search(baseLoc, {pos:s.pos, range:1}, {
            plainCost: 2,
            swampCost: 10,
            roomCallback: function(roomName) {return costMatrix;}
        });
        sourcePaths.push(p);
        //console.log(p.cost, p.ops, p.incomplete);
        //console.log(JSON.stringify(p));
    }
    
    //plan source containers
    for(var i in sourcePaths) {
        var p = sourcePaths[i];
        var loc = p.path[p.path.length-1];
        if (!p.incomplete) {
            this.addRoadsToPath(p.path);
            this.buildPlan.containers.push({x:loc.x, y:loc.y});
        }
    }
    //console.log(JSON.stringify(costMatrix), _.sum(costMatrix._bits))
    
    var costMatrix = this.planCostMatrix();
    
    //plan storage
    var pathToStorage = PathFinder.search(baseLoc, {pos:this.room.controller.pos, range:3}, {
        plainCost: 2,
        swampCost: 10,
        roomCallback: function(roomName) {return costMatrix;}
    });
    
    //console.log(JSON.stringify(pathToStorage))
    //pathToStorage
    this.addRoadsToPath(pathToStorage.path);
    
    
    var storagePos = pathToStorage.path[pathToStorage.path.length - 1];
    this.buildPlan.storage = {x:storagePos.x, y:storagePos.y};
    this.buildPlan.roads.push({x:storagePos.x, y:storagePos.y})
    var pos = {x:storagePos.x+1,y:storagePos.y};
    var pos2 = {x:storagePos.x+1,y:storagePos.y+1};
    for(var i=0;i<4;i++) {
        
        //console.log(JSON.stringify(pos))
        this.buildPlan.roads.push(_.clone(pos));
        this.buildPlan.roads.push(_.clone(pos2));
        this.rotate(storagePos, pos, 90);
        this.rotate(storagePos, pos2, 90);
    }
        //console.log("---", JSON.stringify(this.buildPlan.storage))
    
    
    //add Storage link
    
    var pos = pathToStorage.path[pathToStorage.path.length - 2];
    this.buildPlan.links.push({x:pos.x, y:pos.y});
    
    
    
    //add extractor, terminal and labs(eventually)
    var mineral = this.room.find(FIND_MINERALS);
    if (mineral) {
        mineral = mineral[0];
        this.buildPlan.extractor = {x:mineral.pos.x, y:mineral.pos.y};
        
    }
    var pathToExtractor = PathFinder.search(storagePos, {pos:mineral.pos, range:1}, {
        plainCost: 2,
        swampCost: 10,
        roomCallback: function(roomName) {return costMatrix;}
    });
    
    this.addRoadsToPath(pathToExtractor.path); 
    
    //extractor container
    var pos = pathToExtractor.path[pathToExtractor.path.length-1];
    this.buildPlan.containers.push({x:pos.x, y:pos.y});
    
    this.room.memory.buildPlan = this.buildPlan;
    logger.log("num exts:", this.buildPlan.extensions.length)
}

buildingManager.prototype.planCostMatrix = function(roomName) {
    let costs = new PathFinder.CostMatrix;
    
    //planned roads cost 1
    for(var i in this.buildPlan.roads) {
        var pos = this.buildPlan.roads;
        costs.set(pos.x, pos.y, 1);
    }
    
    // //planned buildings are impassable
    for(var i in this.buildPlan.extensions) {
        var pos = this.buildPlan.extensions[i];
        costs.set(pos.x, pos.y, 0xff);
    }
    for(var i in this.buildPlan.spawns) {
        var pos = this.buildPlan.spawns[i];
        costs.set(pos.x, pos.y, 0xff);
    }
    for(var i in this.buildPlan.towers) {
        var pos = this.buildPlan.towers[i];
        costs.set(pos.x, pos.y, 0xff);
    }
    for(var i in this.buildPlan.links) {
        var pos = this.buildPlan.links[i];
        costs.set(pos.x, pos.y, 0xff);
    }
    
    
    this.room.find(FIND_STRUCTURES).forEach(function(struct) {
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

    // // Avoid creeps in the room
    // this.room.find(FIND_CREEPS).forEach(function(creep) {
    //   costs.set(creep.pos.x, creep.pos.y, 0xff);
    // });

    return costs;
}

buildingManager.prototype.castPath = function(start, differential) {
    var pos = _.clone(start);
    
    var path = [];
    var offset = {x:1,y:1};
    pos.x+=differential.x*offset.x;
    pos.y+=differential.y*offset.y;
    while(this.canPlace(pos) || (path.length < 2 && !(pos.x <= 1 || pos.x >= 48 || pos.y <= 1 || pos.y >= 48))) {
        path.push(this.room.getPositionAt(pos.x, pos.y));
        pos.x+=differential.x;
        pos.y+=differential.y;
    }
    return path;
}

buildingManager.prototype.addRoadsToPath = function(path) {
    for(var i in path) {
        var pos = path[i];
        if (this.canPlace(pos)) {
            this.buildPlan.roads.push({x:pos.x, y:pos.y});
        }
    }
}

buildingManager.prototype.clipPathForExtentions = function(path, offStart) {
    path.splice(0, offStart);
    //if (path.length > 7) {
    //    path.splice(path.length-3);
    //}
}
buildingManager.prototype.addExtentionsToPath = function(path, assumeDiag) {
    var lastPos = _.clone(path[0]);
    if (!lastPos) {
        return false;
    }
    if (assumeDiag) {
        lastPos.x++;
        lastPos.y++;
    }
    for(var i in path) {
        var pos = path[i];
        var pos2 = _.clone(pos);
        var pos3 = _.clone(pos);
        pos2.x += 1;
        pos3.x += 2;
        // if (i%2==0) {
        //         pos2.y += 1
        //     }
        var onDiag = pos.y != lastPos.y && pos.x != lastPos.x;
        // if (i%5==0) {
        //     continue;
        // }
        
        

        
        for(var j=0;j < 4;j++) {
            
            this.rotate(pos, pos2, 90);
            this.rotate(pos, pos3, 90);
            
            if (onDiag) {
                if (this.canPlace(pos2)) {
                    this.buildPlan.extensions.push({x:pos2.x, y:pos2.y});
                }
                if (this.canPlace(pos3)) {
                    this.buildPlan.extensions.push({x:pos3.x, y:pos3.y});
                }
            } else {
                if ((i)%2==1) {
                    //add extention where this road is
                    
                }
                if (pos.x == lastPos.x) {
                    //we're vertical
                    if ((j)%2==0) {
                        continue;
                    }
                    
                    var flip = i % 2;
                    if (!flip && i > 0) {
                        _.remove(this.buildPlan.roads, {x:pos.x, y:pos.y});
                        this.buildPlan.roads.push({x:pos.x+1, y:pos.y})
                        this.buildPlan.roads.push({x:pos.x-1, y:pos.y})
                        if (this.canPlace(pos)) {
                            this.buildPlan.extensions.push({x:pos.x, y:pos.y});
                        }
                    }
                    
                    if (flip && this.canPlace(pos2)) {
                        this.buildPlan.extensions.push({x:pos2.x, y:pos2.y});
                    }
                    
                    if (this.canPlace(pos3)) {
                        this.buildPlan.extensions.push({x:pos3.x, y:pos3.y});
                    }
                } else {
                    //whoreazontal
                    if ((j+1)%2==0) {
                        continue;
                    }
                    var flip = ((i) % 2)==0;
                    if (!flip && i > 0) {
                        _.remove(this.buildPlan.roads, {x:pos.x, y:pos.y});
                        this.buildPlan.roads.push({x:pos.x, y:pos.y+1})
                        this.buildPlan.roads.push({x:pos.x, y:pos.y-1})
                        if (this.canPlace(pos)) {
                            this.buildPlan.extensions.push({x:pos.x, y:pos.y});
                        }
                    }
                    if (flip && this.canPlace(pos2)) {
                        this.buildPlan.extensions.push({x:pos2.x, y:pos2.y});
                    }
                    if (this.canPlace(pos3)) {
                        this.buildPlan.extensions.push({x:pos3.x, y:pos3.y});
                    }
                }
                
                
            }
            
                //console.log("here", pos.y, lastPos.y)
            
        }
        lastPos = _.clone(pos);
    }
}




buildingManager.prototype.removePlannedRoadsNotNearExtensions = function() {
    var roadsToRemove = [];
    for(var i in this.buildPlan.roads) {
        var road = this.buildPlan.roads[i];
        var pos = {x:road.x, y:road.y};
        var pos2 = {x:road.x+1, y:road.y};
        var hasExt = false;
        for(var j=0;j < 4;j++) {
            this.rotate(pos, pos2, 90);
            if (this.arrayContainsLoc(this.buildPlan.extensions, pos2)) {
                hasExt = true;
                break;
            }
        }
        if (!hasExt) {
            roadsToRemove.push(pos);
        }
    }
//    console.log('---', roadsToRemove);
    for (var i in roadsToRemove) {
        var loc = roadsToRemove[i];
        //console.log(loc.x, loc.y)
        _.remove(this.buildPlan.roads, function(r) {
            if (r.x == loc.x && r.y == loc.y) {
                return true;
            }
            return false;
        });
    }
}



buildingManager.prototype.displayBuildPlan = function() {
    //draw roads
    for(var i in this.buildPlan.roads) {
        var road = this.buildPlan.roads[i];
        this.drawText("*", road.x, road.y +.4);
    }
    
    //draw extensions
    for(var i in this.buildPlan.extensions) {
        var extension = this.buildPlan.extensions[i];
        this.drawText("o", extension.x, extension.y+ .2);
    }
    
    //draw spawns
    for(var i in this.buildPlan.spawns) {
        var s = this.buildPlan.spawns[i];
        this.drawText("s", s.x, s.y+ .2);
    }
    
    //draw containers
    for(var i in this.buildPlan.containers) {
        var c = this.buildPlan.containers[i];
        this.drawText("c", c.x, c.y+ .2);
    }
    
    //draw towers
    for(var i in this.buildPlan.towers) {
        var t = this.buildPlan.towers[i];
        this.drawText("t", t.x, t.y+ .2);
    }
    
    //draw links
    for(var i in this.buildPlan.links) {
        var l = this.buildPlan.links[i];
        this.drawText("l", l.x, l.y+ .2);
    }
    //draw labs
    for(var i in this.buildPlan.labs) {
        var l = this.buildPlan.labs[i];
        this.drawText("L", l.x, l.y+ .2);
    }
    //draw Terminal
    if (this.buildPlan.terminal) {
        this.drawText("t", this.buildPlan.terminal.x, this.buildPlan.terminal.y+ .2);
    }
    //draw extractor
    if (this.buildPlan.extractor) {
        this.drawText("e", this.buildPlan.extractor.x, this.buildPlan.extractor.y+ .2);
    }
    if (this.buildPlan.storage) {
        //console.log(JSON.stringify(this.buildPlan.storage))
        this.drawText("S", this.buildPlan.storage.x, this.buildPlan.storage.y+ .2);
    }
    
}





buildingManager.prototype.executeBuildPlan = function() {
    var roomLevel = this.room.controller.level;
    if (!this.buildPlan.startLoc) {
        logger.log(this.room.name, "bad build plan!");
        this.buildPlan = {};
        return;
    }
    var building = this.buildStructures(STRUCTURE_SPAWN, this.buildPlan.spawns, spawnsByLevel[roomLevel]);
    
    if (!building && !(building = this.buildStructures(STRUCTURE_EXTENSION, this.buildPlan.extensions, extensionsByLevel[roomLevel]))) {
        var containersToBuild = 0;
        if (roomLevel >= 6 ) {
            containerstoBuild = this.buildPlan.containers.length;
        } else if (roomLevel > 3) {
            containersToBuild = 3;
        }
        if (!(building = this.buildStructures(STRUCTURE_CONTAINER, this.buildPlan.containers, containersToBuild))) {
            if (!(building = this.buildStructures(STRUCTURE_TOWER, this.buildPlan.towers, towersByLevel[roomLevel]))) {
                if (!(building = this.buildStructures(STRUCTURE_STORAGE, [this.buildPlan.storage], roomLevel > 3 ? 1 : 0))) {
                    if (!(building = this.buildStructures(STRUCTURE_EXTRACTOR, [this.buildPlan.extractor], roomLevel > 5 ? 1 : 0))) {
                        if (!(building = this.buildStructures(STRUCTURE_LINK, this.buildPlan.links, linksByLevel[roomLevel]))) {
                            if (!(building = this.buildStructures(STRUCTURE_LAB, this.buildPlan.labs, labsByLevel[roomLevel]))) {
                                if (!(building = this.buildStructures(STRUCTURE_TERMINAL, this.buildPlan.terminal,  roomLevel > 5 ?  this.buildPlan.roads.length: 0))) {
                                    logger.log("nothing to build")
                                }
                            }
                        }
                        
                    }
                }
            }
        }
        if (this.room.controller.level > 3) {
            if (!(building = this.buildStructures(STRUCTURE_ROAD, this.buildPlan.roads, roomLevel > 3 ?  this.buildPlan.roads.length: 0))) {
            }
        }
    }
    
    this.room.memory.building = building;
}


buildingManager.prototype.buildStructures = function(type, locations, numNeeded) {
    var exts = this.room.find(FIND_STRUCTURES, {filter: (s) => {
        return s.structureType == type
        
    }});
    var constructions = this.room.find(FIND_CONSTRUCTION_SITES, {filter: (s) => {
        return s.structureType == type
        
    }}); 
    logger.log('----=',type,exts.length, constructions.length, numNeeded, this.room.memory.buildPlan.startLoc);
    
    if (exts.length >= numNeeded) {
        return false
    } else if (exts.length+constructions.length >= numNeeded) {
        return true;
    }
    
    var numToBuild = numNeeded - exts.length - constructions.length;
    
    
    var start = this.room.getPositionAt(this.room.memory.buildPlan.startLoc.x, this.room.memory.buildPlan.startLoc.y);
    var _room = this.room;
    var locsByDist = _.sortBy(locations, function(struct) {
        
        struct.dist = _room.getPositionAt(struct.x, struct.y).getRangeTo(start);
        return struct.dist;
    });
    
    var built = 0;
    logger.log(JSON.stringify(locsByDist))
    for(var i in locsByDist) {
        var loc = locsByDist[i];
        this.drawCross("", loc.x, loc.y)
        var res = false
        if (0 == (res = this.room.createConstructionSite(loc.x, loc.y, type))) {
            logger.log(res)
            built++;
        }
        
        if (built == numToBuild) {
            break;
        }
    }
    return true;
}



buildingManager.prototype.rotate = function(center, pos, angle) {
    var radians = (Math.PI / 180) * angle,
        cos = Math.cos(radians),
        sin = Math.sin(radians),
        x = pos.x,
        y = pos.y,
        cx = center.x,
        cy = center.y,
        nx = (cos * (x - cx)) + (sin * (y - cy)) + cx,
        ny = (cos * (y - cy)) - (sin * (x - cx)) + cy;
        
    pos.x = Math.floor(nx);
    pos.y = Math.ceil(ny);

    
    
    return pos;
}


buildingManager.prototype.arrayContainsLoc = function(array, pos, debug) {
    for(var i in array) {
        var apos = array[i];
        if (debug)
            logger.log(pos, apos);
        if (apos.x == pos.x && apos.y == pos.y)
            return true;
    }
    return false;
}
buildingManager.prototype.canPlace = function(posObj) {
    var pos = this.room.getPositionAt(posObj.x, posObj.y);
    if (!pos) {
        return false;
    }
    
    if (this.reservedLocs == undefined) {
        this.reservedLocs = [];
    }
    
    if (pos.x <= 1 || pos.x >= 48 || pos.y <= 1 || pos.y >= 48) {
        return false;
    }
    
    if (this.reservedLocs[pos]) {
        return false;
    }
    if (
        this.arrayContainsLoc(this.buildPlan.extensions, pos)
        || this.arrayContainsLoc(this.buildPlan.spawns, pos)
        || this.arrayContainsLoc(this.buildPlan.containers, pos)
        || this.arrayContainsLoc(this.buildPlan.towers, pos)
        || this.arrayContainsLoc(this.buildPlan.roads, pos)
        ) {
        return false;
    }
    
    //logger.log(pos);
    var objects = pos.look();
    //logger.log(objects);
    var okToBuild = false;
    for(var o in objects) {
        var obj = objects[o];

        if (obj.type == "structure" && obj.structure.structureType == "spawn") {
            return false;
        }
        if (obj.type == "structure" && obj.structure.structureType == "constructedWall") {
            return false;
        }
        if (obj.type == "structure" && obj.structure.structureType == "storage") {
            return false;
        }
    }
    
    var type = this.room.lookForAt("terrain", pos);
    if (type == "wall")
        return false;
    
    return true;//okToBuild;
}

buildingManager.prototype.drawText = function(t, x, y) {
    this.room.visual.text(t,x-0.0, y);
}
buildingManager.prototype.drawCross = function(t, x, y, style) {
    this.room.visual.text(t,x-0.0, y)
    this.room.visual.line(x-0.5, y, x+0.5, y, style);
    this.room.visual.line(x, y-0.5, x, y+0.5, style);
};
module.exports = buildingManager;