/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('INeRT.kernel');
 * mod.thing == 'a thing'; // true
 */
// INeRT(I'm Not Running That)

/*

lol this is already out of date
Kernel is responsable for starting and stopping programs and handling their memory clean up.
Kernel will define various process queues 
--- during tick
Kernel will update Queue settings based on CPU status
Kernel will tell programs to submit their processes to said queues(can this itself be a process?)(also want to test having program start register processes and let them live till they return DONE)
Kernel will pull from queues in priority order, executing processes until all queues no longer want to run processes.

--- end during tick

Queues are responsable for handling execution order for their processes.
options I have in mind:
normal - things run in the order they were added
lastRun - things run in order of how long it's been since they last ran
cpu limiting - all queues will have a cpu limit, once limit is reached, queue is considered empty
INeRT(maybe) mode - all queues will have a setting that controls structured skipping of processes, ie:
   values > 1 == only run 1/value of the processes every tick, .  So for 2, run the evens one tick, the odds the next.  For 3, run 1,4,7 then 2,5,8 then 3,6,9 etc.
   0 < values < 1 == skip (values*100)% of processes, evenly spaced across the queue.  for 90%, count to 10 as ya run procs, skip the 10th.



*/

//no memory use for kernel so a process that's running will be lost during a reset.  All programs should be built
//processes to run have to be submitted to kernel each tick

let logger = require("screeps.logger");
logger = new logger("INeRT.kernel");
//logger.enabled = false;
logger.color = COLOR_GREEN;

let stat = require("util.stat").classes.stat;
let processClass = require("INeRT.process");
let threadClass = require("INeRT.thread");
let queuesClass = require("INeRT.queue.types");
let queueClass = require("INeRT.queue.base")

class kernel {
    constructor() { // class constructor
        this.procTable = {};
        this.queues = new queuesClass();
        
        this.cpuUsed = new stat();
        this.overhead = new stat();
        this.memOverhead = new stat();
        this.threadsRun = new stat();
        
        this.clearMemory();
        this.lastTick = false;
        this.time = 0;
        
        this.cpuLimit = false;
        this.cpuDefcon = 0;
        this.cpuBucketRecoverTicks = 0;

        this.profile = true;

        global.kernel = this;
    }
    
    startProcess(process, parentProcess) {
        if (!process instanceof processClass) {
            throw new Error("invalid process:" + process);
        }
        if (!parentProcess instanceof processClass) {
            throw new Error("invalid process:" + parentProcess);
        }
        
        if (this.procTable[process.name]) {
            logger.log(JSON.stringify(Object.keys(this.procTable)))
            logger.log(JSON.stringify(process));
            throw new Error("process already running:" + process.name);
        }
        
        process.parentProcess = parentProcess;

        this.procTable[process.name] = process;
        
        process.kernel = this;
        
        process.init(this);
        
        let initialThreads = process.initThreads();
        for(let t in initialThreads) {
            let thread = initialThreads[t];
            logger.log(process.name, "starting init thread", thread)
            this.startThread(thread);
        }
        if (this.profile) {
            profiler.registerObject(process, process.name);
            if (!this.wrappedProcs) {
                this.wrappedProcs = {};
            }
            if (!this.wrappedProcs[process.constructor.name]) {
                logger.log("wrapping proc" + process.constructor.name)
                profiler.registerClass(process.__proto__, process.constructor.name);
                this.wrappedProcs[process.constructor.name] = 1;
            }
        }
    }
    
    killProcess(process) {
        //just set a flag for now, since this may get called somewhere 
        //  that it's hard to stop execution of a parent function
        // then we'll try to use this flag to keep other threads/parent functions from wasting too much cpu
        process.killed = true;
    }
    destroyProcess(process) {
        if (!this.procTable[process.name]) {
            throw new Error("trying to kill non running process:", process.name);
        }
        //kill all threads
        for(let t in process.threads) {
            let thread = process.threads[t];
            this.queues.removeThread(thread);
        }
        //destroy child procs
        let childProcs = _.filter(this.procTable, (p) => p.parentProcess == process);
        for(let c in childProcs) {
            let childProc = childProcs[c];
            this.destroyProcess(childProc);
        }
        delete this.procTable[process.name];
        delete this.memory.procMem[process.name];
        process.killed = true;
    }
    
