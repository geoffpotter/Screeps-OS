/*
 * Module code goes here. Use 'module.export const to export things:
 * module.export constthing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('pr.stats');
 * mod.thing == 'a thing'; // true
 */


let logger = import screeps.logger;
logger = new logger("pr.stats");
//logger.color = COLOR_GREY;

let processClass = import INeRT.process;
let threadClass = import INeRT.thread;

let stat = import util.stat.classes.stat;

class stats extends processClass {
    initThreads() {
        return [this.createThread("run", "work")];
    }
    
    get stats() {
        if(!Memory.stats) {
            Memory.stats = {};
        }
        return Memory.stats;
    }
    set stats(value) {
        value.lastUpdated = Game.time;
        Memory.stats = value;
    }
    
    init() {
        
        
    }
    
    run() {
        if (this.kernel.time == 0) {
            //skip first tick after reset
            return;
        }
        
        //store cpu stats from kernel
         _.set(this.stats, "INeRT.cpu", this.kernel.cpuUsed);
         _.set(this.stats, "INeRT.cpuLimit", this.kernel.cpuLimit);
         _.set(this.stats, "INeRT.overhead", this.kernel.overhead);
         _.set(this.stats, "INeRT.bucket", Game.cpu.bucket);
         
         //by proc
        //  for(let p in this.kernel.procTable) {
        //      let proc = this.kernel.procTable[p];
        //      _.set(this.stats, "INeRT.cpu.byProc." + proc.name, proc.cpuUsed);
        //  }
         
         //by queue
         for(let q in this.kernel.queues.queueNames) {
             let queueName = this.kernel.queues.queueNames[q];
             let queue = this.kernel.queues.getQueue(queueName);
             logger.log("queue CPU use", queueName, queue.cpuUsed)
             _.set(this.stats, "INeRT.cpu.byQueue." + queueName, queue.cpuUsed);
         }
         
         
         this.addEmpireStats();
         
         
         //make sure it's marked as updated.
         this.stats = this.stats;
         
         //return a number to sleep that many ticks
         return 5;
    }
    
    addEmpireStats() {
        let lastGCLProgress = _.get(this.stats, "Empire.gcl.progress", Game.gcl.progress);
        _.set(this.stats, "Empire.gcl.level", Game.gcl.level);
        _.set(this.stats, "Empire.gcl.progress", Game.gcl.progress);
        _.set(this.stats, "Empire.gcl.progressPercent", Game.gcl.progress / Game.gcl.progressTotal);

        
    }
    
}

export default stats;