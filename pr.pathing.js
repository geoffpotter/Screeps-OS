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

let CachedPath = global.utils.map.classes.CachedPath;
let Node = global.utils.pStar.classes.Node;
let Edge = global.utils.pStar.classes.Edge;
//let pStar = global.utils.pStar.class;


class pathingProc extends processClass {
    init() {
        // Memory.paths = "";
        // if (Memory.paths) {
        //     this.paths = global.utils.array.IndexingCollection.deserialize(Memory.paths, CachedPath);
        // } else {
        //     this.paths = new global.utils.array.IndexingCollection();
        // }


        
        
        this.nodeMap = {};
    }
    initThreads() {
        return [
            
            //this.createThread("init_load", "init"),
            this.createThread("init_onTick", "init"),

            this.createThread("updateNetwork", "taskFind"),
            this.createThread("displayNetwork", "work"),
            this.createThread("run", "empire"),
            this.createThread("save", "edges")
        ];
        
    }


    updateNetwork() {
        logger.log(this.name, "updating network!")

        global.utils.pStar.inst.addRoomsToNetwork();

        global.utils.pStar.inst.refineEdges();

        let numRefined = global.utils.pStar.inst.refineRooms();
        if (numRefined > 0) { // if we did work, there's prolly more work to do!
            //return threadClass.HUNGRY;
        }
    }

    displayNetwork() {
        logger.log(this.name, "displaying network!")
        global.utils.pStar.inst.displayRooms();

        //global.utils.pStar.inst.displayNodes();

        
    }

    init_load() {
        logger.log(this.name, "deserializing!")
        if (Memory.pStar) {
            let start = Game.cpu.getUsed();
            global.utils.pStar.inst = global.utils.pStar.classes.pStar.deserialize(Memory.pStar);
            let cpu = Game.cpu.getUsed() - start;
            logger.log("pStar deserialized", global.utils.pStar.inst.rooms.getAll().length, "cpu used:", cpu)
        }
        return threadClass.DONE;
    }

    init_onTick() {
        
        //global.utils.pStar.inst = new global.utils.pStar.classes.pStar();

        try {
            this.mapFlags(true);    
            
                // global.utils.pStar.inst.addRoomsToNetwork();//dumb
                // global.utils.pStar.inst.refineRooms();//dumber
                // global.utils.pStar.inst.addRoomsToNetwork();//dumb
                // global.utils.pStar.inst.refineRooms();//dumber
                // global.utils.pStar.inst.addRoomsToNetwork();//dumb
                // global.utils.pStar.inst.refineRooms();//dumber
                // global.utils.pStar.inst.refineRooms();//dumber
                // global.utils.pStar.inst.addRoomsToNetwork();//dumb
                // global.utils.pStar.inst.refineRooms();//dumber
                // global.utils.pStar.inst.refineRooms();//dumber
                // global.utils.pStar.inst.refineRooms();//dumber
                // global.utils.pStar.inst.addRoomsToNetwork();//dumb
                // global.utils.pStar.inst.refineRooms();//dumber
                // global.utils.pStar.inst.refineRooms();//dumber
                // global.utils.pStar.inst.addRoomsToNetwork();//dumb
                // global.utils.pStar.inst.refineRooms();//dumber
                // global.utils.pStar.inst.refineRooms();//dumber
                // global.utils.pStar.inst.addRoomsToNetwork();//dumb
                // global.utils.pStar.inst.refineRooms();//dumber
                // global.utils.pStar.inst.refineRooms();//dumber
                // global.utils.pStar.inst.addRoomsToNetwork();//dumb
                // global.utils.pStar.inst.refineRooms();//dumber
                // global.utils.pStar.inst.refineRooms();//dumber
                // global.utils.pStar.inst.addRoomsToNetwork();//dumb
                // global.utils.pStar.inst.refineRooms();//dumber
                // global.utils.pStar.inst.refineRooms();//dumber
                // this.mapFlags(true); 
        } catch (error) {
            
        }
        

        // global.utils.pStar.inst.addRoomToAdditionQueue("E11S1");


        
        //Game.cpu.halt();
        // if (Memory.edges) {
        //     this.edges = global.utils.array.IndexingCollection.deserialize(Memory.edges, global.utils.pStar.Edge)
        // }
        //return threadClass.DONE;
    }
    save() {
        logger.log(this.name, "serializing!")
        let start = Game.cpu.getUsed();
        let serialized = global.utils.pStar.inst.serialize();
        Memory.pStar = serialized;
        
        let cpu = Game.cpu.getUsed() - start;
        logger.log("serialized length:", serialized.length, "cpu used:", cpu);
        //global.utils.pStar.inst.edges._debugQueue();

        logger.log("rooms queued to be added", JSON.stringify(global.utils.pStar.inst.roomAdditionQueue));

        return 10;
    }
    run() {
        logger.log(this.name, "init")
        
        if (Game.time % 3 == 0) {
            //Game.cpu.halt();
        }

        if (Memory.pStar) {
            //global.utils.pStar.inst = {};
            //global.utils.pStar.inst = global.utils.pStar.class.deserialize(Memory.pStar);
        }
        
        

        
        //global.utils.pStar.inst.refineEdges();

        // 
        
        // start = Game.cpu.getUsed();
        // let deserialized = global.utils.pStar.class.deserialize(serialized);
        // cpu = Game.cpu.getUsed() - start;
        // logger.log("deserialize cpu", cpu);

        //if (Game.time %2 == 0) {
            
        //} else {
        //    deserialized.displayNodes();
        //}
    
        let start, used;
        /** @type {Node} */
        let src = this.nodeMap["Flag1"];
        let src2 = this.nodeMap["Flag2"];
        let dest = this.nodeMap["Flag4"];


        // start = Game.cpu.getUsed();
        // let pathResult = src.findNodePathTo(dest);
        // used = Game.cpu.getUsed() - start;
        // logger.log("cpu used", used, JSON.stringify(pathResult))


        let refinePaths = true;


        try {
            // logger.log('doing pathing')
            //        //pStar a*
            // start = Game.cpu.getUsed();
            // let pStarPath = global.utils.pStar.findPath(src, dest, 1000, refinePaths);
            // used = Game.cpu.getUsed() - start;
            // logger.log(src.id, dest.id, "cpu used", used, JSON.stringify(pStarPath))
            // global.utils.pStar.inst.displayFindPath(pStarPath.path, "#f00");

            // //this.displayNetwork();

            // //pStar a*
            // start = Game.cpu.getUsed();
            // let pStarPath2 = global.utils.pStar.findPath(src2, dest, 1000, refinePaths);
            // used = Game.cpu.getUsed() - start;
            // logger.log(src2.id, dest.id, "cpu used2", used, JSON.stringify(pStarPath2))
            // global.utils.pStar.inst.displayFindPath(pStarPath2.path, "#00f");

            // // //normal path
            // start = Game.cpu.getUsed();
            // let path = PathFinder.search(src.pos, dest.pos, {maxOps:10000});
            // used = Game.cpu.getUsed() - start;
            // logger.log("cpu used", used, JSON.stringify(path)) 
        } catch (error) {
            logger.log("error doing pathin");
            logger.log(error);
            if (this.kernel.time > 11)
                throw error;
        }


        
        
        
    }

