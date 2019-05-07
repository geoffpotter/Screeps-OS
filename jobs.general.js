
let logger = require("screeps.logger");
logger = new logger("jobs.general");
logger.enabled = false;

let {Job, JobTypes, JobAssignment} = require("jobs.base");

class mining extends Job{
    constructor() {
        super();
        this.name = JobTypes.MINE;
        //this.displayThisTask = true;

        this.stopMining = false;
    }
    assignCreep(creep, priority) {
        let amtAssigned = 1;
        
        let assignment = new JobAssignment(creep.id);
        assignment.priority = priority;
        
        this.assignments[creep.id] = assignment;
    }
    
    preformTask(creep) {
        let target = this.getTarget();
        if (!target) {
            return true;
        }
        if (!this.stopMining && creep.pos.inRangeTo(target, 1)) {
            creep.harvest(target);
        }
        return creep.carryCapacity != 0 && _.sum(creep.carry) == creep.carryCapacity
    }
    moveToPosition(creep) {
        let moveTarget = this.pos;
            
        let sourceProc = this.kernel.getProcess("source-" + this.targetId);
        
        this.stopMining = false;
        this.targetRange = 1;
        if (creep.pos.isNearTo(this.pos) && creep.memory.role == "miner" && sourceProc && sourceProc.cont) {
            moveTarget = sourceProc.cont;
            this.targetRange = 0;
            //logger.log(creep, _.sum(sourceProc.cont.store), sourceProc.cont.storeCapacity)
            if (_.sum(sourceProc.cont.store) == sourceProc.cont.storeCapacity) {
                this.stopMining = true;
            }
        }
            
        if (!creep.pos.inRangeTo(moveTarget, this.targetRange)) {
            global.creepActions.moveTo(creep, moveTarget, this.targetRange) 
        }
    }



}

let all = [
    mining,
];
let map = {};


for(let i in all) {
    let one = all[i];
    let inst = new one();
    map[inst.name] = one;
}

module.exports = map;