/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('pr.rooms.slave');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("pr.rooms.slave");
logger.enabled = false;
let baseRoom = require("pr.rooms.base");


class slaveRoom extends baseRoom {
    init() {
        super.init();
    }
    run() {
        this.setupSpawns();
        this.setupTowers();
        this.setupPiles();
        this.setupContainers();

        this.setupSources();
        this.setupMiners();
    
        this.setupWorkers();
        this.setupUpgraders();
        //this.makeWorkers(1);
        //this.makeFillers(1);
        //this.makeBuilders(1);
        //this.makeUpgraders(1);
        //this.makeTransporters(1);
        //_.each(this.workers, (c) => logger.log("------====",c, c.suicide()));
        let intel = this.intel.getRoomIntel(this.data.roomName);
        logger.log((_.size(this.workers) + _.size(this.builders)), JSON.stringify(this.workers))
        for(let i in this.workers) {
            logger.log(i)
        }
        if ((_.size(this.workers) + _.size(this.builders)) < 2) {
            //set emergency mode in intel
            
            intel.emergencyMode = true;
        } else {
            intel.emergencyMode = false;
        }
        
    }
    
    setupSourceProcs() {
        
    }
}



module.exports = slaveRoom;