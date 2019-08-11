
var logger = require("screeps.logger");
logger = new logger("util.pStar");
logger.color = COLOR_PURPLE;



class DestinationInfo {
    constructor(orginNode, goalNode, nextNode, cost) {
        this.orgin = orginNode;
        this.goal = goalNode;
        this.nextNode = nextNode;
        this.travelCost = cost;
    }

    get id() {
        return this.orgin.id + "_" + this.goal.id;
    }
}

// class DestinationInfo {
//     constructor(orginNode, goalNode, cost) {
//         this.orgin = orginNode;
//         this.goal = goalNode;
//         this.travelCost = cost;
//     }

//     get id() {
//         return this.orgin.id + "_" + this.goal.id;
//     }
// }

class Node {
    static get BASE() { return "🏠" }
    static get CONTROLLER_OWNED() { return "💡" }
    static get CONTROLLER_RESERVED() { return "🕯️" }
    static get STATIC_RESOURCE() { return "🔌" }
    static get BUILDING() { return "🏢" }
    static get ROOM_EXIT() { return "💨" }
    static get INTERSECTION() { return "🚦" }

    
    static get TYPES() { return [
        Node.BASE,
        Node.CONTROLLER_OWNED,
        Node.CONTROLLER_RESERVED,
        Node.STATIC_RESOURCE,
        Node.BUILDING,
        Node.ROOM_EXIT,
        Node.INTERSECTION
    ] }


    get id() {
        return `${this.pos.x}-${this.pos.y}-${this.pos.roomName}`;
    }
    constructor(pos, type, overRide = false) {
        if (overRide) {
            return;
        }
        if (Node.TYPES.indexOf(type) == -1) {
            throw new Error("invalid node type:", type);
        }
        this.pos = pos;
        this.type = type;
        this.lastUpdated = 0;

        
    }

    toJSON() {
        return this.serialize();
    }
    /**
     * A map of destNode.id => DestinationInfo 
     */
    get destinationsMap() {
        if (!this._destMap) {
            let pStar = global.utils.pStar.inst;
            let destIds = pStar.distances.getGroupWithValue("orgin.id", this.id); //list if ids
            this._destMap = {};
            for(let d in destIds) {
                let destId = destIds[d];
                let dest = pStar.distances.getById(destId);
                this._destMap[dest.goal.id] = dest;
            }
        }

        let d = this._destMap;
        this._destMap = false;
        
        return d;
    }
    get destinations() {
        let pStar = global.utils.pStar.inst;
        let destIds = pStar.distances.getGroupWithValue("orgin.id", this.id); //list if ids
        let dests = [];
        for(let d in destIds) {
            let destId = destIds[d];
            dests.push( pStar.distances.getById(destId) );
        }
        return dests;
    }
    get allEdges() {
        let pStar = global.utils.pStar.inst;
        let edges1 = pStar.edges.getGroupWithValue("node1Id", this.id);//returns array of IDs
        let edges2 = pStar.edges.getGroupWithValue("node2Id", this.id);
        if (!edges1) edges1 = [];
        if (!edges2) edges2 = [];
        return edges1.concat(edges2);
    }
    get edgeNodes() {
        let pStar = global.utils.pStar.inst;
        let edges = this.allEdges;

        let edgeNodes = {};
        for(let e in edges) {
            let edgeId = edges[e];
            let edge = pStar.edges.getById(edgeId);
            
            //logger.log("processing edge:", JSON.stringify(edge))
            let otherNode = pStar.nodes.getById(edge.node1Id == this.id ? edge.node2Id : edge.node1Id);
            edgeNodes[otherNode.id] = otherNode;
        }
        return _.values(edgeNodes);
    }
    /**
     * Grabs the edge that connects to a node, if there is one.
     * @param {Node} otherNode 
     */
    getNodeEdge(otherNode) {
        let pStar = global.utils.pStar.inst;

        let tempEdge = new Edge(this, otherNode); //just to build the id
        if (pStar.edges.has(tempEdge)) {
            //it exists!
            return pStar.edges.getById(tempEdge.id);
        }
        return false;
    }
    refineNode() {
        //logger.log("refining node:", this.id);
        let neighbors = this.edgeNodes;
        for(let n in neighbors) {
            let neighbor = neighbors[n];
            this.updatePathingWithNode(neighbor);
        }
        this.lastUpdated = Game.time;
    }

