
import Logger from "../../utils/logger";

const logger = new Logger("WorldPosition");

export type HasPos = { pos: RoomPosition }


export function reverseDirection(direction: DirectionConstant): DirectionConstant {
    return (direction + 4) % 8 as DirectionConstant;
}

export function getAdjacentDirections(direction: DirectionConstant): DirectionConstant[] {
    logger.log(`Getting adjacent directions for ${direction}`, direction, ((direction + 1) % 8), ((direction + 7) % 8));
    let try1 = direction + 1;
    let try2 = direction - 1;
    if (try1 >= 9) {
        try1 -= 8;
    }
    if (try2 <= 0) {
        try2 += 8;
    }
    return [direction, try1 as DirectionConstant, try2 as DirectionConstant];
}


export function isHighwayRoom(roomName: string): boolean {
    let parsed = roomName.match(/^[WE]([0-9]+)[NS]([0-9]+)$/);
    if (parsed === null) return false;
    return Number(parsed[1]) % 10 === 0 || Number(parsed[2]) % 10 === 0;
}

export function isSKRoom(roomName: string, includeCenter: boolean = false): boolean {
    let parsed = roomName.match(/^[WE]([0-9]+)[NS]([0-9]+)$/);
    if (parsed === null) return false;
    let xIndex = Number(parsed[1]);
    let yIndex = Number(parsed[2]);
    let inSkRangeX = xIndex >= 4 && xIndex <= 6;
    let inSkRangeY = yIndex >= 4 && yIndex <= 6;
    let isCenter = xIndex == 5 && yIndex == 5;
    return (includeCenter || !isCenter) && (inSkRangeX && inSkRangeY);
}

export function isCenterRoom(roomName: string): boolean {
    let parsed = roomName.match(/^[WE]([0-9]+)[NS]([0-9]+)$/);
    if (parsed === null) return false;
    let xIndex = Number(parsed[1]);
    let yIndex = Number(parsed[2]);
    return xIndex == 5 && yIndex == 5;
}

export interface WorldPositionData {
    x: number;
    y: number;
}


export function serializeWPath(path: WorldPosition[]): string {
    return path.map(p => p.serialize()).join(",");
}

export function deserializeWPath(path: string): WorldPosition[] {
    return path.split(",").map(p => WorldPosition.deserialize(p));
}

//----------------------- World position --------------------------
/**
 * Uniform screep's world position with E0S0 as origin.
 */
export default class WorldPosition {
    static fromJSON(json: WorldPositionData): WorldPosition {
        return new WorldPosition(json.x, json.y);
    }
    toJSON(): any {
        // return {
        //     x: this.x,
        //     y: this.y,
        // };
        let pos = this.toRoomPosition();
        return {
            x: pos.x,
            y: pos.y,
            roomName: pos.roomName,
        };
    }
    /** @property int x */
    /** @property int y */

    /**
     * @param {number} x - world position x (-3025 to 3025)
     * @param {number} y - world position y (-3025 to 3025)
     */
    constructor(public x: number, public y: number) {
        Object.seal(this);
    }

    /**
     * @param {RoomPosition | { pos: RoomPosition }} point
     */
    getRangeTo(point: WorldPosition): number {
        let pos: WorldPosition = toWorldPosition(point);
        return this.getRangeToXY(pos.x, pos.y);
    }

    canWalkTo(point: WorldPosition): boolean {
        //check if we can walk all the way to the point by checking if each step on the way is walkable
        let currentPos: WorldPosition = this;
        while (currentPos.x !== point.x || currentPos.y !== point.y) {
            let direction = currentPos.getDirectionTo(point);
            currentPos = currentPos.moveInDir(direction);
            if (currentPos.toRoomPosition().isBlocked()) {
                return false;
            }
        }
        return true;
    }

