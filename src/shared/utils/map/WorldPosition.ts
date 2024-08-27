
//----------------------- World position --------------------------
/**
 * Uniform screep's world position with E0S0 as origin.
 */
class WorldPosition {
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
    getRangeTo(point: RoomPosition | { pos: RoomPosition }): number {
        let pos:WorldPosition|false = false;
        if (!(point instanceof RoomPosition) && point.pos) {
            pos = point.pos.toWorldPosition();
        } else if (point instanceof RoomPosition) {
            pos = point.toWorldPosition();
        }
        if (!pos) {
            throw new Error("Invalid argument to getRangeTo: " + JSON.stringify(point));
        }
        return this.getRangeToXY(pos.x, pos.y);
    }

    /**
     * @param {number} dir
     */
    moveInDir(dir: number): WorldPosition {
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
    inRangeTo(point: RoomPosition, range: number): boolean {
        if (point instanceof RoomPosition) {
            point = point.toWorldPosition();
        }
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
    getDirectionTo(point: RoomPosition): number {
        return this.getDirectionToXY(point.x, point.y);
    }

    /**
     * @param {number} x - world coordinate x
     * @param {number} y - world coordinate y
     */
    getDirectionToXY(x: number, y: number): number {
        let [dx, dy] = [x - this.x, y - this.y];
        let arc = Math.atan2(dy, dx) * (180 / Math.PI);
        let dir = Math.round(arc / 45) + 3;
        return dir == 0 ? 8 : dir;
    }

    /**
     * @param {RoomPosition} pos
     * @param {RouteOptions} opts
     */
    findRouteToWorldPosition(pos: WorldPosition, opts?: RouteOptions): Array<{
        exit: ExitConstant;
        room: string;
    }> | ERR_NO_PATH {
        return Game.map.findRoute(this.getRoomName(), pos.getRoomName(), opts);
    }

    /**
     * @param {RoomPosition} pos
     * @param {FindPathOpts} opts
     */
    findPathToWorldPosition(pos: WorldPosition, opts?: FindPathOpts): PathFinderPath {
        let src = this.toRoomPosition();
        let dst = pos.toRoomPosition();
        return PathFinder.search(src, dst, opts);
    }

    /**
     * @param {WorldPosition[]} arr - array of other world positions to compare
     */
    findClosestByRange(arr: WorldPosition[]): WorldPosition {
        return _.min(arr, p => this.getRangeTo(p.toRoomPosition()));
    }

    /**
     * @param {WorldPosition[]} arr - array of other world positions to compare
     * @param {number} range
     */
    findInRange(arr: WorldPosition[], range: number): WorldPosition[] {
        return _.filter(arr, p => this.getRangeTo(p.toRoomPosition()) <= range);
    }

    /** @returns {string} - name of the room this point belongs to */
    getRoomName(): string {
        let [x, y] = [Math.floor(this.x / 50), Math.floor(this.y / 50)];
        let result = "";
        result += x < 0 ? "W" + String(~x) : "E" + String(x);
        result += y < 0 ? "N" + String(~y) : "S" + String(y);
        return result;
    }

    /** @returns {boolean} - do we have visibility in the room this point belongs to? */
    isVisible(): boolean {
        let name = this.getRoomName();
        return Game.rooms[name] !== undefined;
    }

    /** @returns {boolean} - is this room part of the highways between sectors? */
    isHighway(): boolean {
        let roomName = this.getRoomName();
        let parsed = roomName.match(/^[WE]([0-9]+)[NS]([0-9]+)$/);
        if (parsed === null) return false;
        return Number(parsed[1]) % 10 === 0 || Number(parsed[2]) % 10 === 0;
    }

    /** @returns {boolean} - do I own this point in space? */
    isMine(): boolean {
        let roomName = this.getRoomName();
        return _.get(Game.rooms, roomName + ".controller.my", false);
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
        return this.x + "_" + this.y;
    }

    /**
     * @param {string} str
     */
    static deserialize(str: string): WorldPosition {
        let [x, y] = str.split("_");
        return new WorldPosition(Number(x), Number(y));
    }

    /** [object WorldPosition] */
    get [Symbol.toStringTag](): string {
        return "WorldPosition";
    }

    /**
     * @param {RoomPosition} roomPos
     * @returns {WorldPosition}
     */
    static fromRoomPosition(roomPos: RoomPosition): WorldPosition {
        let { x, y, roomName } = roomPos;
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
}

export default WorldPosition;
