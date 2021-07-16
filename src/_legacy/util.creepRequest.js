/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('util.creepRequest');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("util.creepRequest");


var obj = function(role, assignmentVar, baseBody, variableBody, priority, memory, maxBodies, minBodies) {
    if (!maxBodies)
        maxBodies = 50;
    if (!minBodies)
        minBodies = 0;    

    
    this.role = role;
    this.assignmentVar = assignmentVar;
    this.baseBody = baseBody;
    this.variableBody = variableBody;
    this.memory = memory;
    this.maxBodies = maxBodies;
    this.minBodies = minBodies;
    this.priority = priority;
    this.important = false;
    this.useMaxEnergy = false;
    this.orderWeights = {
        HEAL:-1,
        MOVE: 0,
        CLAIM:1,
        CARRY:2,
        WORK:3,
        RANGED_ATTACK:4,
        ATTACK:5,
        TOUGH:6
    };
    
}

obj.prototype.clone = function() {
    var n = new global.utils.creepRequest();
    for(var p in this) {
        n[p] = this[p];
    }
    return n;
}

obj.prototype.toString = function () {
    return "r: " + this.role;
}

obj.prototype.getName = function () {
    return this.getAvailableCreepName(this.role);
}
obj.prototype.getAvailableCreepName = function(role) {
    var r = role.split("-")[0];
    var i = 1;
    while (Game.creeps[r+"-"+i] != undefined) {
        i++;
    }
    return r+"-"+i;
}

obj.prototype.getMemory = function (defaultHome) {
    var memory = this.memory;
    if (!memory) {
        memory = {};
    }
    if (!memory.role) {
        memory.role = this.role;
    }
    if (!memory.assignmentVar) {
        memory.assignmentVar = this.assignmentVar;
    }
    if (!memory.home) {
        memory.home = defaultHome;
    }
    memory.bornIn = defaultHome;
    return memory;
}

obj.prototype.getBody = function (maxEnergy) {
    var body = global.utils.buildCreepBody(this.baseBody, this.variableBody, maxEnergy, this.maxBodies, this.minBodies)
    body = this.sortBody(body);
    //logger.log(this.roomName, "====",JSON.stringify(body))
    return body.reverse();
}

obj.prototype.sortBody = function (body) {
    //logger.log(this.roomName, "====", creepData.role,JSON.stringify(body))
    var req = this;
    body = _.sortBy(body, function(p) {
        //logger.log(req.orderWeights[p], p, JSON.stringify(req.orderWeights))
        return req.orderWeights[p.toUpperCase()];
    })
    return body;
}


module.exports = obj;