    /**
     * 
     * @param {Node} otherNode 
     */
    updatePathingWithNode(otherNode) {
        //logger.log(this.id, 'update pathing with node:', otherNode.id);
        
        let pStar = global.utils.pStar.inst;

        /** @type {Edge} */
        let edge = this.getNodeEdge(otherNode);
        //logger.log("edge cost:", edge.cost, JSON.stringify(edge));
        let destInfo = new DestinationInfo(this, otherNode, otherNode, edge.cost);
        this.addDestination(destInfo);

        //for all the distances for otherNode, add same destination with cost increased by edge len
        let otherDests = otherNode.destinations;
        for(let i in otherDests) {
            /** @type {DestinationInfo} */
            let otherDest = otherDests[i];
            
            //logger.log("check neighbor node", otherDest.goal.id, this.id, otherDest.travelCost);
            if (otherDest.goal.id == this.id || otherDest.goal.id == otherNode.id || otherDest.orgin.id == this.id) {
                //logger.log("skipping")
                continue;
            }
            //let edge = this.getNodeEdge(otherDest.goal);
            let goal = otherDest.goal;
            
            let totalCost = 0 + otherDest.travelCost;
            totalCost += edge.cost;



            
            let destInfo = new DestinationInfo(this, otherDest.goal, otherNode, totalCost);
            
            //logger.log("costs", currentCost, totalCost)
            //logger.log("checking for", destInfo.id, pStar.distances.has(destInfo))
            this.addDestination(destInfo);
        
                

        }
    }

    /**
     * 
     * @param {DestinationInfo} destInfo 
     */
    addDestination(destInfo) {
        let pStar = global.utils.pStar.inst;
        let betterPath = false;
        if (pStar.distances.has(destInfo)) {
            let currentCost = pStar.distances.getById(destInfo.id).travelCost;
            if (currentCost > destInfo.travelCost) {


                logger.log("Better path found!, invalidating nodes", currentCost, destInfo.travelCost)
                //cost update, invalidate both nodes
                destInfo.orgin.invalidateNode();
                destInfo.goal.invalidateNode();
                pStar.distances.remove(destInfo);
                betterPath = true;
            }
            
        } else {
            //we're adding a destination, invalidate both nodes
            destInfo.orgin.invalidateNode();
            destInfo.goal.invalidateNode();
            betterPath = true; //any path is better than none yo!
        }
        if (betterPath) {
            logger.log("adding dest", destInfo.id, pStar.distances.has(destInfo));
            pStar.distances.add(destInfo);
        }
        
    }

    invalidateNode(depthToGo=2) {
        this.lastUpdated = false;
        let neighbors = this.edgeNodes;
        for (let n in neighbors) {
            let neighbor = neighbors[n];
            if (depthToGo <= 0) {
                return;
            }
            //neighbor.invalidateNode(depthToGo--);
        }
    }


