/*
 * Module code goes here. Use 'module.export const to export things:
 * module.export constthing = 'a thing';
 *
 * You can import it from another modules like this:
 * import mod  from "tasks.all";
 * mod.thing == 'a thing'; // true
 */

import logger_import from "./screeps.logger";
let logger = new logger_import("tasks.all");

import gathering from "./tasks.gathering";
import work from "./tasks.work";

let all = {};

let groups = [
  gathering,
  work
];

for (let i in groups) {
  let group = groups[i];
  for (let taskName in group) {
    let taskClass = group[taskName];
    //profiler.registerClass(taskClass, taskName)
    all[taskName] = taskClass;
  }
}

export default all;