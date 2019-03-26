/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('pr.obj.structure');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("pr.obj.structure");

let processClass = require("INeRT.process");
let threadClass = require("INeRT.thread");

 
class structureProc extends processClass {
    init() {
        this.taskManager = this.kernel.getProcess('taskManager');

    }
    
    initThreads() {
        return [
            this.createThread("taskCreate", "taskCreate"),
            ];
    }
    
    taskCreate() {
        let struct = Game.getObjectById(this.data.structureId);
        if (!struct) {
            logger.log(this.name, "structure not there", this.data.structureId, struct);
            return;
        } 
        logger.log("loading struct", struct, this.data.structureId, this.parentName);
        this.repairTask = this.taskManager.createTask(this, global.Task.REPAIR, global.Task.TYPE_DOWORK, struct.pos, {"structureId":struct.id});
        if (struct.structureType == STRUCTURE_CONTAINER) {
            this.pickupContTask = this.taskManager.createTask(this, global.Task.PICKUPENERGYCONT, global.Task.TYPE_GETENERGY, struct.pos, {"targetId":struct.id});
            this.pickupSpawnTask = this.taskManager.createTask(this, global.Task.PICKUPENERGYSPAWN, global.Task.TYPE_GETENERGY, struct.pos, {"targetId":struct.id});
            this.pickupControllerTask = this.taskManager.createTask(this, global.Task.PICKUPENERGYCONTROLLER, global.Task.TYPE_GETENERGY, struct.pos, {"targetId":struct.id});
            
            //register tasks
            this.taskManager.setTask(this, this.pickupContTask);
            this.taskManager.setTask(this, this.pickupControllerTask);
            this.taskManager.setTask(this, this.pickupSpawnTask);
        }
        
        this.taskManager.setTask(this, this.repairTask);
        
        //start the update thread
        
        let updateThread = this.createThread("taskUpdate", "taskUpdate");
        this.kernel.startThread(updateThread);
        
        return threadClass.DONE;
    }
    
    taskUpdate() {
        let struct = Game.getObjectById(this.data.structureId);
        if(!struct) {
           return;
        }
        this.repairTask.amount = (struct.hitsMax - struct.hits)/100;
        //logger.log(struct, this.repairTask.amount, struct.hitsMax, struct.hits);
        if (this.repairTask.amount >= 5 || this.repairTask.amountAssigned > 0) {
            //this.taskManager.setTask(this, this.repairTask);
        }
        
        if (struct.structureType == STRUCTURE_CONTAINER) {
            let spawn = struct.pos.findInRange(FIND_MY_STRUCTURES, 1, {filter: (s) => s.structureType == STRUCTURE_SPAWN});
            let controller = struct.pos.findInRange(FIND_MY_STRUCTURES, 3, {filter: (s) => s.structureType == STRUCTURE_CONTROLLER});
            
            let energyInCont = struct.store.energy >= 0 ? struct.store.energy : 0;
            this.pickupContTask.amount = 0;
            this.pickupControllerTask.amount = 0;
            this.pickupSpawnTask.amount = 0;
            if (spawn.length == 0 && controller.length == 0) {
                this.pickupContTask.amount = energyInCont;
                //logger.log(struct, JSON.stringify(this.pickupContTask))
                //this.taskManager.setTask(this, this.pickupContTask);
            } else if( controller.length > 0) {
                this.pickupControllerTask.amount = energyInCont;
                //this.taskManager.setTask(this, this.pickupControllerTask);
            } else if (spawn.length > 0) {
                this.pickupSpawnTask.amount = energyInCont;
                //this.taskManager.setTask(this, this.pickupSpawnTask);
            }
        }
    }

    
  
    
}



module.exports = structureProc;