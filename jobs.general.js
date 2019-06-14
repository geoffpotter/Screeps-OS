
let logger = require("screeps.logger");
logger = new logger("jobs.general");
logger.enabled = false;

let {Job, JobTypes, JobAssignment} = require("jobs.base");

let all = [

];
let map = {};


for(let i in all) {
    let one = all[i];
    let inst = new one();
    map[inst.name] = one;
}

module.exports = map;