    /********************Pathfinding stuff  *****************/
    getDistanceTo(destNode) {
        if (destNode.id == this.id) {
            return 0;
        }
        let dest = this.destinationsMap[destNode.id];
        if (!dest) {
            return false;
        }
        let dist = dest.travelCost;
        return dist;
    }
    findClosestNeighborToDestination(destNode) {
        let start = Game.cpu.getUsed();
        let log = (...args) => {
            let usedNow = Game.cpu.getUsed();
            let used = usedNow - start;
            logger.log("cpu used:", used, ...args);
            start = usedNow;
        }

        //get the dest:
        let destInfo = this.destinationsMap[destNode.id];
        if (!destInfo) {
            return false; //no path stored, return false for now
        }
        let nextNode = destInfo.nextNode;

        log("got node")
        return nextNode;
    }
    findClosestNeighborToDestination_old(destNode) {
        let start = Game.cpu.getUsed();
        let log = (...args) => {
            let usedNow = Game.cpu.getUsed();
            let used = usedNow - start;
            logger.log("cpu used:", used, ...args);
            start = usedNow;
        }
        let neighbors = this.edgeNodes;
        log("1")
        let dists = [];
        for(let n in neighbors) {
            let neighbor = neighbors[n];
            dists.push({node:neighbor, dist:neighbor.getDistanceTo(destNode)})
        }
        //logger.log("num neighbors", neighbors.length)
        // let dists = _.map(neighbors, (n) => {
        //     //logger.log("here??", n)
        //     return {node: n, dist:n.getDistanceTo(destNode)};
        // });
        log('2')
        //dists = _.filter(dists, (d) => d.dist == false);
        //logger.log("dists", JSON.stringify(dists));
        if (dists.length == 0) {
            return false; //no neighbors even know how to get there.. prolly gotta wait for updates
        }
        let sorted = _.sortBy(dists, ["dist"]);
        log('3')
        //logger.log("sorted", JSON.stringify(sorted))
        return sorted[0].node;
    }
    findNodePathTo(destNode) {
        //logger.log("getting path to:", destNode.id, "destMap:", JSON.stringify(this.destinationsMap))
        if (!this.destinationsMap[destNode.id]) {
            //no path saved
            return {
                path:[],
                incomplete:true,
                cost: false,
                hops: 0
            }
        }

        let currentNode = this;
        let path = [this];
        let hops = 0;
        let hopsLimit = 10000;
        let incomplete = false;
        while(currentNode.id != destNode.id) {
            let nextNode = currentNode.findClosestNeighborToDestination(destNode);
            logger.log("next closest node:", currentNode.id, nextNode ? nextNode.id : "no node!!");
            path.push(nextNode);
            if (!nextNode) {
                throw new Error("I can't find no path mofo:" + this.id + " to " + destNode.id);
            }
            currentNode = nextNode;
            
            if (hops > hopsLimit) {
                incomplete = true;
                break;
            }
            hops++;
        }
        return {
            path,
            incomplete,
            cost: this.destinationsMap[destNode.id].travelCost,
            hops
        }
    }

    displayNode() {
        global.utils.visual.drawText(this.type, this.pos);

        let dests = this.destinations;
        //logger.log("displayin", this.id)
        let debug = [];
        for(let d in dests) {
            let dest = dests[d];
            //logger.log(dest.id, dest.travelCost)
            debug.push(dest.id + " > " + dest.travelCost);
        }
        //global.utils.visual.drawTextLines(debug, this.pos);
    }

    serialize() {
        let ser = this.pos.toWorldPosition().serialize() + '|' + this.type
        return ser;
    }
    /**
     * 
     * @param {String} str 
     */
    static deserialize(str) {
        let [posStr, type] = str.split("|");
        let pos = WorldPosition.deserialize(posStr).toRoomPosition();
        let inst = new Node(pos, type);
        return inst;
    }
    
}

class Edge {
    get id() {
        return this.node1Id + "_" + this.node2Id;
    }
    constructor(node1, node2, overRide = false) {
        if (overRide) {
            this.path = false;
            return;
        }
        if (!node1 || !node2) {
            throw new Error("invalid nodes passed!" + node1 + " " + node2)
        }
        let nodes = [node1, node2];
        nodes = _.sortBy(nodes, (n) => n.id);
        //logger.log(JSON.stringify(nodes));
        node1 = nodes[0];
        node2 = nodes[1];
        this.node1Id = node1.id;
        this.node1Pos = node1.pos;
        this.node2Id = node2.id;
        this.node2Pos = node2.pos;

        this.path = new global.utils.map.CachedPath(this.node1Pos, this.node2Pos);
        this.cost = this.node1Pos.toWorldPosition().getRangeTo(this.node2Pos);
        this.lastUpdated = false;
    }

