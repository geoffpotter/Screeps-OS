/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('pr.role.upgrader');
 * mod.thing == 'a thing'; // true
 */


var logger = require("screeps.logger");
logger = new logger("pr.role.upgrader");

let processClass = require("INeRT.process");
let threadClass = require("INeRT.thread");
let worker = require("pr.role.worker");

class upgrader extends worker {
    init() {
        super.init();
        let defaultRange = 50;
        this.enabledEnergyTasks = [
            
            new global.TaskOptIn([global.Task.PICKUPENERGYCONTROLLER,global.Task.PICKUPATCONTROLLER], defaultRange, false),
            new global.TaskOptIn([global.Task.PICKUP, global.Task.PICKUPENERGYCONT], defaultRange, false),
            new global.TaskOptIn(global.Task.MINING, defaultRange, false),
        ];
        this.enabledWorkTasks = [
            new global.TaskOptIn(global.Task.PRAISE, defaultRange, false),
        ];
        
        this.creepClass = "builder";
        this.creepRole = "upgrader";
        this.spawnPriority = 10;
        this.requiredParts = {
            WORK:20
        };
    }
    
}



module.exports = upgrader;