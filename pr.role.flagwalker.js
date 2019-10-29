/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('pr.empire');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("pr.role.flagwalker");
//logger.enabled = false;

let processClass = require("INeRT.process");
let threadClass = require("INeRT.thread");

//let intelClass = require("pr.empire.intel");


let stat = require("util.stat").classes.stat;

class flagwalker extends processClass {
    init() {
        //
    }
    
    initThreads() {
        return [
            this.createThread("run", "creepAct"),
            ];
    }
    
    
    run() {
        logger.log("in flagwalker run()")
        
        let spawn = Game.spawns['Spawn1'];
        let creeps = Game.creeps;
        let numflagwalkers = 1;
        logger.log("spawnin", Object.keys(creeps).length, numflagwalkers)
        if (Object.keys(creeps).length < numflagwalkers) {
            logger.log("not enough flagwalkers", spawn.spawning, spawn.room.energyAvailable)
            if (!spawn.spawning && spawn.room.energyAvailable >= 50) {
                logger.log("spawnin flagwalker")
                let i = 0;
                let n = "flagwalker"
                while (Game.creeps[n+i]) {
                    i++;
                }
                let ret = spawn.spawnCreep([MOVE], n + i, {memory:{role:"flagwalker"}});
                logger.log("spawn res:", ret)
            }
        }
        
        //run flagwalkers
        
        for(let creepName in creeps) {
            let start = Game.cpu.getUsed();
            let creep = creeps[creepName];
            
            
            let targetFlagName = creep.memory.targetFlagName;
            if (!targetFlagName || creep.pos.inRangeTo(Game.flags[targetFlagName], 2)) {
                let newFlagName = _.sample(Object.keys(Game.flags));
                creep.memory.targetFlagName = newFlagName;
                targetFlagName = newFlagName;
                creep.say(targetFlagName);
            }
            let targetFlag = Game.flags[targetFlagName];
            if (!targetFlag) {
                logger.log(creep.name, "invalid flag!", targetFlagName, targetFlag)
                creep.memory.targetFlagName = false;
                return;
            }
            //creep.say(targetFlagName);
            let roomCenter = targetFlag.pos;
            let i = creepName.substr(5);
            let ret = {};
            //logger.log(creep.name, i, (i%2==0))

                //logger.log(creep.name, "using pStar")
            //creep.moveTo(roomCenter, {range:2})
            ret = global.utils.pStar.inst.moveTo(creep, {pos: roomCenter, range: 2});

            let used = Game.cpu.getUsed() - start;
            //logger.log(JSON.stringify(ret))
            logger.log(creep.name, "moved using", used, "cpu", ret.method);
            //logger.log(creep.name, "moved using", used, "cpu", i%2==0 ? "pstar" : "moveTo");
            //creep.say((i%2==0 ? "pStar" : "moveTo") + " " + used);
            
        }
    }

    

}



module.exports = flagwalker;