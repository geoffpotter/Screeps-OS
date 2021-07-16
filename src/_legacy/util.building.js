/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('util.building');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("util.building");


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

module.exports = {
    addRoadsToPath: function(buildPlan, path) {
        
        //logger.log(JSON.stringify(path))
        for(var i in path) {
            var pos = path[i];
            if (this.canPlace(buildPlan, pos)) {
                buildPlan.roads.push({x:pos.x, y:pos.y, roomName:pos.roomName});
                //global.utils.drawCross("", pos)
            } else {
                //logger.log("---------",this.canPlace(buildPlan, pos))
                //global.utils.drawCross("x", pos)
            }
        }
    },
    canPlace: function(buildPlan, posObj) {
        //logger.log(posObj)
        var pos = new RoomPosition(posObj.x, posObj.y, posObj.roomName);
        var room = Game.rooms[pos.roomName];
        if (!pos || !room) {
            return false;
        }
        
        if (pos.x <= 0 || pos.x >= 49 || pos.y <= 0 || pos.y >= 49) {
            return false;
        }
        
        if (
            buildPlan && (
                global.utils.arrayContainsLoc(buildPlan.extensions, pos)
                || global.utils.arrayContainsLoc(buildPlan.spawns, pos)
                //|| global.utils.arrayContainsLoc(buildPlan.containers, pos)
                || global.utils.arrayContainsLoc(buildPlan.towers, pos)
                || global.utils.arrayContainsLoc(buildPlan.roads, pos)
            )
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
        
        var type = room.lookForAt("terrain", pos);
        if (type == "wall")
            return false;
        
        return true;//okToBuild;
    },
    
    addExtentionsToPath: function(buildPlan, path, assumeDiag) {
        //logger.log(JSON.stringify(path))
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
            //logger.log(pos)
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
                    if (this.canPlace(this.buildPlan, pos2)) {
                        buildPlan.extensions.push({x:pos2.x, y:pos2.y, roomName:pos2.roomName});
                    }
                    if (this.canPlace(this.buildPlan, pos3) && i > 0) {
                        buildPlan.extensions.push({x:pos3.x, y:pos3.y, roomName:pos3.roomName});
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
                            _.remove(buildPlan.roads, {x:pos.x, y:pos.y, roomName:pos.roomName});
                            var r1 = {x:pos.x+1, y:pos.y, roomName:pos.roomName};
                            if (this.canPlace(buildPlan, r1)) {
                                buildPlan.roads.push(r1);
                            }
                            
                            var r2 = {x:pos.x-1, y:pos.y, roomName:pos.roomName};
                            if (this.canPlace(buildPlan, r2)) {
                                buildPlan.roads.push(r2);
                            }
                            if (this.canPlace(buildPlan, pos)) {
                                buildPlan.extensions.push({x:pos.x, y:pos.y, roomName:pos.roomName});
                            }
                        }
                        //if (i>0) {
                            if (flip && this.canPlace(buildPlan, pos2)) {
                                buildPlan.extensions.push({x:pos2.x, y:pos2.y, roomName:pos2.roomName});
                            }
                            
                            if (this.canPlace(buildPlan, pos3)) {
                                buildPlan.extensions.push({x:pos3.x, y:pos3.y, roomName:pos3.roomName});
                            }
                        //}
                    } else {
                        //whoreazontal
                        if ((j+1)%2==0) {
                            continue;
                        }
                        var flip = ((i) % 2)==0;
                        if (!flip && i > 0) {
                            _.remove(buildPlan.roads, {x:pos.x, y:pos.y, roomName:pos.roomName});
                            var r1 = {x:pos.x, y:pos.y+1, roomName:pos.roomName};
                            if (this.canPlace(buildPlan, r1)) {
                                buildPlan.roads.push(r1);
                            }
                            
                            var r2 = {x:pos.x, y:pos.y-1, roomName:pos.roomName};
                            if (this.canPlace(buildPlan, r2)) {
                                buildPlan.roads.push(r2);
                            }
                            if (this.canPlace(buildPlan, pos)) {
                                buildPlan.extensions.push({x:pos.x, y:pos.y, roomName:pos.roomName});
                            }
                        }
                        if (flip && this.canPlace(buildPlan, pos2)) {
                            buildPlan.extensions.push({x:pos2.x, y:pos2.y, roomName:pos2.roomName});
                        }
                        if (this.canPlace(buildPlan, pos3)) {
                            buildPlan.extensions.push({x:pos3.x, y:pos3.y, roomName:pos3.roomName});
                        }
                    }
                    
                    
                }
                
                    //console.log("here", pos.y, lastPos.y)
                
            }
            lastPos = _.clone(pos);
        }
    },
    
    removePlannedRoadsNotNearExtensions: function(buildPlan) {
        var roadsToRemove = [];
        for(var i in buildPlan.roads) {
            var road = buildPlan.roads[i];
            var pos = {x:road.x, y:road.y};
            var pos2 = {x:road.x+1, y:road.y};
            var hasExt = false;
            var closeExts = new RoomPosition(road.x, road.y, road.roomName).findInRange(buildPlan.extensions, 1);
            
            if (closeExts.length == 0) {
                roadsToRemove.push(pos);
            }
        }
    //    console.log('---', roadsToRemove);
        for (var i in roadsToRemove) {
            var loc = roadsToRemove[i];
            //console.log(loc.x, loc.y)
            _.remove(buildPlan.roads, function(r) {
                if (r.x == loc.x && r.y == loc.y) {
                    return true;
                }
                return false;
            });
        }
    },
    
    
    displayBuildPlan: function(buildPlan) {

            //logger.log(JSON.stringify(buildPlan.roads));
        //draw roads
        for(var i in buildPlan.roads) {
            var road = buildPlan.roads[i];
            var pos = new RoomPosition(road.x, road.y +.4, road.roomName)
            global.utils.drawText("*", pos);
        }
        
        //draw extensions
        for(var i in buildPlan.extensions) {
            var extension = buildPlan.extensions[i];
            var pos = new RoomPosition(extension.x, extension.y+ .2, extension.roomName)
            global.utils.drawText("o", pos);
        }
        
        //draw spawns
        for(var i in buildPlan.spawns) {
            var s = buildPlan.spawns[i];
            var pos = new RoomPosition(s.x, s.y+ .2, s.roomName)
            global.utils.drawText("s", pos);
        }
        
        //draw containers
        for(var i in buildPlan.containers) {
            var c = buildPlan.containers[i];
            var pos = new RoomPosition(c.x, c.y+ .2, c.roomName)
            global.utils.drawText("c", pos);
        }
        
        //draw towers
        for(var i in buildPlan.towers) {
            var t = buildPlan.towers[i];
            var pos = new RoomPosition(t.x, t.y+ .2, t.roomName)
            global.utils.drawText("t", pos);
        }
        
        //draw links
        for(var i in buildPlan.links) {
            var l = buildPlan.links[i];
            var pos = new RoomPosition(l.x, l.y+ .2, l.roomName)
            global.utils.drawText("l", pos);
        }
        //draw labs
        for(var i in buildPlan.labs) {
            var l = buildPlan.labs[i];
            var pos = new RoomPosition(l.x, l.y+ .2, l.roomName)
            global.utils.drawText("L", pos);
        }
        //draw extractors
        for(var i in buildPlan.extractors) {
            var l = buildPlan.extractors[i];
            var pos = new RoomPosition(l.x, l.y+ .2, l.roomName)
            global.utils.drawText("E", pos);
        }
        
        //draw Terminal
        if (buildPlan.terminal) {
            var pos = new RoomPosition(buildPlan.terminal.x, buildPlan.terminal.y+ .2, buildPlan.terminal.roomName)
            global.utils.drawText("t", pos);
        }

        if (buildPlan.storage) {
            //console.log(JSON.stringify(this.buildPlan.storage))
            var pos = new RoomPosition(buildPlan.storage.x, buildPlan.storage.y+ .2, buildPlan.storage.roomName)
            global.utils.drawText("S", pos);
        }
        
    },

    executeBuildPlan: function(buildPlan, roomLevel) {
        if (!buildPlan.startLoc) {
            logger.log("bad build plan!");
            return;
        } else {
            logger.log(buildPlan.startLoc.roomName, "starting build out", extensionsByLevel[roomLevel],buildPlan.extensions.length)
        }
        var building = this.buildStructures(buildPlan, STRUCTURE_SPAWN, buildPlan.spawns, spawnsByLevel[roomLevel]);
        //logger.log(extensionsByLevel[roomLevel],buildPlan.extensions.length)
        if (!building && !(building = this.buildStructures(buildPlan, STRUCTURE_EXTENSION, buildPlan.extensions, extensionsByLevel[roomLevel]))) {
            var containersToBuild = buildPlan.containers.length;
            // if (roomLevel >= 6 ) {
            //     containerstoBuild = buildPlan.containers.length;
            // } else if (roomLevel > 3) {
            //     containersToBuild = 3;
            // }
            
            if (!(building = this.buildStructures(buildPlan, STRUCTURE_CONTAINER, buildPlan.containers, containersToBuild))) {
                if (!(building = this.buildStructures(buildPlan, STRUCTURE_TOWER, buildPlan.towers, towersByLevel[roomLevel]))) {
                    if (!(building = this.buildStructures(buildPlan, STRUCTURE_STORAGE, [buildPlan.storage], roomLevel > 3 ? 1 : 0))) {
                        if (!(building = this.buildStructures(buildPlan, STRUCTURE_EXTRACTOR, buildPlan.extractors, roomLevel > 5 ? 1 : 0))) {
                            if (!(building = this.buildStructures(buildPlan, STRUCTURE_LINK, buildPlan.links, linksByLevel[roomLevel]))) {
                                if (!(building = this.buildStructures(buildPlan, STRUCTURE_LAB, buildPlan.labs, labsByLevel[roomLevel]))) {
                                    if (!(building = this.buildStructures(buildPlan, STRUCTURE_TERMINAL, [buildPlan.terminal],  roomLevel > 5 ?  1: 0))) {
                                        logger.log(buildPlan.startLoc.roomName, "nothing to build")
                                    }
                                }
                            }
                            
                        }
                    }
                }
            }
            if (roomLevel >= 3) {
                if (!(building = this.buildStructures(buildPlan, STRUCTURE_ROAD, buildPlan.roads, roomLevel > 3 ?  buildPlan.roads.length: 0))) {
                }
            }
        }
        
    },
    
    buildStructures: function(buildPlan, type, locations, numNeeded) {

        var numToBuild = numNeeded;
        
        var start = new RoomPosition(buildPlan.startLoc.x, buildPlan.startLoc.y, buildPlan.startLoc.roomName);

        var built = 0;
        
        if (type == STRUCTURE_ROAD) { //don't let roads take up all the sites, yo
            var constSites = Game.constructionSites;
            var ourSites = _.filter(constSites, function(s) {
                logger.log(buildPlan.startLoc.roomName, s.room.name)
                return s.structureType == type && buildPlan.startLoc.roomName == s.room.name
            });
            if (_.size(ourSites) > 1) {
                return true;
            }
        }
        
        for(var i in locations) {
            var loc = locations[i];
            global.utils.drawCross("", loc.x, loc.y)
            var room = Game.rooms[loc.roomName];
            if (room) {
                var there = room.lookForAt(type, loc);
                //type == STRUCTURE_EXTENSION && logger.log("--",type, numNeeded, there)
                if (there.length > 0) {
                    continue;
                }
                var res = false;
                if (0 == (res = room.createConstructionSite(loc.x, loc.y, type))) {
                    //logger.log(type, locations.length, res)
                    built++;
                } else if(res != 0) {
                    //if (res != -8 && res != -7)
                    //    type == STRUCTURE_EXTENSION && logger.log(loc, "error building ", type, res)
                }
            } else {
                //logger.log(loc.roomName, "not available to build in")
            }
            
            if (built == numToBuild) {
                break;
            }
        }
        return built > 0;
    },
    
    rotate: function(center, pos, angle) {
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


};