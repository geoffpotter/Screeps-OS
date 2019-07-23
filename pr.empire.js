/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('pr.empire');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("pr.empire");


let processClass = require("INeRT.process");
let threadClass = require("INeRT.thread");

let intelClass = require("pr.empire.intel");

let scoutClass = require("pr.role.scout");

let stat = require("util.stat");

class empire extends processClass {
    init() {
        //init vars
        //setup intel proc
        // global.intel = this.intel = new intelClass("intel");
        // this.kernel.startProcess(this.intel);
        this.gclProgress = new stat();
        this.gclProgressChange = new stat();
    }
    
    initThreads() {
        return [
            this.createThread("run", "empire"),
            this.createThread("endTick", "work"),
            ];
    }
    
    
    run() {
        //logger.log(this.kernel, this.kernel.getProcess)
        let scoutProc = this.kernel.getProcess("scout")
        if (!scoutProc) {
            scoutProc = new scoutClass("scout");
            this.kernel.startProcess(scoutProc);
        }
        
        if (Game.gcl.progress == 0) { //Guessing this won't acutally work..
            this.gclProgress = new stat();
            this.gclProgressChange = new stat();
        }
    }
    
    endTick() {
        let lastProgress = this.gclProgress.current;
        this.gclProgress.current = Game.gcl.progress;
        this.gclProgressChange.current = this.gclProgress.current - lastProgress;
    }
    
    getIntelProc() {
        return this.intel;
    }
}



module.exports = empire;