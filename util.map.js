/*

 */

var logger = require("screeps.logger");

logger = new logger("util.map");

//logger.enabled = false;


/**
 * a path containing both start and end poisitions
 * @param {[RoomPosition]} path 
 */
function calcPathCost(path) {
    let cost = 0;

    let terrains = {};
    getTerrainAt = (pos) => {
        let roomName = pos.roomName;
        if (!terrains[roomName]) {
            terrains[roomName] = new Room.Terrain(pos.roomName);
        }
            
        return terrains[roomName].get(pos.x, pos.y);
    };

    for(let p in path) {
        // if (p == 0) {
        //     continue;
        // }
        let pos = path[p];
        //logger.log(pos, path)
        let terrain = getTerrainAt(pos);
        if (terrain == TERRAIN_MASK_SWAMP) {
            cost += 5;
        } else {
            cost += 1;
        }
    }
    if (Number.isInteger(Number.parseInt(cost))) {
        return cost;
    } else {
        return false;
    }
    
}



class CachedPath {
    /**
     * 
     * @param {RoomPosition} orgin 
     * @param {RoomPosition} goal 
     * @param {Object} opts 
     */
    constructor(orgin, goal, opts={}) {
        
        this.path = false;
        this.orgin = orgin;
        this.goal = goal;
        this.opts = opts;

        // //validate orgin
        // if (!this.orgin || !(this.orgin.x >= 0) || !(this.orgin.y >= 0) || !this.orgin.roomName) {
        //     logger.log(JSON.stringify(this.orgin), JSON.stringify(this.goal))
        //     throw new Error("Orgin invalid! " + JSON.stringify(this.orgin))
        // }
        // //validate goal
        // if (!this.goal || !(this.goal.x >= 0) || !(this.goal.y >= 0) || !this.goal.roomName) {
        //     logger.log(JSON.stringify(this.orgin), JSON.stringify(this.goal))
        //     throw new Error("Goal invalid! " + JSON.stringify(this.goal))
        // }

        //ensure room positions
        if (!(this.orgin instanceof RoomPosition)) {
            this.orgin = new RoomPosition(this.orgin.x, this.orgin.y, this.orgin.roomName);
        }
        if (!(this.goal instanceof RoomPosition)) {
            this.goal = new RoomPosition(this.goal.x, this.goal.y, this.goal.roomName);
        }

        //make sure both orgin and goal are walkable
        // if (!this.orgin.isClearSpace()) {
        //     throw new Error("Orgin must be walkable! " + JSON.stringify(this.orgin))
        // }
        // if (!this.goal.isClearSpace()) {
        //     throw new Error("Goal must be walkable! " + JSON.stringify(this.goal))
        // }


        /*
        control vars
        */
       this.pathCost = false;
       this._cachedPath = 0;
       this._cachedDist = 0;
    }

    get id() {
        return this.orgin.toWorldPosition().serialize() + "-" + this.goal.toWorldPosition().serialize();
    }

    get cost() {
        
        if (this.pathCost && this.pathCost != "false") {
            return this.pathCost;
        } else if (this._cachedPath) {
            return this._cachedPath.length;  //pretty sure this won't happen, but meh 
        } else if (this._cachedDist) {
            return this._cachedDist;
        } else {
            this._cachedDist = this.orgin.toWorldPosition().getRangeTo(this.goal);
            return this._cachedDist;
        }
    }

    /**
     * given either origin or goal, return the other
     * @param {RoomPosition} pos 
     */
    getOtherPos(pos) {
        if (this.orgin.isEqualTo(pos)) {
            return this.orgin;
        } else if (this.goal.isEqualTo(pos)) {
            return this.goal;
        } else {
            return false;
        }
    }

    /**
     * splits the cached path at a position along the path, returns two populated cachedPaths in an array?
     * @param {RoomPosition} splitPos 
     */
    splitAtPos(splitPos) {
        
        let firstPath = [];
        let secondPath = [];

        let splitFound = false;
        let path = this.getPath();
        //logger.log("splitting path at pos", splitPos, JSON.stringify(path))
        for(let p in path) {
            let pos = path[p];
            
            if (pos.isEqualTo(splitPos)) {
                splitFound = true;
                firstPath.push(splitPos);
            }

            if (!splitFound) {
                firstPath.push(pos);
            } else {
                secondPath.push(pos);
            }

        }

        if (!splitFound) {
            //return [false, false];
            throw new Error("split position not found!");
        }

        let firstCP = new CachedPath(firstPath[0], firstPath[firstPath.length-1], this.opts);
        let secondCP = new CachedPath(secondPath[0], secondPath[secondPath.length-1], this.opts);

        firstCP.path = firstPath;
        firstCP.pathCost = calcPathCost(firstPath);
        
        secondCP.path = secondPath;
        secondCP.pathCost = calcPathCost(secondPath);

        let ret = [firstCP, secondCP];
        //logger.log("path split:", firstCP.path, secondCP.path);
        return ret;
    }

