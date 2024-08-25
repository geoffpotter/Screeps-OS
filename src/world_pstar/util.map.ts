/*

 */

var logger = import screeps.logger;

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



let CachedPath = require('util.cachedPath.js');

// global.profiler.registerClass(CachedPath,"CachedPath");
// CachedPath.deserialize = global.profiler.registerFN(CachedPath.deserialize, "CachedPath.deserialize");



export default {
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