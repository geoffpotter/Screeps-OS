/*
 * Module code goes here. Use 'module.export const to export things:
 * module.export constthing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('pr.init');
 * mod.thing == 'a thing'; // true
 */

var logger = import screeps.logger;
logger = new logger("pr.init");


let processClass = import INeRT.process;
let threadClass = import INeRT.thread;


let statsProcClass = import pr.stats;

let empireProcClass = import pr.empire;
let intelProcClass = import pr.intel;

let creepManagerProcClass = import pr.creepManager;


let pStarProcClass = import pr.pStar;
let pathingProcClass = import pr.pathing;

let testingProcClass = import pr.testing;

let flagwalkerClass = import pr.role.flagwalker;

let scoutClass = import pr.role.scout;

let actionManagerClass = import pr.actionManager;

let pathManagerClass = import pr.pathManager;


class initProc extends processClass {
    initThreads() {
        return [this.createThread("run", "init")];
    }
    run() {
        logger.log(this.name, "init")
        
        // let pStarProc = new pStarProcClass("pStar");
        // this.kernel.startProcess(pStarProc);
        
        

        let intel = new intelProcClass("intel");
        this.kernel.startProcess(intel);
        
        
        let statsProc = new statsProcClass("stats");
        this.kernel.startProcess(statsProc);
        
        let creepManagerProc = new creepManagerProcClass("creepManager");
        this.kernel.startProcess(creepManagerProc);

        let actionManagerProc = new actionManagerClass("actionManager");
        this.kernel.startProcess(actionManagerProc);

        
        let pathManagerProc = new pathManagerClass("pathManager");
        this.kernel.startProcess(pathManagerProc);

        let empireProc = new empireProcClass("empire");
        this.kernel.startProcess(empireProc);
        

        // let pathingProc = new pathingProcClass("pathing");
        // this.kernel.startProcess(pathingProc);

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



export default initProc;