/** 
 * 
 * 
 */
import logger_import from "./screeps.logger";
let logger = new logger_import("jobs.all");

import general from "./jobs.general";
//import gather  from "jobs.gather";
//import work  from "jobs.work";
//import work  from "tasks.work";

let all = {};

let groups = [
  general,
  //gather,
  //work
];

for (let i in groups) {
  let group = groups[i];
  for (let taskName in group) {
    let taskClass = group[taskName];
    //profiler.registerClass(taskClass, taskName)
    all[taskName] = taskClass;
  }
}

export let jobs = all;