    /**
     * @param {number} dir
     */
    moveInDir(dir: number | string): WorldPosition {
        dir = Number(dir);
        let dx: number, dy: number = 0;
        switch (dir) {
            case TOP:
                [dx, dy] = [0, -1];
                break;
            case TOP_RIGHT:
                [dx, dy] = [1, -1];
                break;
            case RIGHT:
                [dx, dy] = [1, 0];
                break;
            case BOTTOM_RIGHT:
                [dx, dy] = [1, 1];
                break;
            case BOTTOM:
                [dx, dy] = [0, 1];
                break;
            case BOTTOM_LEFT:
                [dx, dy] = [-1, 1];
                break;
            case LEFT:
                [dx, dy] = [-1, 0];
                break;
            case TOP_LEFT:
                [dx, dy] = [-1, -1];
                break;
            default:
                [dx, dy] = [0, 0];
                break;
        }
        let newX = this.x + dx;
        let newY = this.y + dy;
        return new WorldPosition(newX, newY);
    }



    /**
     * @param {number} x
     * @param {number} y
     */
    getRangeToXY(x: number, y: number): number {
        return this.getChebyshevDist(x, y);
    }

    /**
     * @param {RoomPosition} point
     * @param {number} range
     */
    inRangeTo(point: WorldPosition, range: number): boolean {
        return this.inRangeToXY(point.x, point.y, range);
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} range
     */
    inRangeToXY(x: number, y: number, range: number): boolean {
        return this.getRangeToXY(x, y) <= range;
    }

    /**
     * @param {RoomPosition} point
     */
    getDirectionTo(point: WorldPosition): DirectionConstant {
        return this.getDirectionToXY(point.x, point.y);
    }

    /**
     * @param {number} x - world coordinate x
     * @param {number} y - world coordinate y
     */
    getDirectionToXY(x: number, y: number): DirectionConstant {
        let [dx, dy] = [x - this.x, y - this.y];
        let arc = Math.atan2(dy, dx) * (180 / Math.PI);
        let dir = Math.round(arc / 45) + 3;
        return dir == 0 ? 8 : dir as DirectionConstant;
    }


    findRouteToWorldPosition(pos: WorldPosition, opts?: RouteOptions): Array<{
        exit: ExitConstant;
        room: string;
    }> | ERR_NO_PATH {
        return Game.map.findRoute(this.getRoomName(), pos.getRoomName(), opts);
    }

    findPathToWorldPosition(pos: WorldPosition, opts?: FindPathOpts): PathFinderPath {
        let src = this.toRoomPosition();
        let dst = pos.toRoomPosition();
        return PathFinder.search(src, dst, opts);
    }

    /**
     * @param {WorldPosition[]} arr - array of other world positions to compare
     */
    findClosestByRange(arr: WorldPosition[]): WorldPosition {
        return _.min(arr, p => this.getRangeTo(p));
    }

    /**
     * @param {WorldPosition[]} arr - array of other world positions to compare
     * @param {number} range
     */
    findInRange(arr: WorldPosition[], range: number): WorldPosition[] {
        return _.filter(arr, p => this.getRangeTo(p) <= range);
    }

    /** @returns {string} - name of the room this point belongs to */
    getRoomName(): string {
        if (Game.rooms.sim) {
            return "sim";
        }
        let [x, y] = [Math.floor(this.x / 50), Math.floor(this.y / 50)];
        let result = "";
        result += x < 0 ? "W" + String(~x) : "E" + String(x);
        result += y < 0 ? "N" + String(~y) : "S" + String(y);
        return result;
    }
    /** @returns {string} - name of the room this point belongs to */
    get roomName(): string {
        return this.getRoomName();
    }

    /** @returns {boolean} - do we have visibility in the room this point belongs to? */
    isVisible(): boolean {
        let name = this.getRoomName();
        return Game.rooms[name] !== undefined;
    }

    /** @returns {boolean} - is this room part of the highways between sectors? */
    isHighway(): boolean {
        let roomName = this.getRoomName();
        return isHighwayRoom(roomName);
    }
    isSK(includeCenter: boolean = false): boolean {
        let roomName = this.getRoomName();
        return isSKRoom(roomName, includeCenter);
    }
    isCenter(): boolean {
        let roomName = this.getRoomName();
        return isCenterRoom(roomName);
    }

