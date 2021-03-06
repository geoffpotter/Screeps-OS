/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('pr.role.miner');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("pr.role.miner");
logger.enabled = false;
let processClass = require("INeRT.process");
let threadClass = require("INeRT.thread");
let worker = require("pr.role.worker");

class minerProc extends worker {
    init() {
        super.init();
		logger.log("in miner", this.kernel)
		this.taskManager = this.kernel.getProcess('taskManager');
        let defaultRange = 50;
        //constructor(taskNames, maxRange = 50, useBiggestTask = false, searchData = false, filter = false) {

        
        this.enabledEnergyTasks = [
            new global.TaskOptIn(global.Task.MINING, defaultRange, false), //source id will be added in overridden findTask func
        ];
        this.enabledWorkTasks = [
            new global.TaskOptIn([global.Task.BUILD, global.Task.REPAIR], 3, true),
        ];
        

        this.allowRefils = false;
        this.creepClass = "miner";
        this.creepRole = "miner";
        this.spawnPriority = 2;
        this.requiredParts = {
            WORK:7
        };
        
        this.priorityIncresePerCreep = 1;
    }
    
    findTask(creep) {
        if (!creep.memory.working) {
            let taskSourceId = this.data.sourceId;
            logger.log(creep, taskSourceId)
            if (taskSourceId === false || taskSourceId.indexOf("-") !== -1) {
                taskSourceId = `${this.data.pos.x}-${this.data.pos.y}-${this.data.pos.roomName}`
            }
            
            //logger.log(this.data.sourceId, taskSourceId)
            let task = this.taskManager.getTaskByNameAndData(Task.MINING, {"sourceId":taskSourceId});
            if(task.assignCreep) {
                task.assignCreep(creep)
            }
            logger.log(creep, "got energy task", task);
            return task;
        } else {
            //find doWork task
            for(let i in this.enabledWorkTasks) {
                let taskOptIn = this.enabledWorkTasks[i];
                let task = taskOptIn.findTask(this.taskManager, creep, creep.pos);
                
                
                logger.log("found work task", task);
                if (task) {
                    task.assignCreep(creep)
                    return task;
                }
            }
        }
        
    }
    
    noTask(creep) {
        let sourceProc = this.kernel.getProcess("source-" + this.data.sourceId);
        //drop everything?
        //for(let r in creep.carry) {
        if (sourceProc.cont) {
            creep.transfer(sourceProc.cont, RESOURCE_ENERGY);
        } else {
            creep.drop(RESOURCE_ENERGY);
        }
            
        //}
    }
    
    creepNeedsMet() {
        let res = super.creepNeedsMet();
        if (!res) {
            let source = Game.getObjectById(this.data.sourceId);
            if (source && this.creeps.length >= source.pos.getSurroundingClearSpaces().length) {
                res = true;
            }
        }
        return res;
    }
}



module.exports = minerProc;