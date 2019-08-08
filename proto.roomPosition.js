/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('proto.roomPosition');
 * mod.thing == 'a thing'; // true
 */
var logger = require("screeps.logger");
logger = new logger("proto.roomPosition");
RoomPosition.prototype.getDefcon = function() {
    if(!Memory.rooms[this.roomName]) return 0;
    let defcon = Memory.rooms[this.roomName].intel.defcon;
    return defcon || 0;
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
    //logger.log('---')
    for(let i in allTheShit) {
        let shit = allTheShit[i];
        //logger.log("the shit:", shit.type, shit.terrain);
        
        if (shit.type == "terrain" && shit.terrain == "wall") {
            isClearSpace = false;
        }
        if (shit.type == "structure" && ["rampart", "container"].indexOf(shit.structure.structureType) == -1 ) {
            isClearSpace = false;
        }
        if (shit.type == "source") {
            isClearSpace = false;
        }
        if (isClearSpace === false) {
            break;
        }
        //logger.log(isClearSpace, "the shit:", shit.type, shit.terrain);
    }
    
    return isClearSpace;
}




//----------------------- World position --------------------------
/**
 * Uniform screep's world position with E0S0 as origin.
 */
'use strict';
class WorldPosition
{
	/** @property int x */
	/** @property int y */
	
	/**
	 * @params {Object} point
	 * @params {number} point.x - world position x (-3025 to 3025)
	 * @params {number} point.y - world position y (-3025 to 3025)
	 */
	constructor(x,y) {
		this.x = x;
		this.y = y;
		Object.seal(this);
	}
	
	/**
	 * @params {Object} point
	 * @params {number} point.x
	 * @params {number} point.y
	 */
	getRangeTo(point) {
	    let pos=point;
	    if (point.pos) {
	        pos = point.pos.toWorldPosition();
	    } else if (point instanceof RoomPosition) {
	        pos = point.toWorldPosition();
	    }
	    
	    //logger.log(JSON.stringify(pos), JSON.stringify(pos))
		return this.getRangeToXY(pos.x, pos.y);
	}

