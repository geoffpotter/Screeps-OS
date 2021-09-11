
var logger = require("screeps.logger");
logger = new logger("util.pStar");
//logger.enabled = false;
logger.color = COLOR_YELLOW;

let roomUtil = require("util.pStar.room");
let pStarRoom = roomUtil.classes.pStarRoom;
let Node = roomUtil.classes.Node;
let Edge = roomUtil.classes.Edge;
let DestinationInfo = roomUtil.classes.DestinationInfo;
let IndexingCollection = global.utils.array.classes.IndexingCollection;





class pStar {
    constructor() {
        
        this.edges = new IndexingCollection("id", ["node1Id", "node2Id"], [20000, 200000, 1000000]);
        
        this.distances = new IndexingCollection("id", ["origin.id", "goal.id"], [1000, 1000000]);

        this.rooms = new IndexingCollection("roomName", [], [1000, 3000]);
        this.roomAdditionQueue = [];

        this.roomTicksValid = 10000;
        this.maxRoomUpdatesPerTick = 1;
        this.maxRoomAdditionsPerTick = 5;

        this.nodeTicksValid = 10000;
        this.maxNodeUpdatesPerTick = 10;
        this.edgeTicksValid = 100000;
        this.maxEdgeUpdatesPerTick = 1;


        this.maxDistanceToBaseNodeForRooms = 100;
        
    }

    addRoomToAdditionQueue(roomName) {
        if (this.rooms.hasId(roomName)) { //already in the network
            //logger.log(roomName, "is already in the network, dumbass.")
            return false;
        }
        if (this.roomAdditionQueue.indexOf(roomName) != -1) { //already in the queue
            //logger.log(roomName, "already in queue, we're done");
            //_.remove(this.roomAdditionQueue, roomName);
            return false;
        }
        this.roomAdditionQueue.push(roomName);
        return true;
    }

    getNodesByType(type) {
        let nodes = [];
        for(let r in this.rooms.thingsById) {
            /** @type {pStarRoom} */
            let room = this.rooms.thingsById[r];
            let roomNodeIds = room.nodes.getGroupWithValue("type", type);
            for(let i in roomNodeIds) {
                let id = roomNodeIds[i];
                let node = room.nodes.thingsById[id];
                nodes.push(node);
            }
        }
        return nodes;
    }

    addRoomsToNetwork(maxRoomsToAdd=0) {
        let roomsAdded = 0;
        
        let baseNodes = this.getNodesByType(Node.BASE)
        if (!baseNodes) {
            //no base nodes yet, why are you even here bro
            return;
        }
        let minDistToBaseNode = (pos) => {
            //logger.log("checking dist to base node", pos, baseNodes)
            let minDist = 9999999999;
            for(let b in baseNodes) {
                let baseNode = baseNodes[b];
                //logger.log('why are we here?', b, baseNode, baseNodes)
                let roomDist = global.utils.pStar.findDistance(pos, baseNode.pos);
                if (!!roomDist) {
                    minDist = Math.min(minDist, roomDist);
                }
                
            }
            return minDist;
        };
        let excludedRooms = [];
        //add rooms until we're out or reach our max for this tick
        while(this.roomAdditionQueue.length > 0 && roomsAdded < this.maxRoomAdditionsPerTick) {            
            let roomName = this.roomAdditionQueue.shift();
            if (!roomName) continue;
            //logger.log(roomName);
            let center = new RoomPosition(25, 25, roomName);
            let DistToBase = minDistToBaseNode(center);
            //logger.log("should we add this room?", roomName, center, DistToBase)
            if (DistToBase > this.maxDistanceToBaseNodeForRooms) {
                if (DistToBase == 9999999999) {
                    excludedRooms.push(roomName);
                }
                
                continue;
            }
            if (!this.rooms.hasId(roomName)) {
                let room = new pStarRoom(roomName);
                this.rooms.add(room);
                this.edgeQueueRefreshed = 0;
            }
            roomsAdded++;
            if (maxRoomsToAdd != 0 && roomsAdded >= maxRoomsToAdd) {
                break;
            }
        }
        if (excludedRooms.length > 0) {
            this.roomAdditionQueue = this.roomAdditionQueue.concat(excludedRooms);
            logger.log("queue left",this.roomAdditionQueue)
        }
        logger.log(roomsAdded, "rooms added!")
    }

    refineRooms() {
        let rooms = _.sortBy(this.rooms.getAll(), (r) => r.lastUpdated);
        let roomsRefined = 0;
        for(let r in rooms) {
            /** @type {pStarRoom} */
            let room = rooms[r];
            let updated = room.refineRoom();
            if (updated) {
                roomsRefined++;
            }
            if (roomsRefined >= this.maxRoomUpdatesPerTick) {
                break;
            }
        }
        logger.log(roomsRefined, "rooms refined");
        return roomsRefined;
    }

    /**
     * 
     * @param {string} roomName 
     * 
     * @returns {pStarRoom}
     */
    getRoom(roomName) {
        let room = this.rooms.getById(roomName);
        return room;
    }

