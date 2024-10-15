/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('proto.roomPosition');
 * mod.thing == 'a thing'; // true
 */

import logger from "shared/utils/logger";
let logger_local = new logger("proto.roomPosition");
import WorldPosition from "shared/utils/map/WorldPosition";

declare global {
    interface RoomPosition {
        getSurroundingSpaces():Array<RoomPosition>;
        getSurroundingClearSpaces():Array<RoomPosition>;
        isClearSpace():boolean;
        isBlocked():false|LookAtResult;
        isEdge():boolean;
        toWorldPosition():WorldPosition;
        moveInDir(dir: number|string): RoomPosition;

    }
}
function clampRoomPosition(x: number, y: number): object {
    return {
        x: Math.min(49, Math.max(0, x)),
        y: Math.min(49, Math.max(0, y))
    };
}

export function serializePath(path: RoomPosition[]): string {
    return path.map(p => `${p.x}:${p.y}:${p.roomName}`).join(',');
}
export function deserializePath(path: string): RoomPosition[] {
    return path.split(',').map(p => {
        let [x, y, roomName] = p.split(':');
        return new RoomPosition(Number(x), Number(y), roomName);
    });
}

RoomPosition.prototype.moveInDir = function(dir: number|string): RoomPosition {
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
    let clamped = clampRoomPosition(newX, newY);
    //@ts-ignore
    newX = clamped.x;
    //@ts-ignore
    newY = clamped.y;
    // Handle room transitions
    let newRoom = this.roomName;
    let match = this.roomName.match(/^([WE])(\d+)([NS])(\d+)$/);
    if (match) {
        let [, horizontalDir, horizontalNum, verticalDir, verticalNum] = match;

        // Handle horizontal room transition
        if (newX < 0) {
            newX = 49;
            horizontalNum = String(Number(horizontalNum) + (horizontalDir === 'E' ? -1 : 1));
            horizontalDir = horizontalDir === 'E' ? 'W' : 'E';
        } else if (newX > 49) {
            newX = 0;
            horizontalNum = String(Number(horizontalNum) + (horizontalDir === 'E' ? 1 : -1));
            horizontalDir = horizontalDir === 'E' ? 'E' : 'W';
        }

        // Handle vertical room transition
        if (newY < 0) {
            newY = 49;
            verticalNum = String(Number(verticalNum) + (verticalDir === 'N' ? -1 : 1));
            verticalDir = verticalDir === 'N' ? 'S' : 'N';
        } else if (newY > 49) {
            newY = 0;
            verticalNum = String(Number(verticalNum) + (verticalDir === 'N' ? 1 : -1));
            verticalDir = verticalDir === 'N' ? 'N' : 'S';
        }

        newRoom = `${horizontalDir}${horizontalNum}${verticalDir}${verticalNum}`;
    }
    return new RoomPosition(newX, newY, newRoom);
}

RoomPosition.prototype.getSurroundingSpaces = function() {
    return [
        new RoomPosition(this.x+1, this.y, this.roomName),
        new RoomPosition(this.x+1, this.y-1, this.roomName),
        new RoomPosition(this.x+1, this.y+1, this.roomName),

        new RoomPosition(this.x-1, this.y, this.roomName),
        new RoomPosition(this.x-1, this.y-1, this.roomName),
        new RoomPosition(this.x-1, this.y+1, this.roomName),

        new RoomPosition(this.x, this.y+1, this.roomName),
        new RoomPosition(this.x, this.y-1, this.roomName),
        ];
}
RoomPosition.prototype.getSurroundingClearSpaces = function() {
    let spots = this.getSurroundingSpaces();
	let clearSpots = [];
	//logger.log('getClearSpots', this)
    for(let s in spots) {
        let spot = spots[s];
        if (spot.isClearSpace()) {
            clearSpots.push(spot);
        }
    }
    //logger.log(JSON.stringify(clearSpots));

    //global.no();
    return clearSpots;
}
RoomPosition.prototype.isClearSpace = function() {
    if (!Game.rooms[this.roomName]) {
		return true;
	}
    let allTheShit = this.look();
    let isClearSpace = true;
	//logger.log('---', this);
    for(let i in allTheShit) {
        let shit = allTheShit[i];
        //logger.log("the shit:", shit.type, shit.terrain);

        if (shit.type == "terrain" && shit.terrain == "wall") {
            isClearSpace = false;
        }
        if (shit.type == "structure" && shit.structure && ["rampart", "container", "road"].indexOf(shit.structure.structureType) == -1 ) {
            isClearSpace = false;
        }
        if (shit.type == "source") {
            isClearSpace = false;
        }
        if (isClearSpace === false) {
            break;
        }

    }
    //logger.log(isClearSpace ? "clear" : "not clear", "the shit:", shit.type, JSON.stringify(shit));
    return isClearSpace;
}
RoomPosition.prototype.isBlocked = function() {
    if (!Game.rooms[this.roomName]) {
        return {type: "terrain", terrain: "wall"};
    }
    let allTheShit = this.look();
    let isClearSpace = true;
    //logger.log('---')
    for(let i in allTheShit) {
        let shit = allTheShit[i];
        //logger.log("the shit:", shit.type, shit.terrain);

        if (shit.type == "terrain" && shit.terrain == "wall") {
            isClearSpace = false;
        }
        if (shit.type == "structure" && shit.structure && ["rampart", "container"].indexOf(shit.structure.structureType) == -1 ) {
            isClearSpace = false;
        }
        if (shit.type == "source") {
            isClearSpace = false;
		}
		if (shit.type == "creep") {
			isClearSpace = false;
		}
        if (isClearSpace === false) {
            return shit;
        }
        //logger.log(isClearSpace, "the shit:", shit.type, shit.terrain);
    }

    return false;
}

RoomPosition.prototype.isEdge = function() {
	return this.x == 0 || this.y == 0 || this.x == 49 || this.y == 49;
}

Object.defineProperty(RoomObject.prototype, "wpos", {
    get: function () {
		if(!this._wpos)
			this._wpos = WorldPosition.fromRoomPosition(this.pos);
		return this._wpos;
    },
	configurable: true,
	enumerable: false
});

RoomPosition.prototype.toWorldPosition = function(this: RoomPosition): WorldPosition {
    // @ts-ignore: _wpos property doesn't exist on type 'RoomPosition'
    if (!this._wpos) {
        // @ts-ignore: _wpos property doesn't exist on type 'RoomPosition'
        this._wpos = WorldPosition.fromRoomPosition(this);
    }
    // @ts-ignore: _wpos property doesn't exist on type 'RoomPosition'
    return this._wpos;
}

