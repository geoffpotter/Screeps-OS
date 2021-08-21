/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('INeRT.queue.types');
 * mod.thing == 'a thing'; // true
 */


let logger = require("screeps.logger");
logger = new logger("INeRT.queue.types");
//logger.enabled = false;
logger.color = COLOR_GREEN;

let queue = require("INeRT.queue.base");
let threadClass = require("INeRT.thread");

class INeRTQueues {
    constructor() { // class constructor
        this.queueNames = [
            "init",
            "military",
            "empire",
            "rooms",
            "actionSearch",
            "creepAct",
            "creepMove",
            "pathing",
            "work"
        ];
        this.queueMap = {};
        for(let q in this.queueNames) {
            let name = this.queueNames[q];
            let que = new queue(name);
            this.queueMap[name] = que;
        }

        this.currentQueue = 0;
        //this.queueMap["creepAct"].cpuLimit = 10;
        //this.queueMap["creepAct"].runEveryX = 2;
        //this.queueMap["taskUpdate"].runEveryX = 3;
    }
    
    getQueue(name) {
        let queue = this.queueMap[name];
        if (!queue) {
            throw new Error("Getting invalid queue:" + name);
        }
        return queue;
    }
    
    addThread(thread) {
        this.currentQueue = 0;
        if(!thread instanceof threadClass) {
            throw new Error("kernel adding invalid thread " + thread);
        }
        let queue = this.queueMap[thread.targetQueue];
        if (!queue) {
            throw new Error(thread.proc.name + " thinks it belongs to an invalid queue:" + thread.targetQueue);
        }
        queue.addThread(thread);
    }
    
    removeThread(thread) {
        this.currentQueue = 0;
        if(!thread instanceof threadClass) {
            throw new Error("kernel adding invalid thread " + thread);
        }
        let queue = this.queueMap[thread.targetQueue];
        if (!queue) {
            throw new Error(thread.proc.name + " thinks it belongs to an invalid queue:" + thread.targetQueue);
        }
        queue.removeThread(thread);
    }
    getNextThread() {
        let queueName = this.queueNames[this.currentQueue];
        let queue = this.queueMap[queueName];
        if (!queue) {
            logger.log(JSON.stringify(this.queueMap));
            throw new Error(queueName + " queue doesn't exist.. you broke somethin, dumbass.")
        }
        
        let thread = queue.getNextThread();
        //logger.log('checking', queueName, "got", thread, this.currentQueue, this.queueNames.length)
        if (!thread) {
            if (this.currentQueue >= (this.queueNames.length-1)) {
                return false;
            }
            this.currentQueue++;
            return this.getNextThread();
        }
        return thread;
    }
    getNextThread_old() {
        let thread = false;
        for(let q in this.queueNames) {
            let queueName = this.queueNames[q];
            let queue = this.queueMap[queueName];
            if (!queue) {
                logger.log(JSON.stringify(this.queueMap));
                throw new Error(queueName + " queue doesn't exist.. you broke somethin, dumbass.")
            }
            
            thread = queue.getNextThread();
            //logger.log('checking', queueName, "got", thread)
            if (thread) {
                break;
            }
        }
        return thread;
    }
    
    initTick(kernel) {
        this.currentQueue = 0;
        //this.getQueue("creepAct").cpuLimit = 10;
        //this.queueMap["creepAct"].runEveryX = 2;
        //this.queueMap["taskUpdate"].runEveryX = 3;
        logger.log("setting cpu settings by defcon", kernel.cpuDefcon)
        switch(kernel.cpuDefcon) {

            case 0:
            case 1:
            case 2:
                    this.getQueue("pathing").cpuLimit = Game.cpu.limit * 0.05;
                    // this.getQueue("nodes").cpuLimit = Game.cpu.limit * 0.05;
                    // this.getQueue("edges").cpuLimit = Game.cpu.limit * 0.05;

                    //this.getQueue("taskUpdate").runEveryX = 10;
                    //this.getQueue("creepAct").runEveryX = 3;
                    this.getQueue("creepAct").cpuLimit = Game.cpu.limit * 0.1;
                    break;
            case 3:
            case 4:
            case 5:
                    this.getQueue("pathing").cpuLimit = Game.cpu.limit * 0.2;
                    // this.getQueue("nodes").cpuLimit = Game.cpu.limit * 0.1;
                    // this.getQueue("edges").cpuLimit = Game.cpu.limit * 0.2;

                    //this.getQueue("taskUpdate").runEveryX = 5;
                    //this.getQueue("creepAct").runEveryX = 2;
                    this.getQueue("creepAct").cpuLimit = Game.cpu.limit * 0.2;
                    break;
            case 6:
            case 7:
            case 8:
                    this.getQueue("pathing").cpuLimit = Game.cpu.limit * 0.3;
                    // this.getQueue("nodes").cpuLimit = Game.cpu.limit * 0.3;
                    // this.getQueue("edges").cpuLimit = Game.cpu.limit * 0.4;

                    // this.getQueue("taskUpdate").runEveryX = 2;
                    this.getQueue("creepAct").cpuLimit = Game.cpu.tickLimit * 0.8;
                    break;
            case 9:
            case 10:
                
            default:
                    //this.getQueue("taskUpdate").runEveryX = 1;
                    this.getQueue("creepAct").runEveryX = 1;
                    this.getQueue("creepAct").cpuLimit = Game.cpu.limit * 0.8;
                break;
        }
        
        
        for(let q in this.queueMap) {
            let queue = this.queueMap[q];
            queue.initTick();
        }
        
    }
    
    endTick() {
        for(let q in this.queueMap) {
            let queue = this.queueMap[q];
            queue.endTick();
            
            //transfer tick bucket into stats class
            queue.cpuUsed.current = queue.cpuTickBucket;
        }
    }
    
    displayQueueThreads() {
        for(let q in this.queueMap) {
            let queue = this.queueMap[q];
            logger.log(queue.name, "("+queue.threads.length+")", queue.cpuUsed.shortAvg);
        }
    }
}

module.exports = INeRTQueues;