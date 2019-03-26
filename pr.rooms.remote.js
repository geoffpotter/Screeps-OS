/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('pr.rooms.remote');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("pr.rooms.remote");

let baseRoom = require("pr.rooms.base");


class remoteRoom extends baseRoom {
    init() {
        super.init();
        
    }
    run() {

        

        this.setupPiles();
        this.setupContainers();
        this.setupSources();
        this.setupMiners("remoteMiner");
        
        this.setupWorkers();
        //this.setupAllRoadRepair();
        //this.setupTransporters();
        //this.makeWorkers(1);
        //this.makeTransporters(1)
    }
    
    
}



module.exports = remoteRoom;