/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('pr.obj.pile');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("pr.obj.pile");

let processClass = require("INeRT.process");
let threadClass = require("INeRT.thread");


class pileProc extends processClass {
    init() {
        
        this.taskManager = this.kernel.getProcess('taskManager');
        
        let pile = Game.getObjectById(this.data.pileId);
        if (pile) {
            //(proc, name, type, pos, data) {
            this.task = this.taskManager.createTask(this, global.Task.PICKUP, global.Task.TYPE_GETENERGY, pile.pos, {"pileId":pile.id});
            this.taskController = this.taskManager.createTask(this, global.Task.PICKUPATCONTROLLER, global.Task.TYPE_GETENERGY, pile.pos, {"pileId":pile.id});
            
            this.taskManager.setTask(this, this.task);
            this.taskManager.setTask(this, this.taskController);
        }
    }
    initThreads() {
        return [
            this.createThread("taskUpdate", "taskUpdate"),
            ];
    }
    
    taskUpdate() {
        let pile = Game.getObjectById(this.data.pileId);

        if (pile) {
            let controller = pile.pos.findInRange(FIND_MY_STRUCTURES, 3, {filter: (s) => s.structureType == STRUCTURE_CONTROLLER});
            let source = pile.pos.findInRange(FIND_SOURCES, 1);
            
            this.task.amount = 0;
            this.taskController.amount = 0;
            
            let theTask = this.task;
            //logger.log()
            
            if (controller.length > 0 && source.length == 0) {
                theTask = this.taskController;
            }
            let type = pile.resourceType;
            theTask.data[type] = pile.amount;
            theTask.amount = pile.amount;
            //this.task.amountAssigned = 0;
            //this.taskManager.setTask(this, theTask);
        } else {
            this.task.amount = 0;
            this.taskController.amount = 0;
            logger.log("PILE DOESN'T EXIST")
            return threadClass.DONE;
        }
    }
    
}



module.exports = pileProc;