    refineEdge() {
        //logger.log("refining edge", this.id);

        if (!Game.rooms[this.node1Pos.roomName] || !Game.rooms[this.node2Pos.roomName]) {
            //I can't see! bum ba dum dum dum dum WOOWOOOOO is meee!!
            return;
            //I can't see!
        }
        
        //invalidate connected nodes
        let pStar = global.utils.pStar.inst;
        pStar.getNode(this.node1Id).lastUpdated = false;
        pStar.getNode(this.node2Id).lastUpdated = false;
        

        //bake in path/cost
        let path = this.path.getPath();
        this.cost = this.path.pathCost;
        this.lastUpdated = Game.time;

    }

    displayEdge(ticksValid = 500) {
        if ( this.path.length == 0) {
            //empty path?
            logger.log("empty path", this.id)
        }
        //if path isn't fully loaded, but cached, then load the roomPositions
        if (!this.path.path && this.path._cachedPath) {
            this.path.getPath();
        }

        
        if (!this.path.path || this.path.path.length == 0) {
            new RoomVisual(this.node1Pos.roomName).line(this.node1Pos, this.node2Pos, {color: "#f00", lineStyle: "dashed"})
        } else {
            //logger.log("--",Game.time,this.lastUpdated, Game.time - this.lastUpdated,ticksValid)
            let toRefresh = 1-((Game.time - this.lastUpdated)/ticksValid);
            //logger.log(toRefresh)
            let style = {
                opacity: toRefresh
            }
            let color = "#" + global.utils.visual.rgbColor(0,255,0);
            //logger.log(JSON.stringify(this.path));
            
            global.utils.visual.drawText(this.cost, this.path.path[Math.floor(this.path.path.length/2)]);
            
            global.utils.visual.drawPath(this.path.path, color, style)
        }
    }
    
    serialize() {
        let arr = [
            this.node1Id,
            this.node2Id,
            this.cost,
            this.lastUpdated,
            this.path.serialize()
        ]
        return arr.join("|");
    }
    static deserialize(str) {
        let [n1Id, n2Id, cost, lastUpdated, cachedPath] = str.split("|");
        //we'll assume these will be valid for now
        let node1 = global.utils.pStar.inst.getNode(n1Id);
        let node2 = global.utils.pStar.inst.getNode(n2Id);
        logger.log(n1Id, node1);
        logger.log(n2Id, node2);
        let inst = new Edge(node1, node2);
        inst.cost = cost;
        inst.lastUpdated = lastUpdated;
        if (cachedPath) {
            logger.log("----",cachedPath)
            inst.path = global.utils.map.CachedPath.deserialize(cachedPath);
            inst.path.getPath();
            logger.log(JSON.stringify(inst.path))
        }
        return inst;
    }
}

class pStar {
    constructor() {
        
        this.nodes = new global.utils.array.IndexingCollection("id", ["pos.roomName", "type"]);
        this.edges = new global.utils.array.IndexingCollection("id", ["node1Id", "node2Id"]);
        
        this.distances = new global.utils.array.IndexingCollection("id", ["orgin.id", "goal.id"]);


        this.nodeTicksValid = 100;
        this.maxNodeUpdatesPerTick = 100;
        this.edgeTicksValid = 500;
        this.maxEdgeUpdatesPerTick = 100;
    }

    addEdge(node1, node2) {
        let edge = new Edge(node1, node2);
        if (!this.edges.has(edge.id)) {
            this.edges.add(edge);
        }
    }

    refineNodes() {
        let nodes = _.shuffle(this.nodes.getAll());
        let nodesRefined = 0;
        for(let n in nodes) {
            let node = nodes[n];
            if (node.lastUpdated == false || (Game.time - node.lastUpdated) >= this.nodeTicksValid) {
                //logger.log("node",JSON.stringify(node))
                node.refineNode();
                nodesRefined++;
            }
            if (nodesRefined >= this.maxNodeUpdatesPerTick) {
                break;
            }
        }
        logger.log(nodesRefined, "nodes refined");
    }

    refineEdges() {
        let edges = _.shuffle(this.edges.getAll());
        let edgesRefined = 0;
        for(let e in edges) {
            let edge = edges[e];
            if (edge.lastUpdated == false || (Game.time - edge.lastUpdated) >= this.edgeTicksValid) {
                edge.refineEdge();
                edgesRefined++;
            }
            if (edgesRefined >= this.maxEdgeUpdatesPerTick) {
                break;
            }
        }
        logger.log(edgesRefined, "edges refined")
    }

