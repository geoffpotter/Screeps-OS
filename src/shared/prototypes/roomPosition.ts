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
        if (shit.type == "structure" && shit.structure && ["rampart", "container"].indexOf(shit.structure.structureType) == -1 ) {
            isClearSpace = false;
        }
        if (shit.type == "source") {
            isClearSpace = false;
		}
		if (shit.type == "creep") {
			isClearSpace = false;
		}
        if (isClearSpace !== true) {
            break;
        }
        //logger.log(isClearSpace, "the shit:", shit.type, shit.terrain);
    }

    return isClearSpace;
}

RoomPosition.prototype.isEdge = function() {
	return this.x == 0 || this.y == 0 || this.x == 49 || this.y == 49;
}

let WorldPosition = require("util.worldposition")



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

