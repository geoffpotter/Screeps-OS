/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('tasks.taskOptIn');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("tasks.taskOptIn");


class TaskOptIn {
    constructor(taskNames, maxRange = 50, useBiggestTask = false, searchData = false, filter = false) {
        if (!_.isArray(taskNames)) {
            taskNames = [taskNames];
        }
        this.taskNames = taskNames;
        this.maxRange = maxRange;
        this.useBiggestTask = useBiggestTask;
        this.searchData = searchData;
        this.filter = filter;

    }
    
    findTask(taskManager, creep, pos = false) {
		
        let task = taskManager.getTaskFromOptIn(creep, this, pos);
        return task;
    }
    
    //getTaskByNameAndLoc(name, creep, range = 50, useBiggestTask = false, pos = false) {
    //getTaskByNameAndData(name, data, fields=[]) {
}
global.TaskOptIn = TaskOptIn;
module.exports = Task;