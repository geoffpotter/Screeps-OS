import { Dictionary } from "lodash";
import WorldPosition from "shared/utils/map/WorldPosition";

import CostMatrix from "shared/utils/map/CostMatrix";

import visual from "shared/utils/visual";

import logger from "shared/utils/logger";
let logger_local = new logger("CachedPath.ts")

import Node from "./node";

/**
 *
 * @param {*} path A path as returned by pathfiner, an array of room positions.
 *
 * @returns A serialized path without start position, in the format: ddddddddd
 */
function pathToDirStr(path: string | any[]) {
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
}

function dirStrToPath(startNode: WorldPosition, dirStr: string) {
    if (dirStr.length == 0) {
        return [];
    }
    if (!(startNode instanceof RoomPosition)) {
        throw new Error("invalid start node:" + JSON.stringify(startNode));
    }

    let path = [startNode];
    let lastWpos = startNode.toWorldPosition();
    // delete startNode._wpos;
    let dirs = dirStr.split('');
    for (let d in dirs) {
        let dir = dirs[d];
        let newWpos = lastWpos.moveInDir(dir);
        let pos = newWpos.toRoomPosition();
        path.push(pos);
        lastWpos = newWpos;
        //logger.log(newWpos);
    }
    return path;
}



/**
 * a path containing both start and end poisitions
 * @param {[RoomPosition]} path
 */
