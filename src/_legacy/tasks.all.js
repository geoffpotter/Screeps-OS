/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('tasks.all');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("tasks.all");

var gathering = require("tasks.gathering");
var work = require("tasks.work");

let all = {};

let groups = [
    gathering,
    work
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