    getPath() {
        //if we have a cached path, but no path, load it
        if (!this.path && this._cachedPath) {
            this.path = global.utils.map.dirStrToPath(this.orgin, this._cachedPath);
        }
        if (this.path) {
            return this.path;
        }
        //logger.log(JSON.stringify(this.orgin), JSON.stringify(this.goal))
        let range = 0;
        if (!this.goal.isClearSpace()) {
            range = 1;
        }
        let opts = _.clone(this.opts);
        opts.plainCost = 2;
        opts.swampCost = 10;
        opts.roomCallback = (roomName) => {
            if (roomName != this.orgin.roomName && roomName != this.goal.roomName) {
                return false;
            }
            let cm = global.utils.cm.getCM(roomName, "pStar");
            return cm;
        }
        let path = PathFinder.search(this.orgin, {pos:this.goal, range: range}, opts);
        if (path.incomplete) {
            return [];
        }
        this.pathCost = calcPathCost(path.path);
        this.path = [this.orgin].concat(path.path);
        return this.path;
    }

    display() {
        logger.log("displaying path", JSON.stringify(this.path));
        
        let color = "#" + global.utils.visual.rgbColor(0,255,0);
        
        if (!this.path || this.path.length == 0) {
            color = "#" + global.utils.visual.rgbColor(255,0,0);
            //draw a line to all goals
            new RoomVisual(this.orgin.roomName).line(this.orgin, this.goal, {color: color, lineStyle: "dashed"});
            
        } else {
            
            global.utils.visual.drawPath(this.path, color);
        }
        global.utils.visual.circle(this.orgin, color);
        global.utils.visual.circle(this.goal, color);
    }

