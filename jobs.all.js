/** 
 * 
 * 
*/
var logger = require("screeps.logger");
logger = new logger("jobs.all");

var general = require("jobs.general");
//var work = require("tasks.work");

let all = {};

let groups = [
    general
];

for(let i in groups) {
    let group = groups[i];
    for(let taskName in group) {
        let taskClass = group[taskName];
        profiler.registerClass(taskClass, taskName)
        all[taskName] = taskClass;
    }
}

module.exports = all;