    /** @returns {boolean} - do I own this point in space? */
    isMine(): boolean {
        let roomName = this.getRoomName();
        return _.get(Game.rooms, roomName + ".controller.my", false);
    }


    getAdjacentNonBlockedPositions(): WorldPosition[] {
        let positions: WorldPosition[] = [];
        for (let dir of [TOP, TOP_RIGHT, RIGHT, BOTTOM_RIGHT, BOTTOM, BOTTOM_LEFT, LEFT, TOP_LEFT]) {
            if (!this.moveInDir(dir).isBlocked()) {
                positions.push(this.moveInDir(dir));
            }
        }
        return positions;
    }

    getAdjacentClearPositions(): WorldPosition[] {
        let positions: WorldPosition[] = [];
        for (let dir of [TOP, TOP_RIGHT, RIGHT, BOTTOM_RIGHT, BOTTOM, BOTTOM_LEFT, LEFT, TOP_LEFT]) {
            if (this.moveInDir(dir).isClearSpace()) {
                positions.push(this.moveInDir(dir));
            }
        }
        return positions;
    }

    getAdjacentPositions(): WorldPosition[] {
        let positions: WorldPosition[] = [];
        for (let dir of [TOP, TOP_RIGHT, RIGHT, BOTTOM_RIGHT, BOTTOM, BOTTOM_LEFT, LEFT, TOP_LEFT]) {
            positions.push(this.moveInDir(dir));
        }
        return positions;
    }

    isClearSpace(): boolean {
        let pos = this.toRoomPosition();
        return pos.isClearSpace();
    }

