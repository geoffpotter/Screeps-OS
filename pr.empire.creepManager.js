/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('pr.empire.creepManager');
 * mod.thing == 'a thing'; // true
 */


let logger = require("screeps.logger");
logger = new logger("pr.empire.creepManager");
//logger.color = COLOR_YELLOW;
//logger.enabled = false;

let processClass = require("INeRT.process");
let threadClass = require("INeRT.thread");

class creepManager extends processClass {
    init() {
        this.creepsByClass = {};
        this.creepsByRole = {};
        this.creepsByProc = {};
        
        this.orphanedCreeps = [];
        this.creepQueue = {};
        this.allReqs = [];
        this.firstRun = true;
    
    }
    
    
    
    initTick() {
        
        this.creepQueue = {};
        this.allReqs = [];
        //reset creep lookups
        this.creepsByClass = {};
        this.creepsByRole = {};
        this.creepsByProc = {};
        this.orphanedCreeps = [];
        
        
        for(let c in Game.creeps) {
            let creep = Game.creeps[c];
            let creepClass = creep.memory.class;
            let role = creep.memory.role;
            let process = creep.memory.proc;
            if (!creepClass || !role) {
                //orphand
                this.orphanedCreeps.push(creep);
                creep.say("orphan");
            } else {
                // creep has a role and a class
                if (!process) {
                    //creep has no process, is orphand
                    this.orphanedCreeps.push(creep);
                    creep.say("orphan");
                } else if(!this.kernel.getProcess(process)) {
                    //proces doesn't exist
                    this.orphanedCreeps.push(creep);
                    creep.say("orphan");
                } else {
                    if (!this.creepsByClass[creepClass])
                        this.creepsByClass[creepClass] = [];
                    if (!this.creepsByRole[role])
                        this.creepsByRole[role] = [];
                    if (!this.creepsByProc[process])
                        this.creepsByProc[process] = [];
                    this.creepsByClass[creepClass].push(creep);
                    this.creepsByRole[role].push(creep);
                    this.creepsByProc[process].push(creep);
                }
                
            }
        }
        
        //_.each(this.orphanedCreeps, (c) => c.suicide())
    }
    tick() {
        
    }
    endTick() {
        logger.log("creep queue", JSON.stringify(this.creepQueue));
        
        // logger.log('orphans', JSON.stringify(this.orphanedCreeps))
        // if (!this.firstRun)
        //     _.each(this.orphanedCreeps, (c) => logger.log("------====",c, c.suicide()));
        
        this.firstRun = false;
    }
    
    getProcessCreeps(proc) {
        let creeps = this.creepsByProc[proc.name];
        if (!creeps)
            creeps = [];
        return creeps;
    }
    
    /**
     * proc - the process object requesting the creep
     * role - name of the role
     * class - name of the class
     * pos   - the location where the creep is needed, used to find a spawn
     * index - creeps index for this proc, used for multiple creeps of the same role/class
     */
    requestCreep(proc, role, creepClass, pos, priority, index = 0) {
        //return creep if it exists, else request it from spawn
        let procCreeps = this.creepsByProc[proc.name];
        
        //make sure pos is a roomPosition
        pos = new RoomPosition(pos.x, pos.y, pos.roomName);
        
        //logger.log(procCreeps)
        // for (let c in procCreeps) {
        //     let creep = procCreeps[c];
        //     //logger.log("hlkjadsfl", creep, JSON.stringify(creep.memory))
        //     if (creep.memory.role == role && creep.memory.class == creepClass && creep.memory.index == index) {
        //         return creep;
        //     }
        // }
        
        //no creep found, make request
        if (!this.creepQueue[proc.name])
                this.creepQueue[proc.name] = {};
        
        if (!this.creepQueue[proc.name][creepClass])
                this.creepQueue[proc.name][creepClass] = {};
        
        if (!this.creepQueue[proc.name][creepClass][role])
                this.creepQueue[proc.name][creepClass][role] = {};
                
        if (!this.creepQueue[proc.name][creepClass][role][index]) {
            //look for orphaned creep before making req
            let req = {"proc":proc.name, "role":role, "creepClass":creepClass, "pos": pos, priority:priority, "index": index};
            let orphan = this.findOrphanedCreep(req);
            //logger.log("orphan?", orphan)
            
            if(!this.firstRun && orphan) {
                logger.log("using orphan!", orphan, JSON.stringify(req))
                //repurpose this guy
                orphan.memory = this.getMemoryFromReq(req);
            } else {
                //add to queue
                this.creepQueue[proc.name][creepClass][role][index] = req;
                this.allReqs.push(req);
            }
            
        } else {
            logger.log("creep request already in queue!")
        }
        
        return false;
    }
    findOrphanedCreep(req) {
        let reqClass = global.creepClasses[req.creepClass];
        if (!reqClass) {
            logger.log("ERROR!!!!!!!!", "no creep class!", JSON.stringify(req))
        }
        let parts = _.groupBy(reqClass.requiredBody, (p) => p);
        //logger.log(req.proc, req.role, JSON.stringify(parts));
        for (let c in this.orphanedCreeps) {
            let creep = this.orphanedCreeps[c];
            let theseParts = _.groupBy(creep.body, (p) => p.type);
            let willWork = true; //this sucks.. we need to find the best one. meh.
            //logger.log(creep, JSON.stringify(theseParts))
            for(let p in parts) {
                //logger.log(p, !theseParts[p] || theseParts[p].length < parts[p].length)
                if (!theseParts[p] || theseParts[p].length < parts[p].length) {
                    //we don't have enough parts!
                    willWork = false;
                }
            }
            if (willWork) {
                _.remove(this.orphanedCreeps, (c) => c === creep);
                return creep;
            }
            //logger.log("hlkjadsfl", creep, JSON.stringify(creep.memory))
            
        }
        return false;
    }
    getCreepToSpawn(spawn) {
        let cpu = Game.cpu.getUsed();
        //logger.log("creep queue", JSON.stringify(this.allReqs));
        let safeReqs = _.filter(this.allReqs, (r) => r.pos.getDefcon() < 2)
        let reqs = _.sortBy(safeReqs, (r) => r.priority + (r.pos.getRangeTo(spawn) / 50));
        logger.log("sort time", Game.cpu.getUsed() - cpu);
        if (reqs.length > 0) {
            let req = reqs[0];
            //_.remove(this.allReqs, req);
            return req;
        }
        return false;
    }
    markReqFilled(req) {
        _.remove(this.allReqs, req);
        return;
    }
    getMemoryFromReq(req) {
        return {
                    class: req.creepClass,
                    role: req.role,
                    proc: req.proc,
                    index: req.index
                };
    }
    
}

module.exports = creepManager;