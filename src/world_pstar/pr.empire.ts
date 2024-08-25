/*
 * Module code goes here. Use 'module.export const to export things:
 * module.export constthing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('pr.empire');
 * mod.thing == 'a thing'; // true
 */

var logger = import screeps.logger;
logger = new logger("pr.empire");


let processClass = import INeRT.process;
let threadClass = import INeRT.thread;

let intelClass = import pr.intel;

let scoutClass = import pr.role.scout;

let roomManagerClass = import pr.roomManager;

let stat = import util.stat.classes.stat;

class empire extends processClass {
    init() {
        //init vars
        //setup intel proc
        // global.intel = this.intel = new intelClass("intel");
        // this.kernel.startProcess(this.intel);
        this.gclProgress = new stat();
        this.gclProgressChange = new stat();

        this.username = Game.spawns[Object.keys(Game.spawns)[0]].owner.username;
        /** @type {intelClass} */
        this.intelProc = this.kernel.getProcess("intel");

        /** @type {empire} */
        global.empire = this;
    }
    
    initThreads() {
        return [
            this.createThread("setupRoomManagers", "init"),
            this.createThread("run", "empire"),
            this.createThread("endTick", "work"),
            ];
    }
    
    setupRoomManagers() {
        let allIntel = this.intelProc.getAllIntel();
        for(let roomName in allIntel) {
            let roomIntel = allIntel[roomName];
            let procName = roomName + "_manager";
            let roomManagerProc = this.kernel.getProcess(procName);
            let data = {
                roomName: roomName,
                intel: roomIntel
            }
            if (!roomManagerProc) {
                roomManagerProc = new roomManagerClass(procName, data);
                this.kernel.startProcess(roomManagerProc);
            }
            roomManagerProc.data = data;
        }
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



export default empire;