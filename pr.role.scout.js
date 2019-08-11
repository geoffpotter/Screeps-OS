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
            let start = Game.cpu.getUsed();
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
            
            let roomCenter = new RoomPosition(25, 25, targetRoom);
            let i = creepName.substr(5);
            logger.log(creep.name, i, (i%2==0))
            if (i%2==0) {
                logger.log(creep.name, "using pStar")
                global.utils.pStar.inst.moveTo(creep, {pos: roomCenter, range: 24});
            } else {
                creep.moveTo( roomCenter, {range: 24, visualizePathStyle:{stroke:"#f00"}} )
            }
            let used = Game.cpu.getUsed() - start;
            logger.log(creep.name, "moved using", used, "cpu");
            creep.say((i%2==0 ? "pStar" : "moveTo") + " " + used);
            
        }
    }

    

}



module.exports = scout;