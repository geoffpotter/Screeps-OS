/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('pr.role.transporter');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("pr.role.transporter");

let processClass = require("INeRT.process");
let threadClass = require("INeRT.thread");
let worker = require("pr.role.worker");

class transporter extends worker {
    init() {
        super.init();
        this.allowRefils = false;
        let defaultRange = 300;
        this.enabledEnergyTasks = [
            new global.TaskOptIn(global.Task.PICKUP, defaultRange, true),
            new global.TaskOptIn(global.Task.PICKUPENERGYCONT, defaultRange, true),
        ];
        this.enabledWorkTasks = [
            
            new global.TaskOptIn(global.Task.FEEDSPAWNS, defaultRange, false),
            new global.TaskOptIn(global.Task.FEEDUPGRADERS, defaultRange, false),
            new global.TaskOptIn(global.Task.DELIVERENERGY, defaultRange, true),
            new global.TaskOptIn(global.Task.FILLSPAWNS, defaultRange, false),
        ];
        
        this.creepClass = "transporter";
        this.creepRole = "transporter";
        this.spawnPriority = 4;
        this.requiredParts = {
            CARRY:10
        };
        this.priorityIncresePerCreep = 3;
    }
}



module.exports = transporter;