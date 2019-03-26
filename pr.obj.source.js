/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('pr.obj.source');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("pr.obj.source");

let processClass = require("INeRT.process");
let threadClass = require("INeRT.thread");


class sourceProc extends processClass {
    init() {
		this.taskManager = this.kernel.getProcess('taskManager');
        let dataPOS = new RoomPosition(this.data.pos.x, this.data.pos.y, this.data.pos.roomName);
        let sourceId = `${this.data.pos.x}-${this.data.pos.y}-${this.data.pos.roomName}`
        this.task = this.taskManager.createTask(this, global.Task.MINING, global.Task.TYPE_GETENERGY, dataPOS, {"sourceId":sourceId, "energy":1500});
        this.cont = false;
        this.openSpots = 5;
        this.refreshSpotsAndContainers();
        this.taskManager.setTask(this, this.task)
    }
    
    initThreads() {
        return [
            this.createThread("taskUpdate", "taskUpdate"),
            ];
    }
    taskUpdate() {
        let source = Game.getObjectById(this.data.sourceId);
        if (Game.time % 10 == 0) {
            this.refreshSpotsAndContainers();
        }
        //logger.log("---------------")
        //logger.log(this.data.pos.roomName, source, this.data.sourceId)
        if (this.data.sourceId) {
            this.task.data.sourceId = this.data.sourceId;
        }
        
        if (source) {
            this.task.data.energy = source.energy;
            this.task.amount = source.energy == 0 ? 0 : this.openSpots;
        } else {
            this.task.data.energy = 1500;
            this.task.amount = this.openSpots;
        }
    }
    refreshSpotsAndContainers() {
        let source = Game.getObjectById(this.data.sourceId);
        if (source) {
            let conts = source.pos.findInRange(FIND_STRUCTURES, 1, {filter: (s) => s.structureType == STRUCTURE_CONTAINER});
            if (conts.length > 0)
                this.cont = conts[0]
                
            //find open spaces
            let spaces = source.pos.getSurroundingClearSpaces();
            this.openSpots = spaces.length;
            this.task.data.sourceId = source.id;
        }
    }

}



module.exports = sourceProc;