function calcPathCost(path: { [x: string]: any; }) {
    let cost = 0;

    let terrains:Dictionary<RoomTerrain> = {};
    let getTerrainAt = (pos:RoomPosition) => {
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
    if (cost > 0) {
        return cost;
    } else {
        return false;
    }

}

class CachedPath {
    path: RoomPosition[] | false;
    pathCost: number | false;
    _cachedPath: string | false;
    _cachedDist: number;

    /**
     * Represents a cached path between two room positions.
     * @param orgin - The origin room position.
     * @param goal - The goal room position.
     * @param opts - Additional options for pathfinding.
     */
    constructor(
        public orgin: RoomPosition,
        public goal: RoomPosition,
        public opts: Record<string, any> = {}
    ) {
        this.path = false;
        this.pathCost = false;
        this._cachedPath = false;
        this._cachedDist = 0;
    }

    /**
     * Gets the unique identifier for the cached path.
     */
    get id(): string {
        return `${this.orgin.toWorldPosition().serialize()}-${this.goal.toWorldPosition().serialize()}`;
    }

    /**
     * Gets the cost of the cached path.
     */
    get cost(): number {
        if (this.pathCost) {
            return this.pathCost;
        } else if (this._cachedPath) {
            return this._cachedPath.length;
        } else if (this._cachedDist) {
            return this._cachedDist;
        } else {
            this._cachedDist = this.orgin.toWorldPosition().getRangeTo(this.goal);
            return this._cachedDist;
        }
    }

    /**
     * Given either the origin or goal position, returns the other position.
     * @param pos - The position to check.
     * @returns The other position if found, false otherwise.
     */
    getOtherPos(pos: RoomPosition): RoomPosition | false {
        if (this.orgin.isEqualTo(pos)) {
            return this.orgin;
        } else if (this.goal.isEqualTo(pos)) {
            return this.goal;
        } else {
            return false;
        }
    }

    /**
     * Splits the cached path at a given position and returns two new CachedPath instances.
     * @param splitPos - The position to split the path at.
     * @returns An array containing the two new CachedPath instances.
     * @throws Error if the split position is not found in the path.
     */
    splitAtPos(splitPos: RoomPosition): [CachedPath, CachedPath] {
        let firstPath: RoomPosition[] = [];
        let secondPath: RoomPosition[] = [];

        let splitFound = false;
        let path = this.getPath();
        for (let p in path) {
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
            throw new Error("Split position not found!");
        }

        let firstCP = new CachedPath(firstPath[0], firstPath[firstPath.length - 1], this.opts);
        let secondCP = new CachedPath(secondPath[0], secondPath[secondPath.length - 1], this.opts);

        firstCP.path = firstPath;
        firstCP.pathCost = calcPathCost(firstPath);

        secondCP.path = secondPath;
        secondCP.pathCost = calcPathCost(secondPath);

        return [firstCP, secondCP];
    }

    /**
     * Gets the cached path.
     * @returns The cached path.
     */
    getPath(): RoomPosition[] {
        if (!this.path && this._cachedPath) {
            this.path = dirStrToPath(this.orgin.toWorldPosition(), this._cachedPath);
        }
        if (this.path) {
            return this.path;
        }

        let range = 0;
        if (!this.goal.isClearSpace()) {
            range = 1;
        }
        let opts = _.clone(this.opts);
        opts.plainCost = 2;
        opts.swampCost = 10;
        opts.roomCallback = (roomName: string) => {
            if (roomName !== this.orgin.roomName && roomName !== this.goal.roomName) {
                return false;
            }
            let cm = CostMatrix.getCM(roomName, "pStar");
            return cm;
        };

        let path = PathFinder.search(this.orgin, { pos: this.goal, range: range }, opts);
        if (path.incomplete) {
            return [];
        }
        this.pathCost = calcPathCost(path.path);
        this.path = [this.orgin].concat(path.path);
        return this.path;
    }

    /**
     * Displays the cached path.
     */
    display(): void {
        logger_local.log("displaying path", JSON.stringify(this.path));

        let color = "#" + visual.rgbColor(0, 255, 0);

        if (!this.path || this.path.length === 0) {
            color = "#" + visual.rgbColor(255, 0, 0);
            new RoomVisual(this.orgin.roomName).line(this.orgin, this.goal, { color: color, lineStyle: "dashed" });
        } else {
            visual.drawPath(this.path, color);
        }
        visual.circle(this.orgin, color);
        visual.circle(this.goal, color);
    }

    /**
     * Benchmarks the serialization and deserialization of the cached path.
     */
    benchMark(): void {
        let start;

        // Serialize
        start = Game.cpu.getUsed();
        let serialized = this.serialize();
        let cpuSerialized = Game.cpu.getUsed() - start;

        // Deserialize
        start = Game.cpu.getUsed();
        let obj = CachedPath.deserialize(serialized);
        let cpuDeserialized = Game.cpu.getUsed() - start;

        // JSON
        start = Game.cpu.getUsed();
        let json = JSON.stringify(this);
        let cpuJson = Game.cpu.getUsed() - start;

        // UnJSON
        start = Game.cpu.getUsed();
        let obj2 = JSON.parse(json);
        let cpuUnjson = Game.cpu.getUsed() - start;

        logger_local.log("serialize:", serialized.length, cpuSerialized, cpuDeserialized);
        logger_local.log("json", json.length, cpuJson, cpuUnjson);
    }

    /**
     * Moves the creep along the cached path.
     * @param creep - The creep to move.
     * @param destNode - The destination node.
     * @param goal - The goal position.
     * @returns An object representing the current state of the creep's movement.
     */
    moveOnPath(creep: Creep, destNode: Node, goal?: { pos: RoomPosition; range: number }): any {
        let start = Game.cpu.getUsed();
        let log = (...args: any[]) => {
            let usedNow = Game.cpu.getUsed();
            let used = usedNow - start;
            logger_local.log("cpu used:", used, args);
            start = usedNow;
        };

        let destTolarance = 2;

        let pathInfo = creep.memory._cachedPath || {
            stuck: 0,
            s: false,
            lp: creep.pos,
            lpp: creep.pos,
            idx: 0,
            done: false,
            onPath: false,
            closeToPath: false,
            dest: destNode.id,
        };

        if (pathInfo.dest !== destNode.id) {
            creep.memory._cachedPath = pathInfo = {
                stuck: 0,
                s: false,
                lp: creep.pos,
                lpp: creep.pos,
                idx: 0,
                done: false,
                onPath: false,
                closeToPath: false,
                dest: destNode.id,
            };
        }

        if (creep.pos.inRangeTo(destNode.pos, destTolarance)) {
            pathInfo.done = true;
            creep.memory._cachedPath = pathInfo;
            logger_local.log(creep.name, "already at destination. Be smarter.");
            return pathInfo;
        }

        if (pathInfo.s) {
            destTolarance = 1;
            let pos = new RoomPosition(pathInfo.s.x, pathInfo.s.y, pathInfo.s.roomName);
            if (creep.pos.inRangeTo(pos, destTolarance)) {
                pathInfo.s = false;
            } else {
                let ret = creep.moveTo(pos, { range: destTolarance, visualizePathStyle: { stroke: "#f0f" } });
                if (ret === ERR_NO_PATH) {
                    pathInfo.done = true;
                }
                creep.memory._cachedPath = pathInfo;
                return pathInfo;
            }
        }

        let path = _.clone(this.getPath());
        if (destNode.pos.isEqualTo(this.orgin)) {
            path = path.reverse();
        }
        let closestPos = path[0];
        let closestDist = 10000;
        let creepWpos = creep.pos.toWorldPosition();

        let startI = Math.min(path.length, pathInfo.onPath ? pathInfo.idx + 1 : pathInfo.idx);
        for (let i = startI; i < path.length; i++) {
            let pos = path[i];
            let i2 = 1 + i;
            let posDist = creepWpos.getRangeTo(pos);

            if (i2 >= path.length) {
                if (posDist < closestDist) {
                    closestPos = pos;
                    closestDist = posDist;
                }
                break;
            }

            let nextPos = path[i2];
            if (posDist < closestDist) {
                closestPos = pos;
                closestDist = posDist;
            }

            let onPath = creep.pos.isEqualTo(pos);
            let closeToPath =
                onPath ||
                (posDist <= destTolarance && posDist < creepWpos.getRangeTo(nextPos));

            pathInfo.onPath = false;
            pathInfo.closeToPath = false;
            if (onPath || closeToPath) {
                pathInfo.onPath = onPath;
                pathInfo.closeToPath = closeToPath;

                pathInfo.idx = i;
                visual.circle(pos, "#666");
                visual.circle(nextPos, "#999");
                let startPosToUse = pos;
                if (pathInfo.stuck > 2) {
                    startPosToUse = creep.pos;
                }

                pathInfo.lpp = nextPos;
                pathInfo.done =
                    creep.pos.inRangeTo(destNode.pos, 1) ||
                    (goal && creep.pos.inRangeTo(goal.pos, goal.range));

                let moveDir = startPosToUse.getDirectionTo(nextPos);
                let posToCheck = creepWpos.moveInDir(moveDir).toRoomPosition();

                let blockingObject = posToCheck.isBlocked();
                if (blockingObject) {
                    let try1 = moveDir + 1;
                    let try2 = moveDir - 1;
                    if (try1 >= 9) {
                        try1 -= 8;
                    }
                    if (try2 <= 0) {
                        try2 += 8;
                    }

                    let try1Pos = creepWpos.moveInDir(try1).toRoomPosition();
                    let try2Pos = creepWpos.moveInDir(try2).toRoomPosition();

                    let tries = [try1Pos, try2Pos];
                    tries = _.sortBy(tries, (t) => {
                        return t.toWorldPosition().getRangeTo(nextPos);
                    });

                    let oldTry2Pos = try2Pos;
                    [try1Pos, try2Pos] = tries;
                    if (try1Pos.isEqualTo(oldTry2Pos)) {
                        let f = try2;
                        try2 = try1;
                        try1 = f;
                    }

                    let try1BlockingObj = try1Pos.isBlocked() || try1Pos.getRangeTo(nextPos) > destTolarance;
                    let try2BlockingObj = try2Pos.isBlocked() || try2Pos.getRangeTo(nextPos) > destTolarance;
                    visual.circle(try1Pos, try1BlockingObj ? "red" : "green");
                    visual.circle(try2Pos, try2BlockingObj ? "red" : "yellow");

                    if (!try1BlockingObj) {
                        nextPos = try1Pos;
                    } else if (!try2BlockingObj) {
                        nextPos = try2Pos;
                    } else {
                        if (blockingObject.type === "creep") {
                            creep.say("move!");
                            let otherCreep = blockingObject.creep;
                            otherCreep.say("I'm moving!");
                            otherCreep.move(otherCreep.pos.getDirectionTo(creep.pos));
                            nextPos = otherCreep.pos;
                            logger_local.log(creep.name, "blocked, switching with", otherCreep.name);
                        } else if (try1BlockingObj.type === "creep") {
                            let otherCreep = try1BlockingObj.creep;
                            otherCreep.say("I'm moving!");
                            otherCreep.move(otherCreep.pos.getDirectionTo(creep.pos));
                            nextPos = otherCreep.pos;
                            logger_local.log(creep.name, "blocked, switching with", otherCreep.name);
                        } else if (try2BlockingObj.type === "creep") {
                            let otherCreep = try2BlockingObj.creep;
                            otherCreep.say("I'm moving!");
                            otherCreep.move(otherCreep.pos.getDirectionTo(creep.pos));
                            nextPos = otherCreep.pos;
                            logger_local.log(creep.name, "blocked, switching with", otherCreep.name);
                        }
                    }

                    moveDir = creep.pos.getDirectionTo(nextPos);
                }

                let ret = creep.move(moveDir);
                break;
            }
        }

        if (!pathInfo.onPath && !pathInfo.closeToPath || pathInfo.stuck > 3) {
            pathInfo.s = closestPos;
            creep.say("off path!");
            logger_local.log(creep.name, "not on path!", closestPos, JSON.stringify(pathInfo));
            logger_local.log(closestPos);
        }
        creep.memory._cachedPath = pathInfo;
        return pathInfo;
    }

    /**
     * Serializes the cached path.
     * @returns The serialized string.
     */
    serialize(): string {
        if (this.path) {
            this._cachedPath = pathToDirStr(this.path);
        }

        let arr = [
            this.orgin.toWorldPosition().serialize(),
            this.goal.toWorldPosition().serialize(),
            JSON.stringify(this.opts),
            this._cachedPath,
            this.pathCost,
            this._cachedDist,
        ];

        return arr.join("☻");
    }

    /**
     * Deserializes a serialized cached path.
     * @param str - The serialized string.
     * @returns The deserialized CachedPath instance.
     */
    static deserialize(str: string): CachedPath {
        let [originStr, goalStr, optsJson, cachedPath, pathCost, cachedDist] = str.split("☻");

        let orgin = WorldPosition.deserialize(originStr).toRoomPosition();
        let goal = WorldPosition.deserialize(goalStr).toRoomPosition();
        let inst = new CachedPath(orgin, goal, JSON.parse(optsJson));
        inst._cachedPath = cachedPath;
        if (cachedPath && cachedPath !== "false") {
            inst.path = dirStrToPath(orgin.toWorldPosition(), cachedPath);
        }

        inst.pathCost = Number(pathCost);
        inst._cachedDist = Number(cachedDist);

        return inst;
    }
}

export default CachedPath;