    isBlocked(): boolean {
        const roomPos = this.toRoomPosition();
        const terrain = Game.map.getRoomTerrain(roomPos.roomName);

        // Check for walls
        if (terrain.get(roomPos.x, roomPos.y) === TERRAIN_MASK_WALL) {
            // visual.circle(pos.toRoomPosition(), '#ff0000', 0.5);
            return true;
        }
        if (Game.rooms[roomPos.roomName]) {

            // Check for structures
            const structures = roomPos.lookFor(LOOK_STRUCTURES);
            for (const structure of structures) {
                // List of structure types that block movement
                const blockingStructures: StructureConstant[] = [
                    STRUCTURE_WALL,
                    STRUCTURE_RAMPART,
                    STRUCTURE_SPAWN,
                    STRUCTURE_EXTENSION,
                    STRUCTURE_LINK,
                    STRUCTURE_STORAGE,
                    STRUCTURE_TOWER,
                    STRUCTURE_OBSERVER,
                    STRUCTURE_POWER_SPAWN,
                    STRUCTURE_LAB,
                    STRUCTURE_TERMINAL,
                    STRUCTURE_NUKER,
                    STRUCTURE_FACTORY
                ];

                if (blockingStructures.includes(structure.structureType)) {
                    // If it's a rampart, check if it's not our own or if it's not public
                    if (structure.structureType === STRUCTURE_RAMPART) {
                        const rampart = structure as StructureRampart;
                        if (!rampart.my) {
                            return true;
                        }
                    } else {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    /** Distance functions */

    /**
     * @param {RoomPosition} pos
     */
    getEuclidDist(pos: RoomPosition): number {
        return Math.hypot(pos.x - this.x, pos.y - this.y);
    }

    /**
     * @param {RoomPosition} pos
     */
    getManhattanDist(pos: RoomPosition): number {
        return Math.abs(pos.x - this.x) + Math.abs(pos.y - this.y);
    }

    /**
     * @param {number} x
     * @param {number} y
     */
    getChebyshevDist(x: number, y: number): number {
        return Math.max(Math.abs(x - this.x), Math.abs(y - this.y));
    }

    /** serialization */
    serialize(): string {
        //return this.x + "_" + this.y;
        let pos = this.toRoomPosition();
        return pos.x + "_" + pos.y + "_" + pos.roomName;
    }

    /**
     * @param {string} str
     */
    static deserialize(str: string): WorldPosition {
        // let [x, y] = str.split("_");
        // return new WorldPosition(Number(x), Number(y));
        let [x, y, roomName] = str.split("_");
        let wpos = new RoomPosition(Number(x), Number(y), roomName);
        return wpos.toWorldPosition();
    }

    /** [object WorldPosition] */
    get [Symbol.toStringTag](): string {
        return "WorldPosition";
    }

    get id(): string {
        return this.serialize();
    }

    static fromRoomPositionInfo(x: number, y: number, roomName: string): WorldPosition {
        if (!_.inRange(x, 0, 50)) throw new RangeError("x value " + x + " not in range");
        if (!_.inRange(y, 0, 50)) throw new RangeError("y value " + y + " not in range");
        if (roomName == "sim") {
            return new WorldPosition(x, y);
        }
        let result = roomName.match(/^([WE])([0-9]+)([NS])([0-9]+)$/);
        if (result === null) throw new Error("Invalid room name " + roomName);
        let [name, h, wx, v, wy] = result;
        let wxi = Number(wx);
        let wyi = Number(wy);
        if (h == "W") wxi = ~wxi;
        if (v == "N") wyi = ~wyi;
        return new WorldPosition(50 * wxi + x, 50 * wyi + y);
    }
    /**
     * @param {RoomPosition} roomPos
     * @returns {WorldPosition}
     */
    static fromRoomPosition(roomPos: RoomPosition): WorldPosition {
        let { x, y, roomName } = roomPos;
        return WorldPosition.fromRoomPositionInfo(x, y, roomName);
    }

    toRoomPosition(): RoomPosition {
        let [rx, x] = [Math.floor(this.x / 50), this.x % 50];
        let [ry, y] = [Math.floor(this.y / 50), this.y % 50];
        if (rx < 0 && x < 0) x = 49 - ~x;
        if (ry < 0 && y < 0) y = 49 - ~y;
        return new RoomPosition(x, y, this.getRoomName());
    }

    /** [world pos 1275,1275] */
    toString(): string {
        return "[world pos " + this.x + "," + this.y + "]";
    }

    isEqualTo(pos: WorldPosition | RoomPosition | object): boolean {
        if (pos instanceof WorldPosition) {
            return this.x === pos.x && this.y === pos.y;
        } else if (pos instanceof RoomPosition) {
            return this.x === pos.x && this.y === pos.y && this.getRoomName() === pos.roomName;
        } else {
            //@ts-ignore
            if (pos.roomName) {
                //@ts-ignore
                return new RoomPosition(pos.x, pos.y, pos.roomName).toWorldPosition().isEqualTo(this);
            }
            return WorldPosition.fromJSON(pos as WorldPositionData).isEqualTo(this);
        }
    }
}

export function toWorldPosition(pos: WorldPosition | RoomPosition | HasPos): WorldPosition {
    if (pos instanceof WorldPosition) {
        return pos;
    } else if (pos instanceof RoomPosition) {
        return WorldPosition.fromRoomPosition(pos);
    } else if (pos.pos) {
        return toWorldPosition(pos.pos);
    } else if (typeof pos === "string") {
        return WorldPosition.deserialize(pos);
    } else if (typeof pos === "object") {
        //@ts-ignore
        if (pos.roomName) {
            //@ts-ignore
            return WorldPosition.fromRoomPositionInfo(pos.x, pos.y, pos.roomName);
        } else {
            //@ts-ignore
            return new WorldPosition(pos.x, pos.y);
        }
    } else {
        throw new Error("Invalid argument to toWorldPosition: " + JSON.stringify(pos));
    }
}

export function toRoomPosition(pos: WorldPosition | RoomPosition | HasPos): RoomPosition {
    if (pos instanceof RoomPosition) {
        return pos;
    } else if (pos instanceof WorldPosition) {
        return pos.toRoomPosition();
    } else if (pos.pos) {
        return pos.pos;
    } else {
        throw new Error("Invalid argument to toRoomPosition: " + JSON.stringify(pos));
    }
}
