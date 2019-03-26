/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('pr.role.filler');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("pr.role.filler");

let processClass = require("INeRT.process");
let threadClass = require("INeRT.thread");
let worker = require("pr.role.worker");

class filler extends worker {
    init() {
        super.init();
        this.allowRefils = false;

        this.enabledEnergyTasks = [
            new global.TaskOptIn([global.Task.PICKUPENERGYSPAWN], 50, false),
            new global.TaskOptIn([global.Task.PICKUPENERGYCONT, global.Task.PICKUP], 50, false),
        ];
        this.enabledWorkTasks = [
            new global.TaskOptIn(global.Task.FILLSPAWNS, 50, false),
        ];
        
        this.creepClass = "filler";
        this.creepRole = "filler";
        this.spawnPriority = 3;
        this.requiredParts = {
            CARRY:5
        };
    }
}



module.exports = filler;