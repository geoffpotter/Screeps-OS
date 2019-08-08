/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('pr.init');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("pr.pathing");


let processClass = require("INeRT.process");
let threadClass = require("INeRT.thread");

let CachedPath = global.utils.map.CachedPath;
let Node = global.utils.pStar.Node;
let Edge = global.utils.pStar.Edge;
//let pStar = global.utils.pStar.class;


class pathingProc extends processClass {
    init() {
        // Memory.paths = "";
        // if (Memory.paths) {
        //     this.paths = global.utils.array.IndexingCollection.deserialize(Memory.paths, CachedPath);
        // } else {
        //     this.paths = new global.utils.array.IndexingCollection();
        // }
    }
    initThreads() {
        return [this.createThread("run", "init")];
    }
    run() {
        logger.log(this.name, "init")
        
        this.mapFlags();

        global.utils.pStar.inst.refineEdges();
        global.utils.pStar.inst.refineNodes();
        let start = Game.cpu.getUsed();
        let serialized = global.utils.pStar.inst.serialize();
        let cpu = Game.cpu.getUsed() - start;

        logger.log("serialized length:", serialized.length, "cpu used:", cpu);
        
        // start = Game.cpu.getUsed();
        // let deserialized = global.utils.pStar.class.deserialize(serialized);
        // cpu = Game.cpu.getUsed() - start;
        // logger.log("deserialize cpu", cpu);

        //if (Game.time %2 == 0) {
            global.utils.pStar.inst.displayNodes();
        //} else {
        //    deserialized.displayNodes();
        //}
        
        
    }

    mapFlags() {
        let baseFlag = Game.flags["Flag1"];
        let sNode = new Node(baseFlag.pos, Node.STATIC_RESOURCE);
        if (!global.utils.pStar.inst.hasNode(sNode)) {
            logger.log("adding base flag", sNode.id);
            global.utils.pStar.inst.addNode(sNode);
        }

        let otherFlags = [];
        let num = 2;
        while(Game.flags["Flag" + num]) {
            let flag = Game.flags["Flag" + num];
            otherFlags.push(flag);
            num++;
        }
        for(let i in otherFlags) {
            let otherFlag = otherFlags[i];
            let node = new Node(otherFlag.pos, Node.STATIC_RESOURCE);
            if (this.kernel.time%2==0 && !global.utils.pStar.inst.hasNode(node)) {
                logger.log("adding other flag", node.id);
                global.utils.pStar.inst.addNode(node);
                return;
            }
            
        }
    }
}



module.exports = pathingProc;