    displayRooms() {
        let rooms = this.rooms.getAll();
        for(let r in rooms) {
            /** @type {pStarRoom} */
            let room = rooms[r];
            room.displayRoom();
        }
        logger.log("displayed rooms.  Total rooms", rooms.length)
    }

    /**
     * 
     * @param {Node} node1 
     * @param {Node} node2 
     */
    addEdge(node1, node2) {
        let edgeId = Edge.makeEdgeId(node1.id, node2.id);
        if (!this.edges.has(edgeId)) {
            let edge = new Edge(node1, node2);
            this.edges.add(edge);
        } else {
            throw new Error("adding edge that already exists!", edgeId)
        }
        node1._destMap = false;
        node2._destMap = false;
    }
    removeEdge(edge) {
        this.edges.remove(edge);
    }

    refineEdges_old() {
        let edges = _.filter(this.edges.getAll(), (e) => e.edgeNeedsRefinement());
        edges = _.sortBy(edges, (e) => e.cost);
        let edgesRefined = 0;
        for(let e in edges) {
            /** @type {Edge} */
            let edge = edges[e];
            let refined = edge.refineEdge();
            if (refined) {
                edgesRefined++;
            }
            if (edgesRefined >= this.maxEdgeUpdatesPerTick) {
                break;
            }
        }
        logger.log(edgesRefined, "edges refined");
        return edgesRefined;
    }


    getEdgeRefineQueue() {
        
        if (!this.edgeRefineQueue || !this.edgeQueueRefreshed || (this.edgeRefineQueue.length == 0 && Game.time - this.edgeQueueRefreshed > 10)) {
            let allEdges = this.edges.getAll();
            let edges = _.filter(allEdges, (e) => e.edgeNeedsRefinement());
            edges = _.sortBy(edges, (e) => e.cost).reverse();
            //logger.log('got edges to refine:', JSON.stringify(edges))
            this.edgeRefineQueue = edges;
            this.edgeQueueRefreshed = Game.time;
        }
        
        //logger.log("get edge", allEdges.length, this.edgeRefineQueue.length, Game.time - this.edgeQueueRefreshed)
        return this.edgeRefineQueue;
    }
    refineEdges() {
        let start = Game.cpu.getUsed();

        let edges = this.getEdgeRefineQueue();
        
        let edgesRefined = 0;
        //logger.log("after filter", Game.cpu.getUsed() - start);
        
        let edge;
        //for(let e in edges) {
        while(edge = edges.shift()) {
            /** @type {Edge} */
            // if (!edge.edgeNeedsRefinement()) {
            //     continue;
            // }
            //edge.
            let {node1, node2} = edge.getNodes();
            let path = global.utils.pStar.findPath(node1, node2);
            let refined = path.ops > 0;
            if (refined) {
                edgesRefined++;
            }
            if (edgesRefined >= this.maxEdgeUpdatesPerTick) {
                break;
            }
        }
        //logger.log("after loop", Game.cpu.getUsed() - start);        
        //logger.log(edgesRefined, "edges refined, ", edges.length, "remaining");
        return edgesRefined;
    }


    hasNode(node) {
        if (!(node instanceof Node)) {
            throw new Error("Adding invalid Node:", node);
        }
        /** @type {pStarRoom} */
        let room = this.rooms.thingsById[node.pos.roomName];//get room without triggering the room as "used"
        if (!room) {
            if (node.type == Node.BASE) {
                return false;//allow checks for base nodes, as an add should follow. 
            } else {
                //our room doesn't exist.. this prolly shouldn't happen..
                logger.log(node.id, node.pos.roomName, this.rooms.has(node.pos.roomName))
                throw new Error("node's room doesn't exist");
            }
            
        }
        return room.hasNode(node);
    }

    addNode(node) {
        if (!(node instanceof Node)) {
            throw new Error("Adding invalid Node:", node);
        }
        /** @type {pStarRoom} */
        let room = this.getRoom(node.pos.roomName); //triggers "used" for the room
        if (!room) {
            if (node.type == Node.BASE) {
                //if the room doesn't exist, and we're adding a base node, create the room and add it right quick
                room = new pStarRoom(node.pos.roomName);
                this.rooms.add(room);
                room.refineRoom();
            } else {
                //our room doesn't exist.. this prolly shouldn't happen..
                logger.log(node.id, node.pos.roomName, this.rooms.has(node.pos.roomName))
                throw new Error("node's room doesn't exist");
            }

            
        }
        room.addNode(node);
        closestNodeLookup = {};
    }

    /**
     * Kinda expensive once you've got thousands of rooms.. I'd think.. 
     * @param {String} nodeId 
     */
    getNode(nodeId) {
        let node = false;
        let rooms = this.rooms.getAll();
        for(let r in rooms) {
            let room = rooms[r];
            node = room.getNode(nodeId);
            if (node) {
                break;
            }
        }
        return node;
    }
    removeNode(node) {
        if (!(node instanceof Node)) {
            throw new Error("Adding invalid Node:", node);
        }
        /** @type {pStarRoom} */
        let room = this.getRoom(node.pos.roomName); //triggers "used" for the room
        room.removeNode(node);
    }




