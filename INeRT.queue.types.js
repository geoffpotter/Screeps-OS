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
logger.enabled = false;
logger.color = COLOR_GREEN;

let queue = require("INeRT.queue.base");
let threadClass = require("INeRT.thread");

class INeRTQueues {
    constructor() { // class constructor
        this.queueNames = [
            "init",
            "taskCreate",
            "taskFind",
            "military",
            "empire",
            "remoteRooms",
            "struct",
            "creepAct",
            "creepMove",
            "taskUpdate",
            "work"
        ];
        this.queueMap = {};
        for(let q in this.queueNames) {
            let name = this.queueNames[q];
            let que = new queue(name);
            this.queueMap[name] = que;
        }
        this.queueMap["creepAct"].cpuLimit = 10;
        //this.queueMap["creepAct"].runEveryX = 2;
        this.queueMap["taskUpdate"].runEveryX = 3;
    }
    
    getQueue(name) {
        let queue = this.queueMap[name];
        if (!queue) {
            throw new Error("Getting invalid queue:" + name);
        }
        return queue;
    }
    
    addThread(thread) {
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
    
    initTick() {
        this.queueMap["creepAct"].cpuLimit = 10;
        //this.queueMap["creepAct"].runEveryX = 2;
        this.queueMap["taskUpdate"].runEveryX = 3;
        switch(this.cpuDefcon) {
            case 10:
            case 9:
                this.getQueue("taskUpdate").runEveryX = 2;
                this.getQueue("creepAct").cpuLimit = Game.cpu.limit * 0.8;
                break;
            case 8:
            case 7:
            case 6:
                this.getQueue("taskUpdate").runEveryX = 3;
                this.getQueue("creepAct").cpuLimit = Game.cpu.limit * 0.5;
                break;
            case 5:
            case 4:
            case 3:
                this.getQueue("taskUpdate").runEveryX = 5;
                this.getQueue("creepAct").cpuLimit = Game.cpu.limit * 0.2;
                break;
            case 2:
            case 1:
            case 0:
                this.getQueue("taskUpdate").runEveryX = 10;
                this.getQueue("creepAct").cpuLimit = Game.cpu.limit * 0.1;
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