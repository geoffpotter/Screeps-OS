import { Dictionary } from "lodash";
import WorldPosition, { HasPos, toWorldPosition } from "shared/utils/map/WorldPosition";

import CostMatrix from "shared/utils/map/CostMatrix";

import visual from "shared/utils/visual";

import Logger from "shared/utils/logger";
let logger = new Logger("CachedPath.ts")

import Node from "./node";
import PathInfo from "./pathinfo";

import { MovableObject } from "./";

declare global {
    interface CreepMemory {
        _cachedPath: PathInfo;
    }
    interface PowerCreepMemory {
        _cachedPath: PathInfo;
    }
}

/**
 * Converts a path of positions to a string of directions.
 *
 * @template T - Type extending RoomPosition or WorldPosition
 * @param {T[]} path - An array of positions representing the path.
 * @returns {string} A serialized path without start position, in the format: ddddddddd
 */
function pathToDirStr<T extends WorldPosition|RoomPosition|HasPos>(path: T[]): string {
    if (!path || path.length === 0) {
        return "";
    }

    let lastNode = path[0];
    let dirs: number[] = [];

    for (let i = 1; i < path.length; i++) {
        let node = path[i];
        let dir: number;

        const lastWorldPos = toWorldPosition(lastNode);
        const nodeWorldPos = toWorldPosition(node);
        dir = lastWorldPos.getDirectionTo(nodeWorldPos);

        dirs.push(dir);
        lastNode = node;
    }

    return dirs.join('');
}
function dirStrToPath<T extends WorldPosition|RoomPosition|HasPos>(startNode: T, dirStr: string): WorldPosition[] {
    if (dirStr.length == 0) {
        return [];
    }
    if (!(startNode instanceof WorldPosition || startNode instanceof RoomPosition)) {
        throw new Error("invalid start node:" + JSON.stringify(startNode));
    }
    const startWorldPos = toWorldPosition(startNode);
    let path: WorldPosition[] = [startWorldPos];
    let lastpos = startWorldPos;
    let dirs = dirStr.split('');

    for (let dir of dirs) {
        let newpos = lastpos.moveInDir(dir);
        path.push(newpos);
        lastpos = newpos;
    }

    return path;
}



/**
 * a path containing both start and end poisitions
 * @param {[RoomPosition]} path
 */
function calcPathCost(path: Array<WorldPosition|RoomPosition>): number | false {
    let cost = 0;

    let terrains:Dictionary<RoomTerrain> = {};
    let getTerrainAt = (pos:WorldPosition|RoomPosition) => {
        let roomPos = pos instanceof WorldPosition ? pos.toRoomPosition() : pos;
        let roomName = roomPos.roomName;
        if (!terrains[roomName]) {
            terrains[roomName] = new Room.Terrain(roomName);
        }

        return terrains[roomName].get(roomPos.x, roomPos.y);
    };

    if (Array.isArray(path)) {
        for (let pos of path) {
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
        }
    }
    return false;

}

class CachedPath {
    path: WorldPosition[] | false;
    pathCost: number | false;
    _cachedPath: string | false;
    _cachedDist: number;

    /**
     * Represents a cached path between two room positions.
     * @param origin - The origin room position.
     * @param goal - The goal room position.
     * @param opts - Additional options for pathfinding.
     */
    constructor(
        public origin: WorldPosition,
        public goal: WorldPosition,
        public opts: Record<string, any> = {}
    ) {
        this.origin = origin;
        this.goal = goal;
        this.opts = opts;
        this.path = false;
        this.pathCost = false;
        this._cachedPath = false;
        this._cachedDist = 0;
    }