    benchMark() {
        //benchmark serialization
        let start;
        
        //serialize
        start = Game.cpu.getUsed();
        let serialized = this.serialize();
        let cpuSerialized = Game.cpu.getUsed() - start;

        //deserialize
        start = Game.cpu.getUsed();
        let obj = CachedPath.deserialize(serialized);
        let cpuDeserialized = Game.cpu.getUsed() - start;

        //json
        start = Game.cpu.getUsed();
        let json = JSON.stringify(this);
        let cpuJson = Game.cpu.getUsed() - start;

        //unJson
        start = Game.cpu.getUsed();
        let obj2 = JSON.parse(json);
        let cpuUnjson = Game.cpu.getUsed() - start;

        logger.log("serialize:", serialized.length, cpuSerialized, cpuDeserialized);
        logger.log("json", json.length, cpuJson, cpuUnjson);


    }
    /**
     * 
     * @param {Creep} creep 
     * @param {global.utils.pStar.Node} destNode
     * 
     * @returns {boolean} true if we've reached the destination, false if we're still moving.
     */
    moveOnPath(creep, destNode, goal) {
        let start = Game.cpu.getUsed();
        let log = (...args) => {
            let usedNow = Game.cpu.getUsed();
            let used = usedNow - start;
            logger.log("cpu used:", used, ...args);
            start = usedNow;
        }


        let destTolarance = 2;

        //creep.memory._cachedPath = false;
        let pathInfo = creep.memory._cachedPath || {
            stuck: 0,
            s: false,//starting position, if this is set, moveTo this pos until closeToPath
            lp: creep.pos,
            lpp: creep.pos,
            idx: 0, //last index in path we thought we were at
            done: false,
            onPath: false,
            closeToPath: false,
            dest:destNode.id
        }

        if (pathInfo.dest != destNode.id) {
            //destination changed!
            logger.log(creep.name, "destination changed, clear pathinfo");
            creep.memory._cachedPath = pathInfo = {
                stuck: 0,
                s: false,
                lp: creep.pos,
                lpp: creep.pos,
                idx: 0,
                done: false,
                onPath: false,
                closeToPath: false,
                dest:destNode.id
            };
        }
        
        //calculate stuck
        if (creep.pos.isEqualTo(pathInfo.lp)) { //creep hasn't moved, increment stuck
            pathInfo.stuck++;
        } else {
            //creep moved, clear stuck
            pathInfo.stuck = 0;
        }
        //store last creep position
        pathInfo.lp = creep.pos;

        if (creep.pos.inRangeTo(destNode.pos, destTolarance)) { //creep is already there, do nothing;
            pathInfo.done = true;
            creep.memory._cachedPath = pathInfo;
            logger.log(creep.name, "already at destination.  be smarter.")
            return pathInfo;
        }
        //log('init done')
        //if we have a start pos(.s) set, then just move there and return;
        if (pathInfo.s) {
            destTolarance = 1; //if we're going to the start position, go all the way there
            let pos = new RoomPosition(pathInfo.s.x, pathInfo.s.y, pathInfo.s.roomName);
            if (creep.pos.inRangeTo(pos, destTolarance)) {
                pathInfo.s = false; // continue on path, should be in range now
                //log("at start pos")
            } else {
                let ret = creep.moveTo(pos, {range: destTolarance, visualizePathStyle:{stroke:"#f0f"}})
                //logger.log(creep.name, "moving to path", pos, ret);
                if (ret == ERR_NO_PATH) {
                    pathInfo.done = true;
                }
                creep.memory._cachedPath = pathInfo;
                //log('moved to start pos')
                return pathInfo;
            }
            
        }
        
        //logger.log(creep.name, "moving to", destNode.id, pathInfo.idx);
        
        let path = _.clone(this.getPath());
        //if the destination if our orgin, follow the path backwards.
        //logger.log(destNode.id, this.orgin, this.goal);
        if (destNode.pos.isEqualTo(this.orgin)) {
            //logger.log("reversing path", destNode.pos, this.orgin, this.goal)
           path = path.reverse();
        }
        let closestPos = path[0];
        let closestDist = 10000;
        let creepWpos = creep.pos.toWorldPosition();
        //for(let i in path) {
        //log("starting loop")
        let startI = Math.min(path.length, pathInfo.onPath ? pathInfo.idx + 1 : pathInfo.idx);
        for(let i = startI;i < path.length;i++) {
            //log('loop open', i)
            let pos = path[i];
            let i2 = 1 + Number.parseInt(i);
            //log('calcd i2')
            let posDist = creepWpos.getRangeTo(pos);
            //log("calced dist")
            if (i2 >= path.length) { //out of positions, move towards closest one
                //before we break, check if the last pos is the closest, this will matter on short interroom paths
                if (posDist < closestDist) {
                    closestPos = pos;
                    closestDist = posDist;
                }
                break;
            }
            let nextPos = path[i2];//i is a string, cuz js

            
            //keep track of closest pos
            if (posDist < closestDist) {
                closestPos = pos;
                closestDist = posDist;
            }
            //log("got next pos", pos)
            //if we're in range to the node, and this node is closer than the next, consider ourseleves here on the path.
            //logger.log(creepWpos.inRangeTo(pos, 1), creepWpos.getRangeTo(pos), creepWpos.getRangeTo(nextPos))
            //logger.log(creep, pos, nextPos);
            let onPath = creep.pos.isEqualTo(pos);//exactly this creeps pos
            //log('check on path', onPath)
            let closeToPath = onPath || (posDist <= destTolarance //creep is in range
                                  && posDist < creepWpos.getRangeTo(nextPos)); //next node isn't closer
            
            // if (creep.name == "scout0") {
                //logger.log(creep.pos, pos, nextPos)
                //logger.log(creepWpos.inRangeTo(pos, 1), creepWpos.getRangeTo(pos), creepWpos.getRangeTo(nextPos))
                //logger.log(onPath, closeToPath)
            // }
            //log("checked close to path", closeToPath)
            pathInfo.onPath = false;
            pathInfo.closeToPath = false;
            if (onPath || closeToPath) { //we are on the path, and have our current and next path pos.  handle shit, then move.
                //log("found creep pos")
                pathInfo.onPath = onPath;
                pathInfo.closeToPath = closeToPath;
                
                

                //store our path index
                pathInfo.idx = i;
                global.utils.visual.circle(pos, "#666");
                global.utils.visual.circle(nextPos, "#999");
                let startPosToUse = pos; //use the matching pos from the path to get the direction, IE: follow the path dir, don't move to next path pos.
                if (pathInfo.stuck > 2) {
                    startPosToUse = creep.pos; //use the creeps pos if we're stuck, ie: move onto the path
                }
                //store the pos we're moving to.
                pathInfo.lpp = nextPos;

                //we're done if the point we're moving too is our destination.
                //logger.log("done?", destNode, destNode.pos, creep.pos)
                pathInfo.done = creep.pos.inRangeTo(destNode.pos, 1) || (goal && creep.pos.inRangeTo(goal.pos, goal.range));
                //log("pos init done")
                let moveDir = startPosToUse.getDirectionTo(nextPos);
                //log('got move dir')
                //before checking for blocking, change nextPos to the actual nextPos we would move too. 
                //If the creep is off path, this will make sure we check the spot he's actually moving too, not the next spot in the path
                let posToCheck = creepWpos.moveInDir(moveDir).toRoomPosition();
                //startPosToUse = creep.pos;//I think this is important..?
                //log('got pos to check')
                //logger.log(i, i2, path[i2])
                //logger.log(i,"creep at pos", creep.pos, "considered at", startPosToUse, "moving to", nextPos, startPosToUse.getDirectionTo(nextPos), pos.getDirectionTo(nextPos));
                let blockingObject = posToCheck.isBlocked();
                if (blockingObject) {
                    //logger.log(creep.name, "path blocked, trying to sidestep", moveDir, moveDir-3, ((moveDir - 3)%8));
                    // let try1 = ((moveDir - 3)%8)+1;
                    // let try2 = ((moveDir + 1)%8)+1;
                    let try1 = moveDir + 1;
                    let try2 = moveDir - 1;
                    if (try1 >= 9) {
                        try1 -= 8;
                    }
                    if (try2 <= 0) {
                        try2 += 8;
                    }

                    //logger.log(creep.name, moveDir, try1, try2, (moveDir-2)%8)
                    //turn nextPos into two new POSs in try1 and try2 directions
                    //go from original startPos that was selected to original moveDir, then to try dir
                    let try1Pos = creepWpos.moveInDir(try1).toRoomPosition();
                    let try2Pos = creepWpos.moveInDir(try2).toRoomPosition();
                    //logger.log(creep.name, moveDir, try1, try2);

                    //order trys by range to nextPos
                    let tries = [try1Pos, try2Pos];
                    tries = _.sortBy(tries, (t) => {
                        //logger.log("try", t, nextPos, t.toWorldPosition().getRangeTo(nextPos))
                        return t.toWorldPosition().getRangeTo(nextPos)
                    });
                    let oldTry2Pos = try2Pos;
                    [try1Pos, try2Pos] = tries;
                    if (try1Pos.isEqualTo(oldTry2Pos)) {
                        //they flipped, change the dirs too
                        let f = try2;
                        try2 = try1;
                        try1 = f;
                    }

                    let try1BlockingObj = try1Pos.isBlocked() || try1Pos.getRangeTo(nextPos) > destTolarance;
                    let try2BlockingObj = try2Pos.isBlocked() || try2Pos.getRangeTo(nextPos) > destTolarance;
                    global.utils.visual.circle(try1Pos, try1BlockingObj ? "red" : "green");
                    global.utils.visual.circle(try2Pos, try2BlockingObj ? "red" : "yellow");
                    //log('checking extra positions')
                    //return pathInfo;
                    if (!try1BlockingObj) {
                        nextPos = try1Pos;
                    } else if (!try2BlockingObj) {
                        nextPos = try2Pos;
                    } else {
                        //logger.log(creep.name, "no easy walkable paths, if creeps are blocking, swap places with one");
                        
                        if (blockingObject.type == "creep") {
                            creep.say("move!")
                            //orig path blocked by creep, swap creeps
                            let otherCreep = blockingObject.creep;
                            otherCreep.say("I'm moving!")
                            otherCreep.move(otherCreep.pos.getDirectionTo(creep.pos));//move other creep to our pos and set their location to nextPos
                            nextPos = otherCreep.pos;
                            logger.log(creep.name, "blocked, switching with", otherCreep.name);
                        } else if (try1BlockingObj.type == "creep") {
                            //orig path blocked by creep, swap creeps
                            let otherCreep = try1BlockingObj.creep;
                            otherCreep.say("I'm moving!")
                            otherCreep.move(otherCreep.pos.getDirectionTo(creep.pos));//move other creep to our pos and set their location to nextPos
                            nextPos = otherCreep.pos;
                            logger.log(creep.name, "blocked, switching with", otherCreep.name);
                        } else if (try2BlockingObj.type == "creep") {
                            //orig path blocked by creep, swap creeps
                            let otherCreep = try2BlockingObj.creep;
                            otherCreep.say("I'm moving!")
                            otherCreep.move(otherCreep.pos.getDirectionTo(creep.pos));//move other creep to our pos and set their location to nextPos
                            nextPos = otherCreep.pos;
                            logger.log(creep.name, "blocked, switching with", otherCreep.name);
                        }
                        //log("checked for blocking creeps")
                    }
                    
                    //logger.log(creep.name, "moving on path", creep.pos, "->", nextPos, creep.pos.getDirectionTo(nextPos))
                    //return pathInfo;
                    moveDir = creep.pos.getDirectionTo(nextPos);
                }
                //log('obsticle avoided, moving creep')
                let ret = creep.move(moveDir);
                //logger.log(creep.name, "following path", ret, moveDir)
                break;
            }
            
        }
        //log('finalizing')
        //logger.log("creep moved", JSON.stringify(pathInfo))
        if (!pathInfo.onPath && !pathInfo.closeToPath || pathInfo.stuck > 3){
            //pathInfo.done = true;
            pathInfo.s = closestPos;
            creep.say('off path!');
            //pathInfo.idx = 0;
            logger.log(creep.name, "not on path!", closestPos, JSON.stringify(pathInfo));
            logger.log(closestPos)
        }
        creep.memory._cachedPath = pathInfo;
        //log('done')
        return pathInfo;
        
    }

