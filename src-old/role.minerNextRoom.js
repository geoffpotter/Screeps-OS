/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.minerNextRoom');
 * mod.thing == 'a thing'; // true
 */


var logger = require("screeps.logger");
logger = new logger("role.minerNextRoom");
logger.enabled = false;

var obj = function() {
}
var base = require('role.base');
obj.prototype = new base();


global.utils.extendFunction(obj, "init", function(name, homeRoomManager, sourceLoc, homeOverride) {
    this.__init(name, homeRoomManager);
    this.homeRoomManager = homeRoomManager;
    this.sourceLoc = {x:sourceLoc.x, y:sourceLoc.y, roomName:sourceLoc.roomName};
    this.source = false;
    this.homeOverride = homeOverride;
//logger.log("---------------------------------------init", roomManager, sourceLoc)
    this.sourceContainer = false;
    this.minerCreepId = false;
    this.minerCreep = false;
    this.dangerZone = false;

    
}, "__");


global.utils.extendFunction(obj, "tickInit", function() {
    //get the source object
    
//logger.log("-----------",this.sourceLoc, this.sourceLoc.x);
    
    this.minerCreep = Game.creeps[this.minerCreepId];
    
    //logger.log("num", this.name, this.minerCreep, this.homeOverride, this.roomManager)
    if (!this.minerCreep) {
        
        //we don't have a creep!  spawn one dem mofos
        this.minerCreepId = false;
        var mem = false;
        if (this.homeOverride) {
            mem = {
                home: this.homeOverride
            }
        }
        var minBodies = 1;
        if (this.visibility && this.roomManager.room.controller.level > 4) {
            minBodies = 2;
        }
        
        var priority = 1;
        if (this.numCreeps == 0)
            priority = 11;
        var req = global.utils.makeCreepRequest(this.name, "minerCreepId", [WORK, WORK, CARRY, MOVE], [WORK, WORK, WORK, MOVE, MOVE], priority, mem, 3, minBodies)
        logger.log('requesting creep', this.visibility, this.roomManager.roomName)
        global.empire.requestHelperCreep(this.roomManager.roomName, req);
    }
    

    
    if (Game.rooms[this.sourceLoc.roomName] && (!this.source || !this.sourceContainer)) {
        var room = Game.rooms[this.sourceLoc.roomName];
        
        //logger.log(room, this.sourceLoc, this.sourceLoc.x);
        var source = room.lookForAt(LOOK_SOURCES, this.sourceLoc.x, this.sourceLoc.y);
        if (source.length) {
            this.source = source[0];
            this.sourceContainer = this.source.getContainer();
        } else {
            logger.log("ain't no source here fool.. ", this.sourceLoc);
        }
    }
}, "__");

global.utils.extendFunction(obj, "tick", function() {
    if (this.minerCreep) {
        
        //logger.log('here?',this.minerCreepId, this.minerCreep.pos.isNearTo(this.sourceLoc.x, this.sourceLoc.y), this.sourceLoc.x, this.sourceLoc.y)
        var targetPos = this.sourceLoc;
        // if (this.sourceContainer && !this.minerCreep.pos.isNearTo(this.sourceContainer)) {
        //     if (this.sourceContainer.pos != this.minerCreep.pos) {
        //         //logger.log("==-=-=",this.sourceContainer.pos, this.minerCreep)
        //         targetPos = this.sourceContainer.pos;
        //     }
            
        //}
        //logger.log(this.minerCreep.name, targetPos)
        if (!this.dangerZone || !this.minerCreep.flee(5)) {
            if (!this.minerCreep.pos.isNearTo(new RoomPosition(targetPos.x, targetPos.y, targetPos.roomName))) {
                var opts = {
                    keepFromHostiles:5,
                    ignoreCreeps:false
                }
                if (this.minerCreep.name =="miner-4")
                    console.log("------", this.name, JSON.stringify(this.sourceLoc), JSON.stringify(targetPos))
                global.utils.moveCreep(this.minerCreep, targetPos, opts);
                
            } else {
                
                
                if (this.minerCreep.memory.mining && this.minerCreep.full()) {
                    this.minerCreep.memory.mining = false;
                }
                if (this.minerCreep.empty()) {
                    this.minerCreep.memory.mining = true;
                }
                if (this.minerCreep.memory.mining) {
                    var pickUpEnergy = false
                    
                    //if there's a site around us, then add pickup energy into the get energy stack
                    var site = this.minerCreep.pos.findInRange(FIND_MY_CONSTRUCTION_SITES, 3);
                    if (site.length > 0) {
                        pickUpEnergy = true;
                    }
                    //logger.log(this.minerCreep.name, "mining", pickUpEnergy, JSON.stringify(site))
                    if (!pickUpEnergy || !this.minerCreep.pickupEnergy(true)) {
                        var res = this.minerCreep.harvest(this.source);
                    }
                    
                } else {
                    if (!this.minerCreep.doConstruction(true, true)) {
                        //logger.log(this.minerCreep.name, "no const")
                        if (!this.minerCreep.doRepair(true, true)) {
                            if (!this.minerCreep.stashEnergyInSourceContainers(true)) {
                                this.minerCreep.dropAll();
                            }
                        }
                    }
                }
            
                
            }
        }
    }
}, "__");

global.utils.extendFunction(obj, "tickEnd", function() {
}, "__");



module.exports = obj;