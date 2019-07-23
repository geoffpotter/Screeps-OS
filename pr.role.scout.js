/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('pr.empire');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("pr.role.scout");


let processClass = require("INeRT.process");
let threadClass = require("INeRT.thread");

let intelClass = require("pr.empire.intel");


let stat = require("util.stat");

class scout extends processClass {
    init() {
        //
    }
    
    initThreads() {
        return [
            this.createThread("run", "creepAct"),
            ];
    }
    
    
    run() {
        logger.log("in scout run()")
        
        let spawn = Game.spawns['Spawn1'];
        let creeps = Game.creeps;
        let numScouts = 10;
        //logger.log(creeps, numScouts)
        if (Object.keys(creeps).length < numScouts) {
            //logger.log("not enough scouts", spawn.spawning, spawn.room.energyAvailable)
            if (!spawn.spawning && spawn.room.energyAvailable >= 50) {
                logger.log("spawnin scout")
                let i = 0;
                let n = "scout"
                while (Game.creeps[n+i]) {
                    i++;
                }
                let ret = spawn.spawnCreep([MOVE], n + i, {memory:{role:"scout"}});
                logger.log("spawn res:", ret)
            }
        }
        
        //run scouts
        for(let creepName in creeps) {
            let creep = creeps[creepName];
            
            if (creep.room.name == creep.memory.targetRoom) {
                creep.memory.targetRoom = false;
            }
            
            let targetRoom = creep.memory.targetRoom;
            if (!targetRoom) {
                let exits = Game.map.describeExits(creep.room.name);
                let randomExit = _.sample(exits);
                logger.log(creep, exits, randomExit);
                targetRoom = randomExit;
            }
            creep.memory.targetRoom = targetRoom;
            
            creep.moveTo( new RoomPosition(25, 25, targetRoom), {range: 24, visualizePathStyle:{}} )
            
        }
    }

    

}



module.exports = scout;