    hasNode(node) {
        if (!(node instanceof Node)) {
            throw new Error("Adding invalid Node:", node);
        }
        return this.nodes.has(node);
    }

    addNode(node) {
        if (!(node instanceof Node)) {
            throw new Error("Adding invalid Node:", node);
        }
        this.nodes.add(node);
        this.addNodeEdges(node);
    }

    getNode(nodeId) {
        return this.nodes.getById(nodeId);
    }

    /**
     * 
     * @param {Node} node 
     */
    addNodeEdges(node) {
        switch(node.type) {
            case Node.ROOM_EXIT:
                
                //for every other room exit, if the global range is < 3 or 4 or whatever, connect them.
                //point is to connect room exit nodes on either side of a room exit
                /**
                 * @type {[Node]}
                 */
                let roomExitNodes = this.nodes.getGroupWithValue("type", Node.ROOM_EXIT);
                //logger.log("finding exits for", JSON.stringify(node));
                //logger.log(JSON.stringify(roomExitNodes));
                let thisNodePos = new RoomPosition(node.pos.x, node.pos.y, node.pos.roomName);
                let thisNodeWPos = thisNodePos.toWorldPosition();
                let ourNodes = _.filter(roomExitNodes, (nodeId) => {
                    if (nodeId == node.id) {
                        return false;
                    }
                    let n = this.getNode(nodeId);
                    //logger.log("???", JSON.stringify(n));
                    let nodePos = new RoomPosition(n.pos.x, n.pos.y, n.pos.roomName);
                    let d = thisNodeWPos.getRangeTo(nodePos);
                    //logger.log(d)
                    if (d < 4) {
                        return true;
                    }
                    return false;
                });
                //logger.log(node.pos.roomName, "matching nodes", ourNodes)
                _.each(ourNodes, (nodeId) => {
                    let n = this.getNode(nodeId);
                    this.addEdge(node, n);
                    logger.log("Adding room node connection!", node.pos.roomName, n.pos.roomName);
                })
                
            default:
                let allNodes = this.nodes.getGroupWithValue("pos.roomName", node.pos.roomName);
                let edges = [];
                let dists = {};
                for(let n in allNodes) {
                    let otherNodeId = allNodes[n];
                    let otherNode = this.nodes.getById(otherNodeId);
                    if (node.id == otherNode.id || (node.type == Node.ROOM_EXIT && otherNode.type == Node.ROOM_EXIT)) {
                        //likely best to not connect new nodes to themselves
                        continue;
                    }
                    let edgeKey = {n:node, o:otherNode};
                    dists[edgeKey.n.id+"-"+edgeKey.o.id]  = node.pos.getRangeTo(otherNode.pos);
                    edges.push(edgeKey);
                    //this.addEdge(node, otherNode)
                    
                }
                logger.log("----", JSON.stringify(edges));
                logger.log(JSON.stringify(dists))
                edges = _.sortBy(edges, (e) => {
                    logger.log(JSON.stringify(e), dists[e.n.id+"-"+e.o.id])
                    return dists[e.n.id+"-"+e.o.id]
                });
                logger.log(JSON.stringify(edges))
                let maxConns = 3;
                for(let i=0;i<edges.length&&i<maxConns;i++) {
                    let o = edges[i];
                    this.addEdge(o.n, o.o);
                }
                break;
        }
    }

    removeNode(node) {
        if (!(node instanceof Node)) {
            throw new Error("Adding invalid Node:", node);
        }
        this.nodes.remove(node);
    }

    displayNodes() {
        let allNodes = this.nodes.getAll();
        for(let n in allNodes) {
            let node = allNodes[n];
            node.displayNode();
        }
        let allEdges = this.edges.getAll();
        for(let e in allEdges) {
            let edge = allEdges[e];
            //logger.log(JSON.stringify(edge))
            edge.displayEdge(this.edgeTicksValid);
        }
        logger.log("total nodes:", Object.keys(this.nodes.thingsById).length);
        logger.log("total edges:", Object.keys(this.edges.thingsById).length);
        logger.log("Rooms Covered:", Object.keys(this.nodes.getGroup("pos.roomName")).length)

    }