    displayNodes() {

        let allEdges = this.edges.getAll();
        for(let e in allEdges) {
            let edge = allEdges[e];
            //if (!edge.path._cachedPath) { //display all non cached paths
            //logger.log(JSON.stringify(edge))
                edge.displayEdge("#999", 0.3);
            //}
        }
        logger.log("total edges:", Object.keys(this.edges.thingsById).length);
        logger.log("Rooms Covered:", Object.keys(this.rooms.thingsById).length)

    }

    /**
     *    Pathing
     */

    /**
     * 
     * @param {RoomPosition} startPos 
     * @param {RoomPosition} destinationPos 
     */
    findPath(startPos, destinationPos) {
        let startNode = this.findClosestNode(startPos);
        let endNode = this.findClosestNode(destinationPos);
        if (!startNode || !endNode) {
            return false;
        }
        let nodePath = startNode.findNodePathTo(endNode);
        if (nodePath.incomplete) {
            nodePath = global.utils.pStar.findPath(startNode, endNode);
        }
        return nodePath;
    }

    serializeFindPath(path) {
        //path is an array of nodes
        let ids = [];
        for (let n in path) {
            let node = path[n];
            ids.push(node.id);
        }
        return ids.join("|");
    }
    deserializeFindPath(str) {
        let ids = str.split("|");
        let path = [];
        for (let i in ids) {
            let id = ids[i];
            let node = this.getNode(id);
            path.push(node);
        }
        return path;
    }

    displayFindPath(path, color="#ddd", opacity) {
        let lastNode = false;
        for(let n in path) {
            /** @type {Node} */
            let node = path[n];
            global.utils.visual.circle(node.pos, color, opacity, 0.5)
            //node.displayNode();
            if (lastNode) {
                let edgeId = Edge.makeEdgeId(node.id, lastNode.id);
                /** @type {Edge} */
                let edge = this.edges.thingsById[edgeId];
                if (!edge) {
                    logger.log("edge doesn't exist... how the fuck did you make this path bruh?")
                } else {
                    edge.displayEdge(color, opacity);
                }
                
            }
            lastNode = node;
        }
    }
    /**
     * takes in a node path and returns an object with the next edge and remaining path
     * @param {[Node]} path 
     */
    getNextEdge(path) {
        if (path.length < 2) {
            throw new Error("Calling next edge on finished path")
        }
        /** @var {Node} */
        let currentNode = path[0];
        /** @var {Node} */
        let nextNode = path[1];
        let edgeId = Edge.makeEdgeId(currentNode.id, nextNode.id);
        let edge = this.edges.getById(edgeId);
        path.shift();//remove first element
        return {
            edge: edge,
            path: path
        }
    }