    mapFlags(forceAll = false) {
        //rebuild the network every tick
        //global.utils.pStar.inst = new global.utils.pStar.class();

        let edgeMin = 3;
        let edgeMax = 47;

        let baseFlag = Game.flags["Flag1"];
        let sNode = new Node(baseFlag.pos, Node.STATIC_RESOURCE);
        if (sNode.pos.x < edgeMin || sNode.pos.x > edgeMax || sNode.pos.y < edgeMin || sNode.pos.y > edgeMax) {
            sNode.type = Node.ROOM_EXIT;
        }
        sNode.type = Node.BASE;
        if (!global.utils.pStar.inst.hasNode(sNode)) {
            logger.log("adding base flag", sNode.id);
            global.utils.pStar.inst.addNode(sNode);
        }
        this.nodeMap["Flag1"] = sNode;
        let otherFlags = [];
        let num = 2;

        if (!forceAll && this.kernel.time < 10) {
            return;
        }
        while(Game.flags["Flag" + num]) {
            let flag = Game.flags["Flag" + num];
            otherFlags.push(flag);
            num++;
        }
        for(let i in otherFlags) {
            let otherFlag = otherFlags[i];
            let pos = otherFlag.pos;
            let type = Node.STATIC_RESOURCE;
            
            if (pos.x < edgeMin || pos.x > edgeMax || pos.y < edgeMin || pos.y > edgeMax) {
                type = Node.ROOM_EXIT;
            }
            let node;
            if (true || !this.nodeMap[otherFlag.name]) {
                node = new Node(otherFlag.pos, type);
                this.nodeMap[otherFlag.name] = node;
            } else {
                node = this.nodeMap[otherFlag.name];
            }
            // let edge = new global.utils.pStar.Edge(sNode, node);
            // if (!this.edges.has(edge)) {
            //     this.edges.add(edge);
            // }
            if (!global.utils.pStar.inst.hasNode(node)) {
                logger.log("adding other flag", node.id, node.type);
                global.utils.pStar.inst.addNode(node);
                this.nodeMap[otherFlag.name] = node;
                //return;
            }
            
        }
    }
}



module.exports = pathingProc;