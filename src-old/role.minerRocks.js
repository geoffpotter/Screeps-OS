/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.minerRocks');
 * mod.thing == 'a thing'; // true
 */


var logger = require("screeps.logger");
logger = new logger("role.minerRocks");

var obj = function() {
}
var base = require('role.base');
obj.prototype = new base();


global.utils.extendFunction(obj, "init", function(name, roomManager) {
    this.__init(name, roomManager);
//logger.log("---------------------------------------init", roomManager, sourceLoc)
    this.sourceContainer = false;
    this.minerCreepId = false;
    this.minerCreep = false;
    
    this.extractor = false;
    this.mineral = false;
    
}, "__");


global.utils.extendFunction(obj, "tickInit", function() {
    if (this.roomManager.visibility) {
        this.extractor = this.roomManager.room.find(FIND_STRUCTURES, {filter:function(s) {return s.structureType == STRUCTURE_EXTRACTOR}})[0];
        if (this.extractor) {
            //logger.log(JSON.stringify(this.extractor))
            this.sourceContainer = this.extractor.getContainer();
            this.mineral = this.roomManager.room.find(FIND_MINERALS)[0];
        }
    }
    if (!this.extractor) {
        return;
    }
    
    
    this.minerCreep = Game.creeps[this.minerCreepId];
    
    //logger.log("num", this.roomManager.roomName, this.minerCreep, this.extractor == undefined, this.mineral, this.mineral.amount)
    if (!this.minerCreep && this.extractor && this.mineral.mineralAmount > 0) {
        //we don't have a creep!  spawn one dem mofos
        this.minerCreepId = false;
        var mem = false;
        if (this.homeOverride) {
            mem = {
                home: this.homeOverride
            }
        }
        var minBodies = 0;
        // if (this.roomManager.room.energyCapacityAvailable >= 600) {
        //     minBodies = 2;
        // }
        
        var priority = 1;
        if (this.numCreeps == 0)
            priority = 1;
        var req = global.utils.makeCreepRequest(this.name, "minerCreepId", [WORK, WORK, MOVE], [WORK, WORK, WORK, MOVE], priority, mem, 3, minBodies)
        
        this.roomManager.requestCreep(req);
    }

}, "__");

global.utils.extendFunction(obj, "tick", function() {
    if (this.minerCreep && this.extractor) {
        if (this.mineral.amount == 0) {
            this.minerCreep.suicide();
        }
        //logger.log('----------------------------here?',this.minerCreepId, this.minerCreep.pos.isNearTo(this.sourceLoc.x, this.sourceLoc.y), this.sourceLoc.x, this.sourceLoc.y)
        var targetPos = this.extractor.pos;
        if (this.sourceContainer) {
            targetPos = this.sourceContainer.pos;
        }

        if (!this.minerCreep.pos.isNearTo(targetPos)) {
            //logger.log(this.minerCreep, "moving to", JSON.stringify(targetPos))
            global.utils.moveCreep(this.minerCreep, targetPos);
            
        } else {
            //logger.log('here??>>>')
            if (this.sourceContainer) {
                if (this.sourceContainer.pos != this.minerCreep.pos) {
                    //logger.log("==-=-=",this.sourceContainer.pos, this.minerCreep)
                    global.utils.moveCreep(this.minerCreep, this.sourceContainer.pos);
                }
                
            } else {
                //logger.log('this moving?', JSON.stringify(targetPos))
                global.utils.moveCreep(this.minerCreep, targetPos);
            }
            var res = this.minerCreep.harvest(this.mineral);
        }
    }
}, "__");

global.utils.extendFunction(obj, "tickEnd", function() {
}, "__");



module.exports = obj;