    moveTo(creep, goal) {
        let start = Game.cpu.getUsed();
        let log = (...args) => {
            let usedNow = Game.cpu.getUsed();
            let used = usedNow - start;
            logger.log("cpu used:", used, ...args);
            start = usedNow;
        }


        let moveToColor = "#f00";
        let pStarColor = "#00f";
        let pStarColorOnPath = "#0f0";
        let atNodeTolerance = creep.pos.isEdge() ? 0 : 2;

        //creep.memory.pStarPath = false;
        let pathInfo = creep.memory.pStarPath || {
            path: false,
            pathStage: false, // 0 = walking to first node, 1 = traveling through node network, 2 = walking to destination node
            edgeId: false,
            method: "",
            done: false,
            goal: goal.pos,
        }
        //check for goal change
        //logger.log("wtf", JSON.stringify(pathInfo.goal))
        if (!goal.pos.isEqualTo(new RoomPosition(pathInfo.goal.x, pathInfo.goal.y, pathInfo.goal.roomName))) {
            logger.log(creep.name, "goal changed", goal.pos, JSON.stringify(pathInfo.goal), goal.pos.isEqualTo(pathInfo.goal))
            creep.memory.pStarPath = {
                path: false,
                pathStage: false, // 0 = walking to first node, 1 = traveling through node network, 2 = walking to destination node
                edgeId: false,
                method: "",
                done: false,
                goal: goal.pos,
            };
            pathInfo = creep.memory.pStarPath
            //logger.log(pathInfo.nextNode);
        }

        //log("init done")
        let path = false;
        //logger.log(creep.name, "initial move method", pathInfo.method)
        //initial state.  search for path
        if (pathInfo.method == "") {
            let path = this.findPath(creep.pos, goal.pos);
            //logger.log(creep.name, "path", JSON.stringify(path));
            if (path && !path.incomplete) {
                pathInfo.method = "pStar";
                pathInfo.path = this.serializeFindPath(path.path);
                pathInfo.pathStage = 0; //walk to first node
                path = path.path;
            } else {
                logger.log(creep.name, "incomplete node path!")
                pathInfo.method = "moveTo";
                //global.no();
            }
        }
        //log("pathfinding done", pathInfo.method)
        //if we're using pStar and the path hasn't been loaded from original pathfinding
        if (pathInfo.method == "pStar" && path === false) {
            path = this.deserializeFindPath(pathInfo.path);
        }
//logger.log('jkj', path)
        if (path == "false" || (!pathInfo.edgeId && path.length==1)) {
            logger.log(creep.name, "doesn't know what is going on, so he's gonna walk.")
            pathInfo.method = "moveTo";
        }



        //log("starting switch");
        switch(pathInfo.method) {
            case "pStar":
                //extract current and nextnodes
                let edge = pathInfo.edgeId ? this.edges.getById(pathInfo.edgeId) : false;
            
                if (path.length < 1) {
                    logger.log(creep.name, "ran out of path and didn't notice!", JSON.stringify(path));
                    //we're dumb, just walk
                    pathInfo.method = "moveTo"
                }

                let getNextEdge = () => {
                    let nextEdgeInfo = this.getNextEdge(path);
                    //logger.log("next edge", nextEdgeInfo.edge.id, JSON.stringify(nextEdgeInfo.path))
                    edge = nextEdgeInfo.edge;
                    pathInfo.path = this.serializeFindPath(nextEdgeInfo.path);
                    pathInfo.edgeId = edge.id;
                    path = nextEdgeInfo.path;
                };
                //logger.log("why no edge?", edge, JSON.stringify(path));
                if (!edge && path.length >= 2) { //get edge from path
                    getNextEdge();
                    //global.no();
                }

                if (!edge) {
                    logger.log(edge, path, JSON.stringify(pathInfo))
                    logger.log(creep.name, "HAS NO EDGE TO FOLLOW!!! ------------- ERRRRRRRRRRRRROOOORRRRRRR");
                    //throw new Error("no edge defined!");
                    pathInfo.method = "moveTo";
                    creep.say("lost path");
                    break;
                }
                //log("moving")

                creep.say(pathInfo.pathStage);

                //  ------------  preform the actual move ---------------------
                if (pathInfo.pathStage == 0) {//-----------------------------get in range of first node
                    //try walking on edge
                    let nextNode = path[0];
                    
                    let ret = edge.path.moveOnPath(creep, nextNode, goal);
                    logger.log(creep.name, "moving on first edge", edge.id, JSON.stringify(ret));
                    if (ret.onPath || ret.closeToPath) {
                        edge.displayEdge(pStarColorOnPath);
                    } else {
                        edge.displayEdge(moveToColor);
                    }

                    if (ret.done) {
                        //move to next stage
                        pathInfo.pathStage = 1;
                    }
                    // let secondNode = path[0];
                    // let firstNode = 
                    // logger.log(path);
                    // if (creep.pos.inRangeTo(firstNode.pos, atNodeTolerance)) {
                    //     pathInfo.pathStage = 1; //at first node, move to next stage
                    // } else {
                    //     let ret = creep.moveTo(firstNode.pos, {range: atNodeTolerance, visualizePathStyle:{stroke:pStarColor}});
                    //     logger.log(creep.name, "moving to first node", firstNode.id, ret);
                    // }
                    //log('stage 0')
                }
                
                if (pathInfo.pathStage == 1) { //--------------------follow node network path
                    
                    /** @type {Node} */
                    let nextNode = path[0];

                    if (creep.pos.inRangeTo(nextNode.pos, atNodeTolerance)) {
                        //at next node, go to next leg or skip to next stage
                        if (path.length < 2) { //at the end of the node path, go to next stage
                            //leave existing path in memory so we can stil load the nodes
                            //logger.log(creep.name, nextNode.id);
                            pathInfo.pathStage = 2;
                        } else {
                            //at next leg, get next edge and update pathinfo's path as well
                            getNextEdge();

                            //also reload currentNode and nextNode
                            nextNode = path[0];
                        }
                    }

                    //if we're still on pathStage == 1, then actually do the move
                    if (pathInfo.pathStage == 1) {
                        //logger.log(creep.name, "moving to", nextNode.id, edge);
                        if (!edge.path) {
                            //if this is undefined, then shit ain't right.
                            pathInfo.method = "moveTo";
                            creep.say("Lost path");
                            break;
                        }
                        let ret = edge.path.moveOnPath(creep, nextNode, goal);
                        //display edge when walkin on it
                        edge.displayEdge(pStarColorOnPath);
                        if (ret.done) {
                            if (path.length <= 2) {
                                //global.no();
                                pathInfo.pathStage = 2;
                            } else {
                                //this edge is done
                                getNextEdge();
                            }
                            
                        }
                        //logger.log(creep.name, "moving on edge", edge.id, ret)
                    }
                    //log('stage 1')
                }
                
                if (pathInfo.pathStage == 2) {//------------------------go to goal
                    //global.no();
                    if (creep.pos.inRangeTo(goal.pos, goal.range)) {
                        pathInfo.done = true;
                        //logger.log(creep.name, "at goal", goal.pos);
                    } else {
                        let ret = creep.moveTo(goal.pos, {range: goal.range, visualizePathStyle:{stroke:pStarColor}});
                        //logger.log(creep.name, "moving to goal", goal.pos, ret);
                    }
                    //log('stage 2')
                }



                
                break;
            case "moveTo":
                    let ret = creep.moveTo(goal.pos, {range: goal.range, visualizePathStyle:{stroke:moveToColor}});
                break;
            default:
                logger.log(creep, goal, JSON.stringify(pathInfo))
                throw new Error("invalid movement method");
                break;
        }
        creep.memory.pStarPath = pathInfo;
        return pathInfo;
    }