    serialize() {
        
        if (this.path) {
            this._cachedPath = global.utils.map.pathToDirStr(this.path);
        }
        //logger.log(this.orgin, JSON.stringify(global.utils.map.dirStrToPath(this.orgin, this._cachedPath)));
        //logger.log("stringifyin path:", this._cachedPath)
        let arr = [
            this.orgin.toWorldPosition().serialize(),
            this.goal.toWorldPosition().serialize(),
            JSON.stringify(this.opts),
            this._cachedPath,
            this.pathCost,
            this._cachedDist
        ]
        return arr.join("☻");
    }
    static deserialize(str) {
        //return false;
        let [originStr, goalStr, optsJson, cachedPath, pathCost, cachedDist] = str.split("☻");
        
        //logger.log("path:", originStr, goalStr, optsJson, cachedPath, pathCost, cachedDist)
        let orgin = global.WorldPosition.deserialize(originStr).toRoomPosition();
        let goal = global.WorldPosition.deserialize(goalStr).toRoomPosition();
        let inst = new CachedPath(orgin, goal, JSON.parse(optsJson));
        inst._cachedPath = cachedPath;
        if (cachedPath && cachedPath != 0 && cachedPath != "false") {
            logger.log("fillin path", cachedPath)
            inst.path = global.utils.map.dirStrToPath(orgin, cachedPath);
        }
        
        inst.pathCost = pathCost;
        inst._cachedDist = cachedDist;
        //inst.getPath();
        //logger.log(JSON.stringify(inst))
        return inst;
    }

}