    /**
     *    Pathing
     */
    /**
     * 
     * @param {Creep} creep 
     * @param {*} goal 
     * @param {*} opts 
     */
    moveTo(creep, goal, opts) {
        
        //creep.memory.nextNode = false;
        if (!creep.memory.nextNode) {
            let startNode = this.findClosestNode(creep.pos);
            let destNode = this.findClosestNode(goal.pos);
            //logger.log(creep.name, "starting node", startNode.id);
            
            //if the creep is as close or closer to the goal as the first node is, might as well walk. 
            //logger.log(creep.pos.toWorldPosition().getRangeTo(goal.pos), (creep.pos.toWorldPosition().getRangeTo(startNode.pos) + goal.pos.toWorldPosition().getRangeTo(startNode.pos)));

            let betterToWalk = false;
            if (startNode.id == destNode.id) {
                betterToWalk = creep.pos.toWorldPosition().getRangeTo(goal.pos) <= startNode.pos.toWorldPosition().getRangeTo(goal.pos);
                //logger.log(creep.name, startNode.id, creep.pos.toWorldPosition().getRangeTo(goal.pos), startNode.pos.toWorldPosition().getRangeTo(goal.pos), betterToWalk);
            }
            
            if (startNode && !betterToWalk) {
                creep.memory.nextNode = startNode.id;
                creep.memory.destNode = destNode.id;

                // let nextNodeInPath = startNode.findClosestNeighborToDestination(destNode);
                // let edge = new Edge(startNode, nextNodeInPath);
                // edge = this.edges.getById(edge.id);
                // creep.memory.edgeId = edge.id;
            } else {
                //can't find a start node, use creep.moveTo
                creep.moveTo(goal.pos, {range: goal.range, visualizePathStyle:{}})
                return;
            }
        }
        //creep.memory.nextNode should be filled
        /** @type {Node} */
        let nextNode = this.getNode(creep.memory.nextNode);
        /** @type {Node} */
        let destNode = this.getNode(creep.memory.destNode);

        if (!nextNode || !destNode) {
            creep.say("bad path")
            logger.log("-----------------ERROR bad next/dest node----------------");
            logger.log(creep.memory.nextNode, creep.memory.destNode);
                    creep.memory.nextNode = false;
                    creep.memory.destNode = false;
                    creep.memory.cachedPath = false;
                    creep.memory.edgeId = false;
            return;
        }

        logger.log(creep.name, "moving to next node", creep.memory.nextNode, creep.memory.destNode, JSON.stringify(nextNode.pos));
        if (creep.pos.inRangeTo(nextNode, 1)) {
            if (destNode.id == nextNode.id) { //last node in path
                creep.memory.nextNode = false;
                creep.memory.destNode = false;
                creep.memory.cachedPath = false;
                creep.memory.edgeId = false;
                logger.log(creep.name, "at dest node", destNode.id);

                return;
            } else {
                let nextNodeInPath = nextNode.findClosestNeighborToDestination(destNode);
                if (!nextNodeInPath) {
                    creep.say("no path")
                    logger.log('---------------ERROR no path-----------------')
                    logger.log(nextNode.id, destNode.id);
                    creep.memory.nextNode = false;
                    creep.memory.destNode = false;
                    creep.memory.cachedPath = false;
                    creep.memory.edgeId = false;
                    return;
                }
                logger.log(creep.name, "reached a node", nextNode.id, ", next node in path:", nextNodeInPath.id)
                creep.memory.nextNode = nextNodeInPath.id;
                nextNode = nextNodeInPath;
                //grab the creep edge
                let edge = new Edge(nextNode, nextNodeInPath);
                edge = this.edges.getById(edge.id);
                creep.memory.edgeId = edge.id;
                //logger.log("edge path", JSON.stringify(edge));
                
            }
            //set nextNode to the next closest node in the network.
            
            
        }
        if (creep.memory.edgeId) {

            /** @type {Edge} */
            let edge = this.edges.getById(creep.memory.edgeId);
            if (!edge) {
                logger.log("--------------ERROR creeps edge doesn't exist!-------------");
                creep.memory.nextNode = false;
                    creep.memory.destNode = false;
                    creep.memory.cachedPath = false;
                    creep.memory.edgeId = false;
                return;
            }
            logger.log(creep.name, "moving by edge", edge.path);
            edge.path.moveOnPath(creep, nextNode, goal);
            logger.log(creep.name, "moved", creep.memory.pStarPath.done)
            // if (creep.memory.pStarPath.done) {
            //     //this leg complete, move to next node
            //     creep.memory.nextNode = false;
            //         creep.memory.destNode = false;
            //         creep.memory.cachedPath = false;
            //         creep.memory.edgeId = false;
            // }
            
        } else {
            let ret = creep.moveTo(nextNode.pos, {range: 0, visualizePathStyle:{stroke:"#f0f"}})
            logger.log("no cached path", ret);
        }
        
    
        
    }