    /**
     * Find the node closest to a room position(by range), only searches in same and adjecent rooms.
     * @param {RoomPosition} pos 
     * @returns {Node|boolean} The closest node, or false
     */
    findClosestNode(pos) {
        let start = Game.cpu.getUsed();
        let log = (...args) => {
            let usedNow = Game.cpu.getUsed();
            let used = usedNow - start;
            logger.log("cpu used:", used, ...args);
            start = usedNow;
        }
        //logger.log("find closest node", pos)
        let closestNode = false;
        let roomsToCheck = [pos.roomName];
        
        
        //log("got rooms")
        
        let cheapestNode = false;
        let cheapestCost = 1000000;
        
        while(roomsToCheck.length > 0) {
            let roomName = roomsToCheck.shift();
            

            let pStarRoom = this.rooms.thingsById[roomName];
            if (!pStarRoom) {
                //logger.log("trying to get a room that doesn't exist, skip it, there's no nodes there bro");
                continue;
            }
            let roomNodes = pStarRoom.nodes.getAll();
            //logger.log(JSON.stringify(roomNodes))
            if (roomNodes) {
                //check these nodes
                for(let n in roomNodes) {
                    let node = roomNodes[n];
                    //logger.log(node.id, node, node.pos, pStarRoom.roomName)
                    //global.utils.visual.circle(node.pos, "#f00", 1, 0.5)
                    let nodeCost;
                    //logger.log(node, node.pos, pos);
                    if (pos.roomName == node.pos.roomName) {
                        nodeCost = pos.getRangeTo(node.pos);
                    } else {
                        nodeCost = pos.toWorldPosition().getRangeTo(node.pos);
                    }
                    if (nodeCost < cheapestCost) {
                        cheapestNode = node;
                        cheapestCost = nodeCost;
                    }
                }
            }
            //log("checked room: " + roomName + " " + (roomName == pos.roomName))
            if (roomName == pos.roomName && cheapestNode === false) {
                //logger.log("not found yet, adding neighbors", cheapestNode);

                let exits = Game.map.describeExits(pos.roomName);
                for(let dir in exits) {
                    let exitRoomName = exits[dir];
                    roomsToCheck.push(exitRoomName);
                }
            }
        }
        if (cheapestNode) {
            global.utils.visual.circle(cheapestNode.pos, "#0f0", 1, 1)
        }
        //log("got node")
        return cheapestNode;
    }


    logNetwork() {
        logger.log("----------------------Network dump--------------------------")

        let rooms = this.rooms.getAll();
        for(let r in rooms) {
            /** @type {pStarRoom} */
            let room = rooms[r];
            let nodes = room.nodes.getAll();
            logger.log("room:", room.roomName, nodes.length);
            for(let n in nodes) {
                /** @type {Node} */
                let node = nodes[n];
                logger.log("--node:", node.id, node.type);
            }
            let output = "";
            room.posEdgeMap.forEach((edgeId, pos) => {
                output += `${pos.x}-${pos.y} ${edgeId}, `;
            })
            logger.log("edge map", output);
        }
        logger.log('------edges------')
        let edges = this.edges.getAll();
        for(let e in edges) {
            /** @type {Edge} */
            let edge = edges[e];
            logger.log("edge:", edge.id, edge.path.path, edge.cost)
        }
    }



    serialize() {
        
        let obj = {
            rooms: this.rooms.serialize(),
            edges: this.edges.serialize(),
            dists: this.distances.serialize(),
            rmQue: this.roomAdditionQueue.join("|"),
            edgeTicksValid: this.edgeTicksValid,
            maxEdgeUpdatesPerTick: this.maxEdgeUpdatesPerTick
        }
        let oldE = logger.enabled;
        logger.enabled = true;
        logger.log("total Rooms:", Object.keys(this.rooms.thingsById).length, Object.keys(this.rooms.thingsById));
        logger.log("total nodes in rooms:", _.reduce(this.rooms.thingsById, (res, room, roomName) => {
            //logger.log("tttt",room, roomName)
            res += Object.keys(room.nodes.thingsById).length;
            return res;
        }, 0));
        logger.log("total edges:", Object.keys(this.edges.thingsById).length);
        logger.log("total destinations:", Object.keys(this.distances.thingsById).length);
        logger.log("size breakdown, rooms:", obj.rooms.length, " edges:", obj.edges.length, "destinations:", obj.dists.length);
        logger.enabled = oldE;
        return JSON.stringify(obj);
    }
    static deserialize(str) {
        let obj = JSON.parse(str);
        let inst = new pStar();

        //have to override the global instance so the underlying classes can see inst instead of the global instance.\

        let oldInst = global.utils.pStar.inst;
        global.utils.pStar.inst = inst;


        inst.roomAdditionQueue = obj.rmQue.split("|");

        let nLims = inst.rooms.limits;
        let eLims = inst.edges.limits;
        let dLims = inst.distances.limits;
        inst.rooms = IndexingCollection.deserialize(obj.rooms, pStarRoom);
        //logger.log("deserialized rooms", obj.rooms)
        inst.rooms.limits = nLims;
        inst.edges = IndexingCollection.deserialize(obj.edges, Edge);
        inst.edges.limits = eLims;
        if (obj.dists) {
            inst.distances = IndexingCollection.deserialize(obj.dists, DestinationInfo);
            inst.distances.limits = dLims;
        }
        
        global.utils.pStar.inst = oldInst;

        inst.edgeTicksValid = obj.edgeTicksValid;
        inst.maxEdgeUpdatesPerTick = obj.maxEdgeUpdatesPerTick;

        return inst;
    }
}



