/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('pr.role.builder');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("pr.role.builder");

let processClass = require("INeRT.process");
let threadClass = require("INeRT.thread");
let worker = require("pr.role.worker");

class builder extends worker {
    init() {
        super.init()
        //return;
        let defaultRange = 150;
        this.enabledEnergyTasks = [
            new global.TaskOptIn(global.Task.PICKUP, defaultRange, false),
            new global.TaskOptIn(global.Task.PICKUPENERGYCONT, defaultRange, false),
            new global.TaskOptIn(global.Task.MINING, defaultRange, false),
        ];
        this.enabledWorkTasks = [
            new global.TaskOptIn([global.Task.BUILD, global.Task.REPAIR], defaultRange * 3, false),
            new global.TaskOptIn(global.Task.FILLSPAWNS, defaultRange, false),
            new global.TaskOptIn(global.Task.FILLTOWERS, defaultRange, false),
            new global.TaskOptIn(global.Task.PRAISE, defaultRange, false),
        ];
        
        
        this.creepClass = "builder";
        this.creepRole = "builder";
        this.spawnPriority = 4;
        this.requiredParts = {
            WORK:5
        };
    }
    
}



module.exports = builder;