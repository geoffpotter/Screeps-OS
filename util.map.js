/*

 */

var logger = require("screeps.logger");
logger = new logger("util.map");




class CachedPath {
    /**
     * 
     * @param {RoomPosition|RoomObject} orgin 
     * @param {RoomPosition|RoomObject} goal 
     * @param {Object} opts 
     */
    constructor(orgin, goal, opts={}) {
        
        this.path = false;
        this.orgin = orgin;
        this.goal = goal;
        this.opts = opts;

        if (this.orgin.pos) {
            this.orgin = this.orgin.pos;
        }
        if (this.goal.pos) {
            this.goal = this.goal.pos;
        }

        //validate orgin
        if (!this.orgin || !(this.orgin.x >= 0) || !(this.orgin.y >= 0) || !this.orgin.roomName) {
            logger.log(JSON.stringify(this.orgin), JSON.stringify(this.goal))
            throw new Error("Orgin invalid! " + JSON.stringify(this.orgin))
        }
        //validate goal
        if (!this.goal || !(this.goal.x >= 0) || !(this.goal.y >= 0) || !this.goal.roomName) {
            logger.log(JSON.stringify(this.orgin), JSON.stringify(this.goal))
            throw new Error("Goal invalid! " + JSON.stringify(this.goal))
        }

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
       this._cachedPath = false;
       this._cachedDist = false;
    }

    get id() {
        return this.orgin.toWorldPosition().serialize() + "-" + this.goal.toWorldPosition().serialize();
    }

    get cost() {
        if (this.pathCost) {
            return this.pathCost;
        } else if (this._cachedPath) {
            return this._cachedPath.length;  //pretty sure this won't happen, but meh 
        } else if (this._cachedDist) {
            return this._cachedDist;
        } else {
            this._cachedDist = this.orgin.toWorldPosition().getRangeTo(this.goal.pos);
            return this._cachedDist;
        }
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
        let path = PathFinder.search(this.orgin, {pos:this.goal, range: range}, this.opts);
        if (path.incomplete) {
            return false;
        }
        this.pathCost = path.cost;
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

    serialize() {
        //logger.log(JSON.stringify(this.path))
        this._cachedPath = global.utils.map.pathToDirStr(this.path);
        //logger.log(this.orgin, JSON.stringify(global.utils.map.dirStrToPath(this.orgin, this._cachedPath)));
        let obj = {
            o: this.orgin.toWorldPosition().serialize(),
            g: this.goal.toWorldPosition().serialize(),
            opt: this.opts,
            p: this._cachedPath,
            pc: this.pathCost,
            cd: this._cachedDist
        }

        let jsonStr = JSON.stringify(obj);
        return jsonStr;
    }
    static deserialize(str) {
        let obj = JSON.parse(str);
        let orgin = global.WorldPosition.deserialize(obj.o).toRoomPosition();
        let goal = global.WorldPosition.deserialize(obj.g).toRoomPosition();
        let inst = new CachedPath(orgin, goal, obj.opt);
        inst._cachedPath = obj.p;
        inst.pathCost = obj.pc;
        inst._cachedDist = obj.cd;
        //inst.getPath();
        return inst;
    }

}


module.exports = {

    CachedPath,
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
            /** @type {RoomPosition} */
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