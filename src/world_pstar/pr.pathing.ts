/*
 * Module code goes here. Use 'module.export const to export things:
 * module.export constthing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('pr.init');
 * mod.thing == 'a thing'; // true
 */

var logger = import screeps.logger;
logger = new logger("pr.pathing");


let processClass = import INeRT.process;
let threadClass = import INeRT.thread;

let CachedPath = global.utils.map.classes.CachedPath;
let Node = global.utils.pStar.classes.Node;
let Edge = global.utils.pStar.classes.Edge;
let pStarRoom = global.utils.pStar.classes.pStarRoom;
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

        this.totalEdgesRefined = 0;
    }
    initThreads() {
        return [
            
            this.createThread("init_load", "init"),
            this.createThread("init_onTick", "init"),

            this.createThread("updateNetwork", "taskFind"),
            //this.createThread("displayNetwork", "work"),
            this.createThread("run", "empire"),
            this.createThread("save", "edges")
        ];
        
    }


    updateNetwork() {
        logger.log(this.name, "updating network!")

        if (this.kernel.cpuDefcon < 4) {
            logger.log("not updating network because cpu defcon is", this.kernel.cpuDefcon);
            return;
        }
        
        logger.log("doing update", Game.cpu.getUsed())
        let numEdgesRefined = global.utils.pStar.inst.refineEdges();
        this.totalEdgesRefined += numEdgesRefined;
        logger.log("edges refined", Game.cpu.getUsed(), this.totalEdgesRefined);
        let numRefined = global.utils.pStar.inst.refineRooms();
        logger.log("update done", Game.cpu.getUsed());
        //if we're under 6k bucket, only update once
        if (this.kernel.cpuDefcon < 6) {
            return;
        }
        logger.log('add rooms?');
        
        if (numRefined > 0 || (numEdgesRefined > 0 && this.totalEdgesRefined < 10)) { // if we did work, there's prolly more work to do!
            return threadClass.HUNGRY;
        } else {
            global.utils.pStar.inst.addRoomsToNetwork(1);//add a max of one room at a time.
            logger.log("Rooms added", Game.cpu.getUsed());
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
        this.totalEdgesRefined = 0;
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
            logger.log(error)
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
        let src = this.nodeMap["Flag2"];
        let src2 = this.nodeMap["Flag2"];
        let dest = this.nodeMap["Flag6"];


        // start = Game.cpu.getUsed();
        // let pathResult = src.findNodePathTo(dest);
        // used = Game.cpu.getUsed() - start;
        // logger.log("cpu used", used, JSON.stringify(pathResult))


        let refinePaths = true;


        //try {
            logger.log('doing pathing')
            //pStar a*
            // start = Game.cpu.getUsed();
            // let pStarPath = global.utils.pStar.findPath(src, dest, 1000, refinePaths);
            // used = Game.cpu.getUsed() - start;
            // logger.log(src.id, dest.id, "cpu used", used, JSON.stringify(pStarPath))
            // global.utils.pStar.inst.displayFindPath(pStarPath.path, "#f00");

            // //this.displayNetwork();

            // // //pStar a*
            // // start = Game.cpu.getUsed();
            // // let pStarPath2 = global.utils.pStar.findPath(src2, dest, 1000, refinePaths);
            // // used = Game.cpu.getUsed() - start;
            // // logger.log(src2.id, dest.id, "cpu used2", used, JSON.stringify(pStarPath2))
            // // global.utils.pStar.inst.displayFindPath(pStarPath2.path, "#00f");

            // // //normal path
            // start = Game.cpu.getUsed();
            // let path = PathFinder.search(src.pos, dest.pos, {maxOps:10000});
            // used = Game.cpu.getUsed() - start;
            // logger.log("cpu used", used, JSON.stringify(path)) 
        // } catch (error) {
        //     logger.log("error doing pathin");
        //     logger.log(error);
        //     if (this.kernel.time > 11)
        //         throw error;
        // }


        
        
        
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
            /** @type {pStarRoom} */
            let room = global.utils.pStar.inst.getRoom(node.pos.roomName);
            if (!room) {
                room = new pStarRoom(node.pos.roomName);
                global.utils.pStar.inst.rooms.add(room);
                room.refineRoom();
            }

            if (!global.utils.pStar.inst.hasNode(node)) {
                logger.log("adding other flag", node.id, node.type);
                
                global.utils.pStar.inst.addNode(node);
                this.nodeMap[otherFlag.name] = node;
                //return;
            }
            
        }
    }
}



export default pathingProc;