	moveInDir(dir) {
		dir = Number(dir)
		//logger.log('h', JSON.stringify(dir), JSON.stringify(global.utils.map.directionToDxDy(dir)));
		let dx, dy = 0;
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
                [dx, dy] = [false, false];
				break;
		}
		// if (dx === false && dy === false) {
		// 	logger.log("invalid direction!!", dir);
		// }
		// logger.log('1', this.x, dx)
		let newX = this.x + dx;
		//logger.log('2', this.y, dy)
		let newY = this.y + dy;
		//logger.log('3', newX, newY)
		return new WorldPosition(newX, newY);
	}

	/**
	 * @params {number} x
	 * @params {number} y
	 */
	getRangeToXY(x,y) {
		return this.getChebyshevDist(x,y);
	}
	
	inRangeTo(point, range) {
		return this.inRangeToXY(point.x, point.y, range);
	}
	
	inRangeToXY(x,y,range) {
		return (this.getRangeToXY(x,y) <= range);
	}
	
	getDirectionTo(point) {
		return this.getDirectionToXY(point.x, point.y);
	}
	
	/**
	 * @params {number} x - world coordinate x
	 * @params {number} y - world coordinate y
	 *   ..don't question it. don't even think about it.
	 */
	getDirectionToXY(x,y) {
		let [dx,dy] = [x - this.x, y - this.y];		
		let arc = Math.atan2(dy, dx) * (180 / Math.PI);		
		let dir = Math.round((arc / 45) + 3);		
		return (dir == 0)?8:dir;
	}
	
	findRouteToWorldPosition(pos, opts) {
		return Game.map.findRoute(this.getRoomName(), pos.getRoomName(), opts);
	}
	
	findPathToWorldPosition(pos, opts) {
		let src = this.toRoomPosition();
		let dst = pos.toRoomPosition();
		return PathFinder.search(src, dst, opts);
	}
	
	/**
	 * @params [WorldPosition] - array of other world positions to compare
	 */
	findClosestByRange(arr) {
		return _.min(arr, p => this.getRangeTo(p));
	}
	
	/**
	 * @params [WorldPosition] - array of other world positions to compare
	 */
	findInRange(arr, range) {
		return _.filter(arr, p => this.getRangeTo(p) <= range);
	}
	
	/** @returns String - name of the room this point belongs to */
	getRoomName() {
		let [x,y] = [Math.floor(this.x / 50), Math.floor(this.y / 50)]
		var result = "";
		result += (x < 0 ? "W" + String(~x) : "E" + String(x));
		result += (y < 0 ? "N" + String(~y) : "S" + String(y));
		return result;
	}
		
	/** @returns boolean - do we have visibility in the room this point belongs to? */
	isVisible() {
		let name = this.getRoomName();
		return (Game.rooms[name] !== undefined);			
	}
	
	/** @returns boolean - is this room part of the highways between sectors? */
	isHighway() {
		let roomName = this.getRoomName();
		let parsed = roomName.match(/^[WE]([0-9]+)[NS]([0-9]+)$/);
		return (parsed[1] % 10 === 0) || (parsed[2] % 10 === 0);
	}
	
	/** @returns boolean - do I own this point in space? */
	isMine() {
		let roomName = this.getRoomName();
		return _.get(Game.rooms, roomName + '.controller.my', false);
	}
	
	/** Distance functions */

	/**
	 * @params {Object} point
	 * @params {number} point.x
	 * @params {number} point.y
	 */
	getEuclidDist(pos) {			
		return Math.hypot( pos.x - this.x, pos.y - this.y );
	}
	
	/**
	 * @params {Object} point
	 * @params {number} point.x
	 * @params {number} point.y
	 */
	getManhattanDist(pos) {
		return Math.abs(pos.x - this.x) + Math.abs(pos.y - this.y);
	}
	
	// yeah. and with that, it'll give you the correct distance of diagonals, whereas manhattan won't consider that.
	/**
	 * @params {Object} point
	 * @params {number} point.x
	 * @params {number} point.y
	 */
	getChebyshevDist(x,y) {
		return Math.max( Math.abs((x-this.x)), Math.abs((y-this.y)) );
	}	
	
	/** serialization */
	serialize() {
		return this.x + "_" + this.y;
	}
	
	static deserialize(str) {
		let [x,y] = str.split('_');
		return new WorldPosition(x,y);
	}
	
	/** [object WorldPosition] */
	get [Symbol.toStringTag]() {
		return 'WorldPosition';
	}
	
	
	/**
	 * @params {RoomPosition} roomPos
	 * @params {number} roomPos.x
	 * @params {number} roomPos.y
	 * @params {String} roomPos.roomName
	 * @returns {WorldPosition}
	 */
	static fromRoomPosition(roomPos) {		
		let {x,y,roomName} = roomPos;
		if(!_.inRange(x, 0, 50)) throw new RangeError('x value ' + x + ' not in range');
		if(!_.inRange(y, 0, 50)) throw new RangeError('y value ' + y + ' not in range');
		if(roomName == 'sim') {
		    return new WorldPosition(x, y);
		}
		let [name,h,wx,v,wy] = roomName.match(/^([WE])([0-9]+)([NS])([0-9]+)$/);
		if(h == 'W') wx = ~wx;
		if(v == 'N') wy = ~wy;				
		return new WorldPosition( (50*wx)+x, (50*wy)+y );
	}
		
	toRoomPosition() {		
		let [rx,x] = [Math.floor(this.x / 50), this.x % 50];
		let [ry,y] = [Math.floor(this.y / 50), this.y % 50];	
		if( rx < 0 && x < 0 ) x = (49 - ~x);
		if( ry < 0 && y < 0 ) y = (49 - ~y);		
		return new RoomPosition(x,y,this.getRoomName());
	}		
		
	/** [world pos 1275,1275] */
	toString() {
		return "[world pos " + this.x + "," + this.y + "]";
	}		
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

RoomPosition.prototype.toWorldPosition = function() {
	if(!this._wpos)
			this._wpos = WorldPosition.fromRoomPosition(this);
	return this._wpos;
}

global.WorldPosition = WorldPosition;
module.exports = WorldPosition;

