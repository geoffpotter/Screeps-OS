/*
 * Module code goes here. Use 'module.export const to export things:
 * module.export constthing = 'a thing';
 *
 * You can import it from another modules like this:
 * import mod  from "tasks.taskOptIn";
 * mod.thing == 'a thing'; // true
 */

import logger_import from "./screeps.logger";
let logger = new logger_import("tasks.taskOptIn");


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
export default TaskOptIn;