    /**
     * Find the node closest to a room position(by range), only searches in same and adjecent rooms.
     * @param {RoomPosition} pos 
     * @returns {Node|boolean} The closest node, or false
     */
    findClosestNode(pos) {
        let closestNode = false;
        let roomsToCheck = [pos.roomName];
        
        let exits = Game.map.describeExits(pos.roomName);
        for(let dir in exits) {
            let exitRoomName = exits[dir];
            roomsToCheck.push(exitRoomName);
        }

        let nodes = [];
        for (let r in roomsToCheck) {
            let roomName = roomsToCheck[r];
            //logger.log(roomName, JSON.stringify(this.nodes.getGroup("pos.roomName")))
            let roomNodes = this.nodes.getGroupWithValue("pos.roomName", roomName);
            //logger.log(JSON.stringify(roomNodes))
            if (roomNodes) {
                nodes = nodes.concat(roomNodes);
            }
        }
        //logger.log(JSON.stringify(nodes))
        let nodesByCost = {};
        _.each(nodes, (nodeId) => {
            let node = this.getNode(nodeId);
            //logger.log(nodeId, JSON.stringify(node))
            let totalCost = pos.toWorldPosition().getRangeTo(node.pos);
            nodesByCost[totalCost] = node;
        });
        //logger.log(JSON.stringify(nodesByCost));
        if (Object.keys(nodesByCost).length) {
            let cheapestCost = Object.keys(nodesByCost).sort(function(a, b) {return a - b})[0];
            logger.log("cheapest cost", cheapestCost, JSON.stringify(nodesByCost[cheapestCost]), Object.keys(nodesByCost).sort(function(a, b) {return a - b}))
            closestNode = nodesByCost[cheapestCost];
        }
        return closestNode;
    }





    serialize() {

        let obj = {
            nodes: this.nodes.serialize(),
            edges: this.edges.serialize(),
            edgeTicksValid: this.edgeTicksValid,
            maxEdgeUpdatesPerTick: this.maxEdgeUpdatesPerTick
        }
        logger.log("size breakdown, nodes:", obj.nodes.length, " edges:", obj.edges.length);
        return JSON.stringify(obj);
    }
    static deserialize(str) {
        let obj = JSON.parse(str);
        let inst = new pStar();

        //have to override the global instance so the underlying classes can see inst instead of the global instance.\

        let oldInst = global.utils.pStar.inst;
        global.utils.pStar.inst = inst;

        inst.nodes = global.utils.array.IndexingCollection.deserialize(obj.nodes, Node);
        inst.edges = global.utils.array.IndexingCollection.deserialize(obj.edges, Edge);
        
        global.utils.pStar.inst = oldInst;

        inst.edgeTicksValid = obj.edgeTicksValid;
        inst.maxEdgeUpdatesPerTick = obj.maxEdgeUpdatesPerTick;

        return inst;
    }
}


global.profiler.registerClass(Node,"Node");
global.profiler.registerClass(Edge,"Edge");
global.profiler.registerClass(pStar,"pStar");


let inst = new pStar();

module.exports = {
    inst,
    class: pStar,
    Node,
    Edge
}