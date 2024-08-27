/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('INeRT.process');
 * mod.thing == 'a thing'; // true
 */

let logger = require("screeps.logger");
logger = new logger("INeRT.process");
logger.enabled = false;
logger.color = COLOR_GREY;

let stat = require("util.stat").classes.stat;
let threadClass = require("INeRT.thread");

class process {
    constructor(name, data = {}) { // class constructor
        /** @type {kernel} */
        this.kernel=false; //set by kernel
        //handled by the kernel, not this class
        this.threads = [];
        this.name = name;
        this.data = data;
        this.cpuUsed = new stat();
        this.killed = false;
        this.parentProc = false; //set in kernel->startProcess
    }

    set memory(value) {
        value.lastTouch = Game.time;
        this.kernel.memory.procMem[this.name] = value;
    }

    get memory() {
        if (!this.kernel.memory.procMem[this.name]) {
            this.kernel.memory.procMem[this.name] = {
                lastTouch: Game.time
            };
        }
        return this.kernel.memory.procMem[this.name];
    }


    /**
     * Init code, do setup here
     *
     * called once during init
     */
    init() {
        logger.log(this.name, "base init")
    }

    /**
     * create and return starting threads for kernel to run.
     *
     * called once during init
     */
    initThreads() {
        logger.log(this.name, "base init threads", this.run);
        let defaultThreads = [];

        if (this.initTick) {
            defaultThreads.push(this.createThread("initTick", "init"));
        }
        if (this.run) {
            defaultThreads.push(this.createThread("run", "empire"));
        }
        if (this.endTick) {
            defaultThreads.push(this.createThread("endTick", "work"));
        }
        //logger.log("base init threads got", JSON.stringify(defaultThreads))
        return defaultThreads;
    }


    createThread(method, queueName) {
        let thread = new threadClass(this, method, queueName);
        return thread;
    }

    getRoom() {
        let roomName = this.data.roomName;
        let room = Game.rooms[roomName];
        if (room) {
            return room;
        } else {
            return false;
        }
    }
}

module.exports = process;