    /**
     * Gets the unique identifier for the cached path.
     */
    get id(): string {
        return `${this.origin.serialize()}-${this.goal.serialize()}`;
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
            this._cachedDist = this.origin.getRangeTo(this.goal);
            return this._cachedDist;
        }
    }

    /**
     * Given either the origin or goal position, returns the other position.
     * @param pos - The position to check.
     * @returns The other position if found, false otherwise.
     */
    getOtherPos(pos: WorldPosition): WorldPosition | false {
        if (this.origin.isEqualTo(pos)) {
            return this.origin;
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
    splitAtPos(splitPos: WorldPosition): [CachedPath, CachedPath] {
        let firstPath: WorldPosition[] = [];
        let secondPath: WorldPosition[] = [];

        let splitFound:boolean = false;
        let path = this.getPath();
        for (let i = 0; i < path.length; i++) {
            let pos = path[i];

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

        logger.log("splitAtPos", splitPos.serialize(), "this path", this.path && this.path.map(p=>p.serialize()), "firstPath", firstPath.map(p=>p.serialize()), "secondPath", secondPath.map(p=>p.serialize()));

        if (!splitFound) {
            logger.error("splitPos", splitPos.serialize(), "path", path.map(p=>p.serialize()));
            // throw new Error("Split position not found!");
        }

        let firstCP = new CachedPath(firstPath[0], firstPath[firstPath.length - 1], this.opts);
        let secondCP = new CachedPath(secondPath[0], secondPath[secondPath.length - 1], this.opts);

        firstCP.path = firstPath;
        firstCP.pathCost = calcPathCost(firstPath);

        secondCP.path = secondPath;
        secondCP.pathCost = calcPathCost(secondPath);

        logger.log("split", splitPos.serialize(), "firstCP", firstCP.path.map(p=>p.serialize()), "secondCP", secondCP.path.map(p=>p.serialize()));
        return [firstCP, secondCP];
    }

    /**
     * Gets the cached path.
     * @returns The cached path.
     */
    getPath(): WorldPosition[] {
        if (!this.path && this._cachedPath) {
            this.path = dirStrToPath(this.origin, this._cachedPath);
        }
        if (this.path) {
            return this.path;
        }

        let range = 0;
        if (!this.goal.toRoomPosition().isClearSpace()) {
            range = 1;
        }
        let opts = _.clone(this.opts);
        opts.plainCost = 4;
        opts.swampCost = 20;
        opts.roomCallback = (roomName: string) => {
            // not sure why I did this, but it doesn't seem right.
            // if (roomName !== this.origin.getRoomName() && roomName !== this.goal.getRoomName()) {
            //     return false;
            // }
            let cm = CostMatrix.getCM(roomName, "NodeNetwork");
            return cm;
        };

        let path = PathFinder.search(this.origin.toRoomPosition(), { pos: this.goal.toRoomPosition(), range: range }, opts);
        if (path.incomplete) {
            return [];
        }
        this.pathCost = calcPathCost(path.path);
        this.path = [this.origin].concat(path.path.map(pos => WorldPosition.fromRoomPosition(pos)));
        return this.path;
    }

    /**
     * Displays the cached path.
     */
    display(): void {
        logger.log("displaying path", JSON.stringify(this.path));

        let color = "#" + visual.rgbColor(0, 255, 0);

        if (!this.path || this.path.length === 0) {
            color = "#" + visual.rgbColor(255, 0, 0);
            new RoomVisual(this.origin.getRoomName()).line(this.origin.toRoomPosition(), this.goal.toRoomPosition(), { color: color, lineStyle: "dashed" });
        } else {
            visual.drawPath(this.path.map(wp => wp.toRoomPosition()), color);
        }
        visual.circle(this.origin.toRoomPosition(), color);
        visual.circle(this.goal.toRoomPosition(), color);
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

        logger.log("serialize:", serialized.length, cpuSerialized, cpuDeserialized);
        logger.log("json", json.length, cpuJson, cpuUnjson);
    }

    /**
     * Moves the creep along the cached path.
     * @param creep - The creep to move.
     * @param destNode - The destination node.
     * @param goal - The goal position.
     * @returns An object representing the current state of the creep's movement.
     */
    moveOnPath(creep: MovableObject, destNode: Node, goal?: { pos: WorldPosition; range: number }): any {
        let start = Game.cpu.getUsed();
        let log = (...args: any[]) => {
            let usedNow = Game.cpu.getUsed();
            let used = usedNow - start;
            logger.log("cpu used:", used, args);
            start = usedNow;
        };

        let destTolarance = goal ? goal.range : 1;

        let pathInfo = creep.memory._cachedPath || {
            stuck: 0,
            s: false,
            lp: creep.pos.toWorldPosition(),
            lpp: creep.pos.toWorldPosition(),
            idx: 0,
            done: false,
            onPath: false,
            closeToPath: false,
            dest: destNode.id,
        };

        if (creep.pos.toWorldPosition().inRangeTo(destNode.pos, destTolarance)) {
            pathInfo.done = true;
            creep.memory._cachedPath = pathInfo;
            logger.log(creep.name, "already at destination. Be smarter.");
            return pathInfo;
        }

        if (pathInfo.s) {
            destTolarance = 0;
            logger.log(creep.name, "pathinfo", JSON.stringify(pathInfo.s), typeof pathInfo.s, pathInfo.s instanceof WorldPosition, pathInfo.s instanceof RoomPosition);
            let pos: WorldPosition;
            if ((pathInfo.s instanceof String)) {
                //@ts-ignore
                pos = WorldPosition.deserialize(pathInfo.s);
            } else if (pathInfo.s instanceof WorldPosition) {
                pos = pathInfo.s;
                //@ts-ignore
            } else if (pathInfo.s.roomName !== undefined) {
                //@ts-ignore
                let rpos = new RoomPosition(pathInfo.s.x, pathInfo.s.y, pathInfo.s.roomName);
                pos = rpos.toWorldPosition();
            } else {
                throw new Error("invalid pos " + JSON.stringify(pathInfo.s));
            }
            logger.log(creep.name, "pos", pos.serialize());
            if (creep.pos.toWorldPosition().inRangeTo(pos, destTolarance)) {
                pathInfo.s = false;
            } else {
                logger.log(creep.name, "moving to", pos.serialize());
                let ret = creep.moveTo(pos.toRoomPosition(), { range: destTolarance, visualizePathStyle: { stroke: "#f0f" } });
                if (ret === ERR_NO_PATH) {
                    pathInfo.done = true;
                }
                creep.memory._cachedPath = pathInfo;
                return pathInfo;
            }
        }

        let path = _.clone(this.getPath());
        logger.log(creep.name, "moving from", this.origin.toRoomPosition(), "to", this.goal.toRoomPosition(), " current pos", creep.pos);
        if (destNode.pos.isEqualTo(this.origin)) {
            logger.log(creep.name, "reversing path");
            path = path.reverse();
        }
        let closestPos = path[0];
        let closestDist = 10000;
        let creepWpos = creep.pos.toWorldPosition();

        let startI = Math.min(path.length - 1, pathInfo.onPath ? pathInfo.idx + 1 : pathInfo.idx);
        logger.log(creep.name, "startI", startI, path.length, pathInfo.onPath, pathInfo.done);
        for (let i = startI; i < path.length; i++) {
            let pos = path[i];
            let i2 = 1 + i;
            let posDist = creepWpos.getRangeTo(pos);

            // if (i2 >= path.length) {
            //     if (posDist < closestDist) {
            //         closestPos = pos;
            //         closestDist = posDist;
            //     }
            //     logger.log(creep.name, "in that spot that I don't really get");
            //     break;
            // }

            let nextPos = path[i2];
            logger.log(creep.name, "looking at pos", pos, nextPos)
            if (posDist < closestDist) {
                closestPos = pos;
                closestDist = posDist;
            }

            let onPath = creepWpos.isEqualTo(pos);
            let closeToPath =
                onPath ||
                (posDist <= destTolarance && posDist < creepWpos.getRangeTo(nextPos));

            pathInfo.onPath = false;
            pathInfo.closeToPath = false;
            if (onPath || closeToPath) {
                logger.log(creep.name, "onPath or closeToPath", pos.serialize(), nextPos.serialize());
                pathInfo.onPath = onPath;
                pathInfo.closeToPath = closeToPath;

                pathInfo.idx = i;
                visual.circle(pos.toRoomPosition(), "#666");
                visual.circle(nextPos.toRoomPosition(), "#999");
                let startPosToUse = pos;
                if (pathInfo.stuck > 2) {
                    startPosToUse = creep.pos.toWorldPosition();
                }

                pathInfo.lpp = nextPos;
                pathInfo.done =
                    creep.pos.toWorldPosition().inRangeTo(destNode.pos, 1) ||
                    (goal && creep.pos.toWorldPosition().inRangeTo(goal.pos, goal.range));

                let moveDir:DirectionConstant = startPosToUse.getDirectionTo(nextPos);
                let posToCheck = creepWpos.moveInDir(moveDir).toRoomPosition();

                let blockingObject = posToCheck.isBlocked();
                if (blockingObject && pathInfo.stuck < 3) {
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

                    let try1BlockingObj = try1Pos.isBlocked() || try1Pos.toWorldPosition().getRangeTo(nextPos) > destTolarance;
                    let try2BlockingObj = try2Pos.isBlocked() || try2Pos.toWorldPosition().getRangeTo(nextPos) > destTolarance;
                    visual.circle(try1Pos, try1BlockingObj ? "red" : "green");
                    visual.circle(try2Pos, try2BlockingObj ? "red" : "yellow");

                    if (!try1BlockingObj) {
                        nextPos = try1Pos.toWorldPosition();
                    } else if (!try2BlockingObj) {
                        nextPos = try2Pos.toWorldPosition();
                    } else {
                        if (blockingObject.type === "creep" && blockingObject.creep) {
                            creep.say("move!");
                            let otherCreep = blockingObject.creep;
                            otherCreep.say("I'm moving!");
                            otherCreep.move(otherCreep.pos.getDirectionTo(creep.pos));
                            nextPos = otherCreep.pos.toWorldPosition();
                            logger.log(creep.name, "blocked, switching with", otherCreep.name);
                        } else if (try1BlockingObj != true && try1BlockingObj.type === "creep" && try1BlockingObj.creep) {
                            let otherCreep = try1BlockingObj.creep;
                            otherCreep.say("I'm moving!");
                            otherCreep.move(otherCreep.pos.getDirectionTo(creep.pos));
                            nextPos = otherCreep.pos.toWorldPosition();
                            logger.log(creep.name, "blocked, switching with", otherCreep.name);
                        } else if (try2BlockingObj != true && try2BlockingObj.type === "creep" && try2BlockingObj.creep) {
                            let otherCreep = try2BlockingObj.creep;
                            otherCreep.say("I'm moving!");
                            otherCreep.move(otherCreep.pos.getDirectionTo(creep.pos));
                            nextPos = otherCreep.pos.toWorldPosition();
                            logger.log(creep.name, "blocked, switching with", otherCreep.name);
                        }
                    }

                    moveDir = creep.pos.getDirectionTo(nextPos.toRoomPosition());
                }
                logger.log(creep.name, "moving to", nextPos.serialize());
                let ret = creep.move(moveDir);
                break;
            }
        }

        if (!pathInfo.onPath && !pathInfo.closeToPath || pathInfo.stuck > 3) {
            logger.log(creep.name, "not on path!", closestPos, JSON.stringify(pathInfo));
            pathInfo.s = closestPos;
            creep.say("off path!");
            logger.log(creep.name, "not on path!", closestPos, JSON.stringify(pathInfo));
            logger.log(closestPos);

            //@ts-ignore
            creep.memory.NodeNetworkPath = undefined;
            //@ts-ignore
            creep.memory._cachedPath = {
                stuck: 0,
                s: false,
                lp: creep.pos.toWorldPosition(),
                lpp: creep.pos.toWorldPosition(),
                idx: 0,
                done: false,
                onPath: false,
                closeToPath: false,
                dest: destNode.id,
            };
            return pathInfo;
        } else {
            creep.memory._cachedPath = pathInfo;
        }
        return pathInfo;
    }

    /**
     * Serializes the cached path.
     * @returns The serialized string.
     */
    serialize(): string {
        if (this.path) {
            this._cachedPath = pathToDirStr(this.path.map(wp => wp));
        }

        let arr = [
            this.origin.serialize(),
            this.goal.serialize(),
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

        let origin = WorldPosition.deserialize(originStr);
        let goal = WorldPosition.deserialize(goalStr);
        let inst = new CachedPath(origin, goal, JSON.parse(optsJson));
        inst._cachedPath = cachedPath;
        if (cachedPath && cachedPath !== "false") {
            inst.path = dirStrToPath(origin, cachedPath);
        }

        inst.pathCost = Number(pathCost);
        inst._cachedDist = Number(cachedDist);

        return inst;
    }

    getNextPathPosition(creep: MovableObject, destNode: Node, goal: { pos: WorldPosition; range: number }, lookahead: number): { nextPos: WorldPosition, lookaheadPos: WorldPosition | null } {
        let path = this.getPath();
        let creepWpos = creep.pos.toWorldPosition();

        if (creepWpos.inRangeTo(destNode.pos, goal.range)) {
            return { nextPos: creepWpos, lookaheadPos: null };
        }

        if (destNode.pos.isEqualTo(this.origin)) {
            path = path.reverse();
        }

        let closestIndex = 0;
        let closestDist = Infinity;

        for (let i = 0; i < path.length; i++) {
            let posDist = creepWpos.getRangeTo(path[i]);
            if (posDist < closestDist) {
                closestDist = posDist;
                closestIndex = i;
            }
        }

        let nextPos = path[Math.min(closestIndex + 1, path.length - 1)];
        let lookaheadPos = path[Math.min(closestIndex + lookahead, path.length - 1)];

        return { nextPos, lookaheadPos };
    }
}

export default CachedPath;