// global.profiler.registerClass(CachedPath,"CachedPath");
// CachedPath.deserialize = global.profiler.registerFN(CachedPath.deserialize, "CachedPath.deserialize");



module.exports = {
    classes: {
        CachedPath,
    },

    calcPathCost,

    getExitPositions(roomName) {
        let terrain = Game.map.getRoomTerrain(roomName);
        let raw = terrain.getRawBuffer();
        let exitDescriptions = {}; // DIRECTION => list of exit roomPositions in that dir
        let exits = Game.map.describeExits(roomName);
        //for each side that has an exit, check every node that
        for(let exitDir in exits) {
            let exitsThisWay = [];
            //fill in room positions that aren't walls
            //logger.log("checking dir", exitDir, TOP)
            for(let i=0;i<50;i++) {
                let x = (exitDir == TOP || exitDir == BOTTOM) ? i : (exitDir == LEFT ? 0 : 49);
                let y = (exitDir == LEFT || exitDir == RIGHT) ? i : (exitDir == TOP ? 0 : 49);;
                let code = raw[y*50 + x];
                let isWall = code & TERRAIN_MASK_WALL;
                //logger.log("checking for exit", roomName, x, y, isWall, code)
                if (!isWall) {
                    let pos = new RoomPosition(x, y, roomName);
                    exitsThisWay.push(pos);
                }
            }
            exitDescriptions[exitDir] = exitsThisWay;
        }

        return exitDescriptions;
    },
   
    /**
     * 
     * @param {*} path A path as returned by pathfiner, an array of room positions.
     * 
     * @returns A serialized path without start position, in the format: ddddddddd
     */
    pathToDirStr(path) {
        if (!path || path.length == 0) {
            return "";
        }
        /** @type {RoomPosition} */
        let lastNode = path[0];
        let dirs = [];
        for (let i = 1; i < path.length; i++) {
            ///** @type {RoomPosition} */
            let node = path[i];
            let dir = lastNode.getDirectionTo(node);
            dirs.push(dir);
            lastNode = node;
        }
        return dirs.join('');
    },

    dirStrToPath(startNode, dirStr) {
        if (dirStr.length == 0) {
            return [];
        }
        if (!(startNode instanceof RoomPosition)) {
            throw new Error("invalid start node:" + JSON.stringify(startNode));
        }

        let path = [startNode];
        let lastWpos = startNode.toWorldPosition();
        delete startNode._wpos;
        for (let d in dirStr) {
            let dir = dirStr[d];
            let newWpos = lastWpos.moveInDir(dir);
            let pos = newWpos.toRoomPosition();
            path.push(pos);
            lastWpos = newWpos;
            //logger.log(newWpos);
        }
        return path;
    },

    /**
     * A path as returned by pathfiner, an array of room positions.
     * @param {*} path 
     * 
     * @returns A serialized path, in the format: roomName-x-y-ddddddddd
     */
    serializePath(path) {
        if (!path || path.length == 0) {
            return "";
        }
        let startNode = path[0];
        let lastNode = startNode;
        let serialized = `${startNode.roomName}-${startNode.x}-${startNode.y}-`;
        let dirs = [];
        for (let i = 1; i < path.length; i++) {
            /** @type {RoomPosition} */
            let node = path[i];
            let dir = lastNode.getDirectionTo(node);
            dirs.push(dir);
            lastNode = node;
        }
        return serialized + dirs.join('');
    },

    /**
     * Deserialize path back into an array of room positions
     * @param {String} serialized
     */
    deserializePath(serialized) {
        let [ roomName, x, y, dirs ] = serialized.split("-");
        //logger.log(serialized, "starting node data:", x, y, roomName)
        let startNode = new RoomPosition(x, y, roomName);
        let path = [startNode];
        let lastWpos = startNode.toWorldPosition();
        delete startNode._wpos;
        for (let d in dirs) {
            let dir = dirs[d];
            let newWpos = lastWpos.moveInDir(dir);
            let pos = newWpos.toRoomPosition();
            path.push(pos);
            lastWpos = newWpos;
            //logger.log(newWpos);
        }

        return path;
    },

    directionToDxDy(dir) {
        let dx = 0, dy = 0;
        if (_.includes([TOP, TOP_LEFT, TOP_RIGHT], dir)) {
            dy = -1;
        }
        if (_.includes([BOTTOM, BOTTOM_LEFT, BOTTOM_RIGHT], dir)) {
            dy = 1;
        }
        if (_.includes([RIGHT, TOP_RIGHT, BOTTOM_RIGHT], dir)) {
            dx = 1;
        }
        if (_.includes([LEFT, TOP_LEFT, BOTTOM_LEFT], dir)) {
            dx = -1;
        }
        return [dx, dy];
    },

    //stolen from daboross: https://gist.github.com/daboross/16361f0d140d49286b90f78facf24418
    /**
     * Utility function turning a direction constant into a dx/dy difference.
     */


    /**
     * Utility function turning a dx/dy difference into a direction constant.
     *
     * Note: ignores magnitude of arguments, and only looks at sign.
     */
    dxDyToDirection(dx, dy) {
        if (dx < 0) {
            if (dy < 0) {
                return TOP_LEFT;
            } else if (dy > 0) {
                return BOTTOM_LEFT;
            } else {
                return LEFT;
            }
        } else if (dx > 0) {
            if (dy < 0) {
                return TOP_RIGHT;
            } else if (dy > 0) {
                return BOTTOM_RIGHT;
            } else {
                return RIGHT;
            }
        } else {
            if (dy < 0) {
                return TOP;
            } else if (dy > 0) {
                return BOTTOM;
            } else {
                // both dx and dy are 0!
                return null;
            }
        }
    },
};