    getProcess(name) {
        let proc = this.procTable[name];
        if (proc) {
            return proc;
        } else {
            return false;
        }
    }
    
    startThread(thread) {
        this.queues.addThread(thread);
        
    }
    
    run() {
        
        if(this.cpuBucketRecoverTicks > 0 && Game.cpu.bucket < 10000) {
            logger.log("skipping tick", this.cpuBucketRecoverTicks, "ticks left.");
            this.cpuBucketRecoverTicks--;
            return;
        }
        this.cpuBucketRecoverTicks = 0;
        this.cpuAtStart = Game.cpu.getUsed();
        
        this.cpuDefcon = 10;
        if (!this.inSimMode()) {
            this.cpuDefcon = Math.floor(Game.cpu.bucket / 1000);
            switch(this.cpuDefcon) {
                case 10:
                case 9:
                    this.cpuLimit = Game.cpu.tickLimit;
                    break;
                case 8:
                case 7:
                case 6:
                    this.cpuLimit = Game.cpu.limit * 2;
                    break;
                case 5:
                case 4:
                    this.cpuLimit = Game.cpu.limit * 0.8;
                    break;
                case 3:
                case 2:
                case 1:
                    this.cpuLimit = Game.cpu.limit * 0.5;
                    break;
                    break;
                case 0:
                    this.cpuBucketRecoverTicks = 20;
            }
        } else {
            this.cpuLimit = 100000;
        }
        this.threadCpu = 0;
        let threadsRun = 0;
        
        //handle memory
        let memoryCPUUsed = 0;
        let memoryCPUStart = Game.cpu.getUsed();
        
        this.initMemory();
        memoryCPUUsed += Game.cpu.getUsed() - memoryCPUStart;
        
        
        //do init tick
        this.queues.initTick(this);
        
        
        this.queues.displayQueueThreads();
        
        //objects to store performance data till end of tick, we can't put it in place now because the stat class expects one update to .current per tick
        let cpuByProc = {};
        
        //run threads
        /** @type {threadClass} */
        let thread = false;
        //while we've got threads to run, run em
        logger.log("Starting kernel run")
        while(thread = this.queues.getNextThread()) {
            let cpuStart = Game.cpu.getUsed();
            
            //handle cpu limit
            if (cpuStart - this.cpuAtStart > this.cpuLimit) {
                logger.log("CPU LIMIT REACHED:", cpuStart - this.cpuAtStart, this.cpuLimit)
                break;
            }
            //run thread
            let ret = thread.run(this);
            //logger.log("after runnin", thread, thread.targetQueue)
            
            let cpuUsed = Game.cpu.getUsed() - cpuStart;
            
            //store cpu use
            this.threadCpu += cpuUsed;
            thread.cpuUsed.current = cpuUsed;
            
            let queue = this.queues.getQueue(thread.targetQueue);
            queue.cpuTickBucket += cpuUsed;
            
            if (!cpuByProc[thread.process.name]) {
                cpuByProc[thread.process.name] = 0;
            }
            cpuByProc[thread.process.name] += cpuUsed;
            
            //logger.log('ran', thread.process.name, "func", thread.method, "got", ret);
            if (ret === threadClass.DONE || ret === threadClass.HUNGRY) {
                let queueName = thread.targetQueue;
                this.queues.removeThread(thread);
                /** @type {queueClass} */
                let queueItWasIn = this.queues.getQueue(queueName);
                queueItWasIn.currentIndex--;//roll current index back one, since we've removed the item at that index now

                //
                if (ret === threadClass.HUNGRY) {
                    //if it's hungry, add it back in after removing it.  this should cause it to run again at the end of it's queue.  Be careful..
                    this.startThread(thread);
                }
            }
            
            threadsRun++;
        }
        
        //do end tick
        this.queues.endTick();
        
        //Garbage collection
        if (this.time % 100 == 0) {
            this.gc();
        }
        
        this.killFinishedProcs();
        
        //handle memory endtick
        memoryCPUStart = Game.cpu.getUsed();
        this.commitMemory();
        memoryCPUUsed += Game.cpu.getUsed() - memoryCPUStart;
        

        for(let procName in cpuByProc) {
            let cpuThisProc = cpuByProc[procName];
            let proc = this.getProcess(procName);
            if(proc) {
                proc.cpuUsed.current = cpuThisProc;
            }
        }
        
        
        //store core stats
        this.threadsRun.current = threadsRun;
        this.totalCpuUsed = Game.cpu.getUsed() - this.cpuAtStart;
        this.cpuUsed.current = this.totalCpuUsed;
        this.overhead.current = this.totalCpuUsed - this.threadCpu;
        this.memOverhead.current = memoryCPUUsed + this.cpuAtStart;
        

        
        //log out stats
        logger.log("ran", this.threadsRun.current, "threads with", this.threadCpu, "cpu", "total cpu:", this.cpuUsed.current);
        logger.log("overhead:", this.overhead.current, "by thread", this.overhead.current/this.threadsRun.current, "avg", this.overhead.shortAvg/this.threadsRun.shortAvg);
        logger.log("mem overhead:", this.memOverhead.current)
        logger.log("cpu", this.cpuUsed);
        logger.log("avg by thread", this.cpuUsed.shortAvg / this.threadsRun.shortAvg);
        logger.log("avg by creep", Object.keys(Game.creeps).length, " creeps using ", this.cpuUsed.shortAvg / Object.keys(Game.creeps).length, "cpu each");
        logger.log("bucket", Game.cpu.bucket, "cpu defcon:", this.cpuDefcon);
        
        
        
        this.time++;
        this.lastTick = Game.time;
        
        logger.log(Game.cpu.getUsed() - this.cpuAtStart);
    }
    
    
    
