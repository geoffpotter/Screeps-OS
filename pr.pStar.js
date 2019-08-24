/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('pr.init');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("pr.pStar");
logger.color = COLOR_ORANGE;

let processClass = require("INeRT.process");
let threadClass = require("INeRT.thread");

let Node = global.utils.pStar.Node;

class nodeProc extends processClass {
    init() {
        this.pStar = this.kernel.getProcess("pStar");
        this.node = this.pStar.getNodeById(this.data.nodeId);
    }

    initThreads() {logger.log("node proc init")
        let updateThread = this.createThread("updateNode", "nodes");
        //updateThread.suspend = 0 + Math.floor(Math.random() * 10);
        return [
            //updateThread,
            this.createThread("displayNode", "work")
        ];
    }

    updateNode() {
        //logger.log("updating node", this.data.nodeId);
        this.node.refineNode();
        
        return 100 - this.kernel.cpuDefcon*10;
    }

    displayNode() {
        this.node.displayNode();
    }
}

class pStarProc extends processClass {
    /**
     * @returns Node
     */
    nodeClass() {
        return Node;
    }
    init() {
        //deserialize
        // if (Game.time % 10 == 0)
            //Memory.pStarCache = "";
        if (Memory.pStarCache) {
            let start = Game.cpu.getUsed();
            global.utils.pStar.inst = global.utils.pStar.class.deserialize(Memory.pStarCache);
            let used = Game.cpu.getUsed() - start;
            logger.log("pStar deserialize.  CPU:", used, "Size:", Memory.pStarCache.length);
            //logger.log("wtf",JSON.stringify(global.utils.pStar.inst));

            return;
            //start a proc for each node
            let allNodes = global.utils.pStar.inst.nodes.getAll();
            logger.log("starting node procs")
            for(let n in allNodes) {
                let node = allNodes[n];
                let nodeProcessName = "node-" + node.id;
                if (!this.kernel.getProcess(nodeProcessName)) {
                    logger.log("starting proc", nodeProcessName)
                    let proc = new nodeProc(nodeProcessName, {nodeId: node.id});
                    this.kernel.startProcess(proc);
                }
            }
            //global.no()
        }
    }
    initThreads() {
        return [
            //this.createThread("refineNodes", "nodes"),
            //this.createThread("refineEdges", "edges"),
            this.createThread("displayEdges", "work"),
            this.createThread("pStarSave", "pathing")
        ];
    }

    pStarSave() {
        //serialize
        let start = Game.cpu.getUsed();
        Memory.pStarCache = global.utils.pStar.inst.serialize();
        let used = Game.cpu.getUsed() - start;
        logger.log("pStar serialize.  CPU:", used, "Size:", Memory.pStarCache.length)
        //logger.log(Memory.pStarCache)
        //sleep after saving.  
        return 10;
        //this.init();
    }

    refineNodes() {
        logger.log(this.name, "refine nodes");
        global.utils.pStar.inst.refineNodes();
    }

    refineEdges() {
        
        logger.log(this.name, "refine edges")
        global.utils.pStar.inst.refineEdges();
    }


    displayEdges() {
        global.utils.pStar.inst.displayNodes();
    }

    getNodeById(nodeId) {
        return global.utils.pStar.inst.nodes.getById(nodeId);
    }
    hasNode(node) {
        return global.utils.pStar.inst.hasNode(node);
    }

    addNode(node) {
        global.utils.pStar.inst.addNode(node);
        return;
        //create process for node
        let nodeProcessName = "node-" + node.id;
        if (!this.kernel.getProcess(nodeProcessName)) {
            let proc = new nodeProc(nodeProcessName, {nodeId: node.id});
            this.kernel.startProcess(proc);
        }
    }

    removeNode(node) {
        global.utils.pStar.inst.removeNode(node);
    }

    addRoomExitNodes(room) {
        //for each edge, grab the exits, group em
        // add a node in the middle of the group, they come back in order, so middle of the array is the middle of the exit segment
        this.addRoomEdgeNodes(room, TOP);
        this.addRoomEdgeNodes(room, LEFT);
        this.addRoomEdgeNodes(room, BOTTOM);
        this.addRoomEdgeNodes(room, RIGHT);
    }

    addRoomEdgeNodes(room, direction) {
        let findTerm = '';
        let dx = 0;
        let dy = 0;
        let byX = true;
        switch (direction) {
            case TOP:
                findTerm = FIND_EXIT_TOP;
                dy = 1;
                break;
            case LEFT:
                findTerm = FIND_EXIT_LEFT;
                dx = 1;
                byX = false;
                break;
            case BOTTOM:
                findTerm = FIND_EXIT_BOTTOM;
                dy = -1;
                break;
            case RIGHT:
                findTerm = FIND_EXIT_RIGHT;
                dx = -1;
                byX = false;
                break;
            default:
                throw new Error("invalid direction!" + direction)
        }
        //right
        let exits = room.find(findTerm);
        let groups = this.groupExits(exits, byX, 7);
        //logger.log('adding exits', room.name, direction, groups.length)
        for(let g in groups) {
            let group = groups[g];
            let centerExit = group[Math.floor(group.length/2)];
            //make exit node one square towards center of room
            //logger.log("adding Node", direction, centerExit.x + dx, centerExit.y + dy, centerExit.roomName )
            let exitNodePos = new RoomPosition(centerExit.x + dx, centerExit.y + dy, centerExit.roomName);
            let node = new Node(exitNodePos, Node.ROOM_EXIT);
            if (!this.hasNode(node)) {
                this.addNode(node);
            }
            
        }
    }

    groupExits(exits, byX = true, lengthLimit = 0) {
        let field = byX ? "x" : "y";
        exits = _.sortBy(exits, [field]);
        //logger.log('----', JSON.stringify(exits))
        let exitGroups = [];
        let currentGroup = 0;
        
        let currentLoc = 0;
        //step through exits and compare the last exit's x/y value + 1 to this exit's x/y value, 
        //if they don't match, there's a break, make a new array and start adding to that.
        //do the same when the current array is over the limit
        for(let e in exits) {
            let exit = exits[e];
            if(currentLoc == 0) {
                //if this is the first exit, create the first group
                exitGroups[currentGroup] = [];
                //store current loc and increment
                currentLoc = exit[field];

            }
            //logger.log("checking", exit, currentLoc)
            if (exit[field] != currentLoc || exitGroups[currentGroup].length >= lengthLimit) {
                //there's a break!
                currentGroup++;
                exitGroups[currentGroup] = [];
                currentLoc = exit[field];
            }
            exitGroups[currentGroup].push( exit );
            currentLoc++;
        }
        return exitGroups;
    }
}



module.exports = pStarProc;