//global.profiler.registerClass(pStar,"pStar");
//pStar.deserialize = global.profiler.registerFN(pStar.deserialize, "pStar.deserialize");

let inst = new pStar();

let closestNodeLookup = new Map();

module.exports = {
    classes: {
        pStar,
        Node,
        Edge,
        pStarRoom
    },
    inst,


    findDistance(startPos, endPos, maxOps = 1000, refinePath = false) {
        let start = Game.cpu.getUsed();
        let log = (...args) => {
            let usedNow = Game.cpu.getUsed();
            let used = usedNow - start;
            logger.log("cpu used:", used, ...args);
            start = usedNow;
        }
        let startNode;
        let endNode;
        if (closestNodeLookup[startPos]) {
            startNode = closestNodeLookup[startPos];
        } else {
            startNode = this.inst.findClosestNode(startPos);
            closestNodeLookup[startPos] = startNode;
        }
        if (closestNodeLookup[endPos]) {
            endNode = closestNodeLookup[endPos];
        } else {
            endNode = this.inst.findClosestNode(endPos);
            closestNodeLookup[endPos] = endNode;
        } 
        
        //logger.log(closestNodeLookup[startPos]);
        //logger.log(closestNodeLookup[endPos]);
        //log('got start nodes')
        //logger.log("wtf", startNode, endNode)
        if (!startNode || !endNode) {
            return false;
        }

        let pathCost;
        if ((startNode._destMap && startNode._destMap[endNode.id]) || (endNode._destMap && endNode._destMap[startNode.id])) {
            if (startNode._destMap && startNode._destMap[endNode.id]) {
                pathCost = startNode._destMap[endNode.id].travelCost;
            } else {
                pathCost = endNode._destMap[startNode.id].travelCost;
            }
        } else {
            let path = this.findPath(startNode, endNode, maxOps, refinePath);
            if (path.incomplete) {
                return false;
            }
            pathCost = path.cost;
        }
        
        



        let startDist = startNode.pos.toWorldPosition().getRangeTo(startPos);
        let endDist = endNode.pos.toWorldPosition().getRangeTo(endPos);
        let range = Number.parseInt(startDist) + Number.parseInt(pathCost) + Number.parseInt(endDist);
        //log("got full range:" + range)
        return range;
    },
     /**
     * find a path through the pStar network using A*.. maybe.. 
     * @param {Node} startNode 
     * @param {Node} endNode 
     * @param {IndexingCollection} allNodes 
     */
    findPath(startNode, endNode, maxOps=100, refinePath=true, recursing=false) {
        let start = Game.cpu.getUsed();
        let log = (...args) => {
            let usedNow = Game.cpu.getUsed();
            let used = usedNow - start;
            logger.log("cpu used:", used, ...args);
            start = usedNow;
        }
        
        let openNodes = new global.utils.array.classes.PriorityQueue((a, b) => {
            return a.f < b.f;//compare 
        });
        let heuristic = (node, goal) => {
            return node.getDistanceTo(goal);
        }
        

        let nodeInfoLookup = {}; //node.id -> node
        let startNodeInfo = {
            node: startNode,
            parent: false,
            h:heuristic(startNode, endNode),//heuristic to goal node
            g:0,//shortest distance to source node
            f:0,//g+h, fscore for this node, best possible distance to goal
            closed: false,
        };
        nodeInfoLookup[startNode.id] = startNodeInfo;
        openNodes.push(startNodeInfo);
        //log("starting loop")
        let opts = 0;
        //new DestinationInfo(this, otherNode, otherNode, edge.cost);
        while(openNodes.size() > 0) {
            if (opts > maxOps) {
                break;
            }
            let nodeInfo = openNodes.pop();
            /** @type {Node} */
            let node = nodeInfo.node;
            //logger.log("processing node", JSON.stringify(nodeInfo));
            
            

            //process node
            //if edge to parent is not refined, then refine it, recalculate our g score and re-add the node and skip to next node
            if (nodeInfo.parent && refinePath) {
                
                /** @type {Node} */
                let parentNode = nodeInfo.parent;
                let parentEdgeId = Edge.makeEdgeId(node.id, parentNode.id);
                /** @type {Edge} */
                let parentEdge = global.utils.pStar.inst.edges.getById(parentEdgeId);

                

                //let parentEdge = node.getNodeEdge(parentNode);
                if (!parentEdge) {
                    //network is broken!
                    // logger.log('network broken, missing parent edge')
                    // logger.log(node.id, parentNode.id);
                    // logger.log(parentEdge, parentEdgeId);
                    // let edgeId = Edge.makeEdgeId(node.id, parentNode.id);
                    // logger.log(edgeId);
                    // logger.log("id error??", new Edge(parentNode, node).id == edgeId);
                    // logger.log(this.inst.edges.getById(edgeId))
                    // logger.log(this.inst.edges.thingsById[parentEdgeId]);
                    let parentNodeInfo = nodeInfoLookup[parentNode.id];
                    logger.log("clearly we are lost, the network has changed. Re-add our parent into open nodes", node.id, parentNode.id, JSON.stringify(parentNodeInfo));
                    parentNodeInfo.closed = false;
                    openNodes.push(parentNodeInfo);
                    delete nodeInfoLookup[node.id];
                    continue;
                }

                let refined = parentEdge.refineEdge();
                //logger.log(node.id, "has parent, edge refined?", refined);
                if (refined) {
                    let parentNodeInfo = nodeInfoLookup[parentNode.id];
                    //logger.log(nodeInfoLookup[parentNode.id])
                    //logger.log("wtf")
                    //logger.log("edge refined, re-opening parent node incase path is gone", node.id, parentNode.id, JSON.stringify(parentNodeInfo));
                    parentNodeInfo.closed = false;
                    openNodes.push(parentNodeInfo);
                    delete nodeInfoLookup[node.id];
                    continue;

                    //if the edge was refined, recalc the scores for this node and add it back into the queue and skip to next node
                    //recalc g score
                    //logger.log(parentEdge.id, 'edge refined', node.id, "going back into queue")
                    //logger.log(JSON.stringify(nodeInfo))
                    // let parentNodeInfo = nodeInfoLookup[parentNode.id];
                    // if (!parentNodeInfo) {
                    //     logger.log("Lost parent info, skipping node")
                    //     continue;
                    // }
                    // nodeInfo.g = Number.parseInt(parentNodeInfo.g) + Number.parseInt(parentEdge.cost);
                    // nodeInfo.f = nodeInfo.g + nodeInfo.h;
                    // openNodes.push(nodeInfo);
                    // continue;
                }
            } else if (refinePath) {
                //logger.log(node.id, "has no parent set.. is it the initial node, cuz otherwise you're a dumbass")
            }


            //logger.log(node.id, "closed", JSON.stringify(nodeInfo))
            //logger.log(node.destinationsMap[endNode.id] ? node.destinationsMap[endNode.id].travelCost : "node has no stored path" + nodeInfo.g)
            //by this point the edge to our parent is refined, and we are not the target node.  Do normal A* action and mark this node closed
            //logger.log(node.id, "closed", nodeInfo.g)
            if (!(nodeInfo.g == 0 || nodeInfo.g > 0)) {
                throw new Error("g is null!?!? " + nodeInfo);
            }
            
            nodeInfo.closed = true;
            
            //wait until after parent edge has been updated to say we've reached the goal.
            if (node.pos.isEqualTo(endNode.pos)) {
                //logger.log("found path!", startNode.id, endNode.id);
                //logger.log(JSON.stringify(nodeInfo));
                //get the actual path
                let path = [];
                let thisNodeInfo = nodeInfo;
                let lastNode = false;
                while(thisNodeInfo != false) { //follow back to start node and extract nodes into path array
                    let node = thisNodeInfo.node;
                    path.push(node);

                    if (lastNode) {
                        //for all nodes other than the end node(first node in path), add a destination to the endNode with the g score of that nodeInfo
                        
                        
                        //cost is total path cost, minus the g score of this node
                        let thisCost = nodeInfo.g - thisNodeInfo.g;
                        let dest = new DestinationInfo(node, endNode, lastNode, thisCost);
                        //logger.log(node.id, "adding destination", JSON.stringify(dest))
                        node.addDestination(dest);
                    }
                    if (thisNodeInfo.parent) {
                        

                        thisNodeInfo = nodeInfoLookup[thisNodeInfo.parent.id];//next node up the path
                    } else {
                        //end of path, node == startNode
                        thisNodeInfo = false;
                    }
                    lastNode = node;
                }

                return {
                    path: path.reverse(),
                    incomplete: false,
                    cost: nodeInfo.g,
                    hops: path.length,
                    ops: opts
                };
            }
            

            let neighborEdges;
            if (node.destinationsMap[endNode.id]) {
                //logger.log('found a node that knows the way', node.id, endNode.id, node.destinationsMap[endNode.id].serialize())
                //this node already knows the shortest path to the destination, so don't add it's neighbors because they suck
                /** @type {DestinationInfo} */
                let destInfo = node.destinationsMap[endNode.id];
                neighborEdges = [Edge.makeEdgeId(node.id, destInfo.nextNode.id)];
                let path = node.findNodePathTo(endNode);
                let thisNodeInfo = nodeInfo;
                let lastNode = false;
                while(!!thisNodeInfo) {
                    let node = thisNodeInfo.node;
                    

                    if (lastNode) {
                        //for all nodes other than the end node(first node in path), add a destination to the endNode with the g score of that nodeInfo
                        
                         path.path.unshift(node);
                         path.hops++;
                        //cost is total path cost, minus the g score of this node, plus path cost
                        let thisCost = nodeInfo.g - thisNodeInfo.g + path.cost;
                        let dest = new DestinationInfo(node, endNode, lastNode, thisCost);
                        //logger.log(node.id, "adding destination", JSON.stringify(dest))
                        node.addDestination(dest);
                    }
                    if (thisNodeInfo.parent) {
                        thisNodeInfo = nodeInfoLookup[thisNodeInfo.parent.id];//next node up the path
                    } else {
                        //end of path, node == startNode
                        thisNodeInfo = false;
                    }
                    lastNode = node;
                }
                path.ops = opts;
                path.cost = path.cost + nodeInfo.g;
                //logger.log(node.id, "knows the path, only adding next node's edge", JSON.stringify(path));
                
                return path;
            } else {
                neighborEdges = node.allEdges;
            }

            //log(nodeInfo.node.id, "closed")
            //get neighbors, init them if needed, and add them to the queue with this node as parent if that lowsers their g score, otherwise leave them be
            // let neighbors = node.edgeNodes;
            // for(let n in neighbors) {
            //     /** @type {node} */
            //     let neighbor = neighbors[n];
            //     let edgeToNode = node.getNodeEdge(neighbor);
            //     if (neighbor.closed || neighbor === node) {
            //         continue;
            //     }
            
            for(let n in neighborEdges) {
                    let edgeToNodeId = neighborEdges[n];
                    /** @type {Edge} */
                    let edgeToNode = global.utils.pStar.inst.edges.thingsById[edgeToNodeId];
                    /** @type {Node} */
                    //logger.log(edgeToNode)
                    let neighbor = edgeToNode.getOtherNode(node);
                let neighborInfo = nodeInfoLookup[neighbor.id];
                let newGScore = Number.parseInt(nodeInfo.g) + Number.parseInt(edgeToNode.cost);
                //logger.log(node.id, "checking neighbor", neighbor.id, newGScore, edgeToNode.cost, nodeInfo.g);
                //logger.log(JSON.stringify(edgeToNode.path))
                if (!neighborInfo) {
                    //logger.log('adding new node', neighbor.id)
                    //new node!
                    neighborInfo = {
                        node: neighbor,
                        parent: node,
                        h: Number.parseInt(heuristic(neighbor, endNode)),//heuristic to goal node
                        g: newGScore,//shortest distance to source node
                        f:0,//g+h, fscore for this node
                        closed: false,
                    };
                    //update f score
                    neighborInfo.f = neighborInfo.h + neighborInfo.g;
                    //store node info
                    nodeInfoLookup[neighbor.id] = neighborInfo;
                    //add to open nodes
                    openNodes.push(neighborInfo);
                    //log(nodeInfo.node.id, "added friend", neighbor.id);
                } else {
                    //logger.log("nighbor already exists", neighbor.id);
                    //we've seen this node before, check if we've got there cheaper than before.
                    if (newGScore < neighborInfo.g) { //we can provide a better path to the neighbor, swap our node info with the one in the queue
                        //logger.log(node.id, "found better path to", neighbor.id);
                        //logger.log("replacing node because we found a better path", JSON.stringify(openNodes))
                        neighborInfo.parent = node;
                        neighborInfo.g = newGScore;
                        neighborInfo.f = neighborInfo.h + neighborInfo.g;
                        openNodes.replaceByValue(neighborInfo, (a, b) => {return a.node.id == b.node.id});
                        //logger.log(JSON.stringify(openNodes));
                    }
                    //log(nodeInfo.node.id, "added friend", neighbor.id);
                }
            }
            opts++;
            //log(nodeInfo.node.id, "friends added")
        }

        logger.log("we're dumb, and didn't find a path.. one prolly exists tho.. stupid head.", startNode.pos, endNode.pos);
        logger.log(JSON.stringify(nodeInfoLookup));
        
        //wtf do we do here??
        //let's try adding an edge between these nodes and then returning a failed path.  Then later, the edge we added should make this not fail, and result in the edge we added being refined into the network, in case it's redundant.
        //maybe add edge, then recursivly call ourselves?
        this.inst.addEdge(startNode, endNode);
        
        //throw new Error("invalid path!" + startNode.pos + " " + endNode.pos);
        if (!recursing) {
            return this.findPath(startNode, endNode, maxOps, refinePath, true);
        } else {
            throw new Error("I think I broke some shit.. or you did.  I'ma blame you, cool?");
            //Game.cpu.halt();
        }
        
        return {
            path: [],
            incomplete: true,
            cost: false,
            hops: maxOps,
            ops: opts
        };;
    }



}