    //once a process has no running threads, consider it done
    killFinishedProcs() {
        //logger.log("checking for finished processes")
        for(let p in this.procTable) {
            let proc = this.procTable[p];
            //logger.log(proc.name, "thread check", proc.threads.length)
            for(let t in proc.threads) {
                let thread = proc.threads[t];
                //logger.log(proc.name, thread.method);
            }
            if (proc.threads.length == 0 || proc.killed) {
                logger.log(proc.name, proc.killed ? "proc killed, removin" : "proc has no running threads, killing");
                this.destroyProcess(proc);
            }
        }
    }
    
    getBlankMemory() {
        return {
            procMem:{}
        };
    }
    
    clearMemory() {
        this.memory = this.getBlankMemory();
    }
    
    initMemory() {
        // //handle memory hack
        // if (this.time == 0) {
        //     //first tick
        //     this.__memory = Memory;
        // } else {
        //     //all other ticks, don't load that shit, we already have it.
        //     delete global.Memory;
        //     Memory = this.__memory;
        //     global.Memory = this.__memory;
        // }
        
        //Memory = global.Memory;
        
        //logger.log('inital mem', JSON.stringify(Memory))
        //actual kernel memory, if it exists
        if (!Memory.INeRT) {
            Memory.INeRT = this.getBlankMemory();
        }
        this.memory = Memory.INeRT;

        Memory;
    }
    
    commitMemory() {
        //logger.log(JSON.stringify(this.memory))
        //kernel mem:
        //logger.log("saving mem: ", JSON.stringify(Memory), "stored mem:", JSON.stringify(global.Memory))
        Memory.INeRT = this.memory;
        //handle memory hack
        //RawMemory._parsed = Memory;
        //RawMemory.set(JSON.stringify(Memory));
        
        //do we need to update our internal __memory property?  kinda makese sense..
        //this.__memory = Memory;
        //global.Memory = Memory;//??
        //global.no();
    }
    
    gc() {
        //remove dead creeps
        for(let name in Memory.creeps) {
            if (!Game.creeps[name]) {
                delete Memory.creeps[name];
            }
        }
    }
    
    inSimMode() {
        return Object.keys(Game.rooms)[0] ==="sim"
    }
}

module.exports = kernel;