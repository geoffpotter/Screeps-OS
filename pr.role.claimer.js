/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('pr.role.claimer');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("pr.role.filler");

let processClass = require("INeRT.process");
let threadClass = require("INeRT.thread");

let baseRole = require("pr.role.base");
class claimer extends baseRole {
    init() {
        super.init();
        this.enabledEnergyTasks = [
        ];
        this.enabledWorkTasks = [
        ];
        
        this.creepClass = "claimer";
        this.creepRole = "claimer";
        this.spawnPriority = 2;
        this.requiredParts = {
            CLAIM:1
        };
        this.totalNeededParts = 1;
        this.totalParts = 0;
    }
    initTick() {
        super.initTick();
        this.requiredParts = {
            CLAIM:1
        };
    }
    run() {

        
        //handle working flag and refil task
        for(let c in this.creeps) {
            let creep = this.creeps[c];
            if (creep.spawning)
                return;
            let flag = Game.flags[this.data.flagName];
            logger.log(creep.name, "movin to", flag);
            if (global.creepActions.moveTo(creep, flag)) {
                creep.claimController(creep.room.controller);
                flag.remove();
            }
        }
        
        this.handleSpawning();
    }
}



module.exports = claimer;