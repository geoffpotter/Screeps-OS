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

        if (Memory.pStar) {
            global.utils.pStar.inst = global.utils.pStar.class.deserialize(Memory.pStar);
        }
        this.nodeMap = {};
    }
    initThreads() {
        return [this.createThread("run", "init")];
    }
    run() {
        logger.log(this.name, "init")
        
        this.mapFlags();

        //global.utils.pStar.inst.refineEdges();
        //global.utils.pStar.inst.refineNodes();
        let start = Game.cpu.getUsed();
        let serialized = global.utils.pStar.inst.serialize();
        Memory.pStar = serialized;
        let cpu = Game.cpu.getUsed() - start;

        logger.log("serialized length:", serialized.length, "cpu used:", cpu);
        
        // start = Game.cpu.getUsed();
        // let deserialized = global.utils.pStar.class.deserialize(serialized);
        // cpu = Game.cpu.getUsed() - start;
        // logger.log("deserialize cpu", cpu);

        //if (Game.time %2 == 0) {
            
        //} else {
        //    deserialized.displayNodes();
        //}
    
        /** @type {Node} */
        // let src = this.nodeMap["Flag1"];
        // let dest = this.nodeMap["Flag5"];
        // start = Game.cpu.getUsed();
        // let pathResult = src.findNodePathTo(dest);
        // let used = Game.cpu.getUsed() - start;
        // logger.log("cpu used", used, JSON.stringify(pathResult))

        // //pStar a*
        // start = Game.cpu.getUsed();
        // let pStarPath = global.utils.pStar.findPath(src, dest);
        // used = Game.cpu.getUsed() - start;
        // logger.log("cpu used", used, JSON.stringify(pStarPath))


        // //normal path
        // start = Game.cpu.getUsed();
        // let path = PathFinder.search(src.pos, dest.pos);
        // used = Game.cpu.getUsed() - start;
        // logger.log("cpu used", used, JSON.stringify(path))
        
        
        global.utils.pStar.inst.displayNodes();
    }

    mapFlags() {
        //rebuild the network every tick
        //global.utils.pStar.inst = new global.utils.pStar.class();


        let baseFlag = Game.flags["Flag1"];
        let sNode = new Node(baseFlag.pos, Node.STATIC_RESOURCE);
        if (!global.utils.pStar.inst.hasNode(sNode)) {
            logger.log("adding base flag", sNode.id);
            global.utils.pStar.inst.addNode(sNode);
        }
        this.nodeMap["Flag1"] = sNode;
        let otherFlags = [];
        let num = 2;
        while(Game.flags["Flag" + num]) {
            let flag = Game.flags["Flag" + num];
            otherFlags.push(flag);
            num++;
        }
        for(let i in otherFlags) {
            let otherFlag = otherFlags[i];
            let pos = otherFlag.pos;
            let type = Node.STATIC_RESOURCE;
            let edgeMin = 3;
            let edgeMax = 47;
            if (pos.x < edgeMin || pos.x > edgeMax || pos.y < edgeMin || pos.y > edgeMax) {
                type = Node.ROOM_EXIT;
            }
            let node = new Node(otherFlag.pos, type);
            if (this.kernel.time%1==0 && !global.utils.pStar.inst.hasNode(node)) {
                logger.log("adding other flag", node.id);
                global.utils.pStar.inst.addNode(node);
                this.nodeMap[otherFlag.name] = node;
                //return;
            }
            
        }
    }
}



module.exports = pathingProc;