/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('pr.role.worker');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("pr.role.worker");
logger.enabled = false;
let processClass = require("INeRT.process");
let threadClass = require("INeRT.thread");
let baseRole = require("pr.role.base");
/*    
    static get MINING() { return "mining" }
    static get PRAISE() { return "praise" }
    static get PICKUP() { return "pickup" }
    static get FILLSPAWNS() { return "fillSpawns" }
    */
    
    //constructor(taskNames, maxRange = 50, minAmount = false, useBiggestTask = false, searchData = false) {

class workerProc extends baseRole {
    
    init() {
        super.init();
        let defaultRange = 75;
        this.enabledEnergyTasks = [
            //new global.TaskOptIn([global.Task.PICKUP, global.Task.PICKUPATCONTROLLER, global.Task.PICKUPENERGYCONT], 10, false),
            new global.TaskOptIn([global.Task.PICKUP, global.Task.PICKUPATCONTROLLER, global.Task.PICKUPENERGYCONT], defaultRange, false),
            new global.TaskOptIn(global.Task.MINING, defaultRange, false),
        ];
        this.enabledWorkTasks = [
            new global.TaskOptIn(global.Task.FILLTOWERS, 25, false),
            new global.TaskOptIn(global.Task.FEEDSPAWNS, 25, false),
            new global.TaskOptIn(global.Task.FILLSPAWNS, 25, false),
            new global.TaskOptIn([global.Task.BUILD, global.Task.REPAIR], 25, false),
            new global.TaskOptIn(global.Task.FILLTOWERS, defaultRange, false),
            new global.TaskOptIn(global.Task.FEEDSPAWNS, defaultRange, false),
            new global.TaskOptIn(global.Task.FILLSPAWNS, defaultRange, false),
            //new global.TaskOptIn(global.Task.FEEDUPGRADERS, defaultRange, false),
            new global.TaskOptIn([global.Task.BUILD, global.Task.REPAIR], defaultRange, false),
            new global.TaskOptIn(global.Task.PRAISE, defaultRange, false),
        ];
        
        this.allowRefils = true;
        
        if (!this.requiredParts) {
            this.requiredParts = {
                WORK:5
            };
        }
        this.creepClass = this.data.creepClass ? this.data.creepClass : "worker";
        this.creepRole = "worker";
        this.spawnPriority = 1;
        this.requiredParts = {
            WORK:5
        };
    }

}



module.exports = workerProc;