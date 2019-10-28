/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('pr.init');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("pr.init");


let processClass = require("INeRT.process");
let threadClass = require("INeRT.thread");


let statsProcClass = require("pr.stats");

let empireProcClass = require("pr.empire");
let intelProcClass = require("pr.intel");

let pStarProcClass = require("pr.pStar");
let pathingProcClass = require("pr.pathing");

let testingProcClass = require("pr.testing");

let flagwalkerClass = require("pr.role.flagwalker");

let scoutClass = require("pr.role.scout");


class initProc extends processClass {
    initThreads() {
        return [this.createThread("run", "init")];
    }
    run() {
        logger.log(this.name, "init")
        
        // let pStarProc = new pStarProcClass("pStar");
        // this.kernel.startProcess(pStarProc);
        
        // let empireProc = new empireProcClass("empire");
        // this.kernel.startProcess(empireProc);

        let intel = new intelProcClass("intel");
        this.kernel.startProcess(intel);
        
        
        let statsProc = new statsProcClass("stats");
        this.kernel.startProcess(statsProc);
        
        

        let pathingProc = new pathingProcClass("pathing");
        this.kernel.startProcess(pathingProc);

        // let scoutProc = new scoutClass("scouts");
        // this.kernel.startProcess(scoutProc);



        // let flagwalkerProc = this.kernel.getProcess("flagwalker")
        // if (!flagwalkerProc) {
        //     flagwalkerProc = new flagwalkerClass("flagwalker");
        //     this.kernel.startProcess(flagwalkerProc);
        // }

        // let testProc = new testingProcClass("testing");
        // this.kernel.startProcess(testProc);

        //global.empire = this.kernel.startProcess("empire", "empire", this.kernel.pri("EMPIRE"), false, false, true);
        
        return threadClass.DONE;
    }
}



module.exports = initProc;