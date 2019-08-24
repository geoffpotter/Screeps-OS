
var logger = require("screeps.logger");
logger = new logger("util.pStar");
//logger.enabled = false;
logger.color = COLOR_YELLOW;



class DestinationInfo {
    constructor(originNode, goalNode, nextNode, cost) {
        this.origin = originNode;
        this.goal = goalNode;
        this.nextNode = nextNode;
        this.travelCost = cost;
    }

    get id() {
        return this.origin.id + "_" + this.goal.id;
    }

    serialize() {
        let items = [
            this.origin.id,
            this.goal.id,
            this.nextNode.id,
            this.travelCost
        ];
        return items.join("|");
    }

    static deserialize(str) {
        let [originId, goalId, nextNodeId, cost] = str.split("|");
        let origin = global.utils.pStar.inst.getNode(originId);
        let goal = global.utils.pStar.inst.getNode(goalId);
        let next = global.utils.pStar.inst.getNode(nextNodeId);
        return new DestinationInfo(origin, goal, next, cost);
    }
}

// class DestinationInfo {
//     constructor(originNode, goalNode, cost) {
//         this.origin = originNode;
//         this.goal = goalNode;
//         this.travelCost = cost;
//     }

//     get id() {
//         return this.origin.id + "_" + this.goal.id;
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
        if (!this._id) {
            //this._id = this.pos.toWorldPosition().serialize(); //smaller ids
            this._id = `${this.pos.x}-${this.pos.y}-${this.pos.roomName}`; //easier to debug
        }
        return this._id;
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
            let destIds = pStar.distances.getGroupWithValue("origin.id", this.id); //list if ids
            this._destMap = {};
            for(let d in destIds) {
                let destId = destIds[d];
                let dest = pStar.distances.getById(destId);
                this._destMap[dest.goal.id] = dest;
            }
        }

        let d = this._destMap;
        //this._destMap = false;
        
        return d;
    }
    get destinations() {
        let pStar = global.utils.pStar.inst;
        let destIds = pStar.distances.getGroupWithValue("origin.id", this.id); //list if ids
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
        let edgeId = Edge.makeEdgeId(this.id, otherNode.id);
        let edge = pStar.edges.getById(edgeId);
        if (edge) {
            //it exists!
            return edge;
        }
        logger.log("couldn't find node edge!", edgeId);
        return false;
    }
    refineNode() {
        if (this.lastUpdated == false || (Game.time - this.lastUpdated) >= global.utils.pStar.inst.nodeTicksValid) {
            logger.log("refining node:", this.id);
            let neighbors = this.edgeNodes;
            for(let n in neighbors) {
                let neighbor = neighbors[n];
                this.updatePathingWithNode(neighbor);
            }
            this.lastUpdated = Game.time;
        }
        
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
            if (otherDest.goal.id == this.id || otherDest.goal.id == otherNode.id || otherDest.origin.id == this.id) {
                //logger.log("skipping")
                continue;
            }
            //let edge = this.getNodeEdge(otherDest.goal);
            let goal = otherDest.goal;
            
            let totalCost = 0 + Number.parseInt(otherDest.travelCost);
            totalCost += Number.parseInt(edge.cost);



            
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
        //invalidate cached destmap
        this._destMap = false;
        let pStar = global.utils.pStar.inst;
        let betterPath = false;
        if (pStar.distances.has(destInfo)) {
            let currentCost = pStar.distances.getById(destInfo.id).travelCost;
            if (currentCost > destInfo.travelCost) {


                //logger.log("Better path found!, invalidating nodes", currentCost, destInfo.travelCost)
                //cost update, invalidate both nodes
                destInfo.origin.invalidateNode();
                destInfo.goal.invalidateNode();
                pStar.distances.remove(destInfo);
                betterPath = true;
            }
            
        } else {
            //we're adding a destination, invalidate both nodes
            destInfo.origin.invalidateNode();
            destInfo.goal.invalidateNode();
            betterPath = true; //any path is better than none yo!
        }
        if (betterPath) {
            //logger.log("adding dest", destInfo.id, pStar.distances.has(destInfo));
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
            return this.pos.toWorldPosition().getRangeTo(destNode.pos);
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
            hops: hops + 1
        }
    }

    displayNode(showDests = false) {
        global.utils.visual.drawText(this.type, this.pos);

        if (showDests) {
            let dests = this.destinations;
            //logger.log("displayin", this.id)
            let debug = [];
            for(let d in dests) {
                /** @type {DestinationInfo} */
                let dest = dests[d];
                //logger.log(dest.id, dest.travelCost)
                debug.push(dest.id + " > " + dest.travelCost + " by " + dest.nextNode.id);
            }
            global.utils.visual.drawTextLines(debug, this.pos);
        } else {
            global.utils.visual.drawText(" " + this.destinations.length + " dests", this.pos)
        }
    }

    serialize() {
        let ser = this.pos.toWorldPosition().serialize() + '|' + this.type
        //let ser = this.pos.x + "-" + this.pos.y + "-" + this.pos.roomName + '|' + this.type
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

    static makeEdgeId(node1Id, node2Id) {
        let nodes = [node1Id, node2Id];
        nodes = nodes.sort();
        return nodes[0] + "_" + nodes[1];
    }
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
        this.lastUpdated = 0;
    }

    refineEdge() {

        if (!this.path.path || this.lastUpdated == 0 || (Game.time - this.lastUpdated) >= global.utils.pStar.inst.nodeTicksValid) {
            //logger.log("refining edge", this.id);

            if (!Game.rooms[this.node1Pos.roomName] || !Game.rooms[this.node2Pos.roomName]) {
                //I can't see! bum ba dum dum dum dum WOOWOOOOO is meee!!
                return false;
                //I can't see!
            }
            
            //invalidate connected nodes
            let pStar = global.utils.pStar.inst;
            pStar.getNode(this.node1Id).lastUpdated = 0;
            pStar.getNode(this.node2Id).lastUpdated = 0;
            

            //bake in path/cost
            let path = this.path.getPath();
            this.cost = this.path.pathCost;
            this.lastUpdated = Game.time;

            //we got the path, add the positions to our cost matrix
            
            let cm = global.utils.cm.getCM(this.node1Pos.roomName, "pStar");
            for(let p in path) {
                let pos = path[p];
                cm.set(pos.x, pos.y, 1);
            }

            return true;
        } else {
            //logger.log(this.node1Pos, this.node2Pos, "already updated", this.path.path)
        }
        return false;
    }

    displayEdge(color = "#999", opacity = 1) {
        if ( this.path.length == 0) {
            //empty path?
            logger.log("empty path", this.id)
        }
        //if path isn't fully loaded, but cached, then load the roomPositions
        if (!this.path.path && this.path._cachedPath) {
            this.path.getPath();
        }

        
        if (!this.path.path || this.path.path.length == 0) {
            new RoomVisual(this.node1Pos.roomName).line(this.node1Pos, this.node2Pos, {color: color, lineStyle: "dashed"})
        } else {
            //logger.log("--",Game.time,this.lastUpdated, Game.time - this.lastUpdated,ticksValid)
            //let toRefresh = 1-((Game.time - this.lastUpdated)/ticksValid);
            //logger.log(toRefresh)
            let style = {
                opacity: opacity
            }
            //let color = "#" + global.utils.visual.rgbColor(150,150,150);
            //logger.log(JSON.stringify(this.path));
            
            global.utils.visual.drawText(this.cost, this.path.path[Math.floor(this.path.path.length/2)]);
            
            global.utils.visual.drawPath(this.path.path, color, style)
        }
    }
    

    serialize(level) {
        //level = 1;
        //level is 1-x for "memory level", like L1, L2, L3 cache. but reversed
        //logger.log(this.id, "serializing", level, level==1 ? "adding path" : "not adding path", "lol even has a path?", this.path.path.length>0)
        let arr = [
            this.node1Id,
            this.node2Id,
            this.cost,
            this.lastUpdated
        ]
        if (level == 1) {
            arr.push(this.path.serialize())
        }
        //logger.log(this.id,'serialized')
        //logger.log(JSON.stringify(arr))
        return arr.join("|");
    }
    static deserialize(str) {
        let [n1Id, n2Id, cost, lastUpdated, cachedPath] = str.split("|");
        //we'll assume these will be valid for now
        let node1 = global.utils.pStar.inst.getNode(n1Id);
        let node2 = global.utils.pStar.inst.getNode(n2Id);
        //logger.log(n1Id, node1);
        //logger.log(n2Id, node2);
        let inst = new Edge(node1, node2);
        inst.cost = cost;
        inst.lastUpdated = lastUpdated;
        if (cachedPath) {
            logger.log("----",cachedPath)
            inst.path = global.utils.map.CachedPath.deserialize(cachedPath);
            inst.path.getPath();
            //logger.log(JSON.stringify(inst.path))
        }
        return inst;
    }
}

class pStar {
    constructor() {
        
        this.nodes = new global.utils.array.IndexingCollection("id", ["pos.roomName", "type"], [100000, 1000000]);
        this.edges = new global.utils.array.IndexingCollection("id", ["node1Id", "node2Id"], [10, 200000, 1000000]);
        
        this.distances = new global.utils.array.IndexingCollection("id", ["origin.id", "goal.id"], [2, 1000000]);


        this.nodeTicksValid = 10000;
        this.maxNodeUpdatesPerTick = 10;
        this.edgeTicksValid = 10000;
        this.maxEdgeUpdatesPerTick = 10;
    }

    addEdge(node1, node2) {
        let edgeId = Edge.makeEdgeId(node1.id, node2.id);
        if (!this.edges.has(edgeId)) {
            let edge = new Edge(node1, node2);
            this.edges.add(edge);
        }
    }

    refineNodes() {
        let nodes = _.shuffle(this.nodes.getAll());
        let nodesRefined = 0;
        for(let n in nodes) {
            let node = nodes[n];
            if (node.lastUpdated == 0 || (Game.time - node.lastUpdated) >= this.nodeTicksValid) {
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
            let refined = edge.refineEdge();
            if (refined) {
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
                    if (n.pos.roomName == thisNodePos.roomName || d < 4) {
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
                let maxConns = 2;
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
            //if (!edge.path._cachedPath) { //display all non cached paths
            //logger.log(JSON.stringify(edge))
                edge.displayEdge("#999", 0.1);
            //}
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
            logger.log(pathInfo.nextNode);
        }

        log("init done")
        let path = false;
        //logger.log(creep.name, "initial move method", pathInfo.method)
        //initial state.  search for path
        if (pathInfo.method == "") {
            let path = this.findPath(creep.pos, goal.pos);
            logger.log(creep.name, "path", JSON.stringify(path));
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
        log("pathfinding done", pathInfo.method)
        //if we're using pStar and the path hasn't been loaded from original pathfinding
        if (pathInfo.method == "pStar" && path === false) {
            path = this.deserializeFindPath(pathInfo.path);
        }
//logger.log('jkj', path)
        if (path == "false" || (!pathInfo.edgeId && path.length==1)) {
            logger.log(creep.name, "doesn't know what is going on, so he's gonna walk.")
            pathInfo.method = "moveTo";
        }



        log("starting switch");
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
                    throw new Error("no edge defined!");
                }
                log("moving")
                //  ------------  preform the actual move ---------------------
                if (pathInfo.pathStage == 0) {//-----------------------------get in range of first node
                    //try walking on edge
                    let nextNode = path[0];
                    
                    let ret = edge.path.moveOnPath(creep, nextNode, goal);
                    //logger.log(creep.name, "moving on first edge", edge.id, JSON.stringify(ret));
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
                    log('stage 0')
                }
                
                if (pathInfo.pathStage == 1) { //--------------------follow node network path
                    
                    /** @type {Node} */
                    let nextNode = path[0];

                    if (creep.pos.inRangeTo(nextNode.pos, atNodeTolerance)) {
                        //at next node, go to next leg or skip to next stage
                        if (path.length < 2) { //at the end of the node path, go to next stage
                            //leave existing path in memory so we can stil load the nodes
                            logger.log(creep.name, nextNode.id);
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
                        //logger.log(creep.name, "moving to", nextNode.id, JSON.stringify(goal))
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
                    log('stage 1')
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
                    log('stage 2')
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


    moveTo_old(creep, goal, opts) {
        // let path = this.findPath(creep.pos, goal.pos);
        // logger.log(creep.name, "path", JSON.stringify(path));
        // creep.moveTo(goal.pos, {range:goal.range});
        // return;
        //creep.memory.pStarPath = false;
        let pathInfo = creep.memory.pStarPath || {
            currentNode: false,
            nextNode: false,
            destNode: false,
            edgeId: false,
            walking: false,
            done: false,
            goal: goal.pos,
            stuck: 0,
        }
        //check for goal change
        if (!goal.pos.isEqualTo(new RoomPosition(pathInfo.goal.x, pathInfo.goal.y, pathInfo.goal.roomName))) {
            logger.log(creep.name, "goal changed", goal.pos, JSON.stringify(pathInfo.goal), goal.pos.isEqualTo(pathInfo.goal))
            creep.memory.pStarPath = {
                currentNode: false,
                nextNode: false,
                destNode: false,
                edgeId: false,
                walking: false,
                done: false,
                goal: goal.pos,
                stuck: 0,
            };
            pathInfo = creep.memory.pStarPath
            logger.log(pathInfo.nextNode)
        }
        

        //check for final path completion
        if (creep.pos.inRangeTo(goal.pos, goal.range)) {
            pathInfo.nextNode = false;
            pathInfo.destNode = false;
            pathInfo.edgeId = false;
            pathInfo.done = true;
            pathInfo.walking = false;
            pathInfo.stuck = 0;
            creep.memory.pStarPath = false;
            logger.log("creep already at destination, be better!");
            return pathInfo;
        }
        //logger.log(creep.name, "moving too", goal.pos, JSON.stringify(pathInfo.goal));


        /** @type {Node} */
        let nextNode = this.getNode(pathInfo.nextNode);
        /** @type {Node} */
        let destNode = this.getNode(pathInfo.destNode);
        /** @type {Edge} */
        let edge = this.getNode(pathInfo.edgeId);
        

        //no stored path. decide what to do
        if (!nextNode) {
            let startNode = this.findClosestNode(creep.pos);
            let endNode = this.findClosestNode(goal.pos);
            //logger.log(creep.name, startNode, endNode);
            
            //if the creep is as close or closer to the goal as the first node is, might as well walk. 
            let betterToWalk = false;
            if (startNode.id == endNode.id) {
                betterToWalk = creep.pos.toWorldPosition().getRangeTo(goal.pos) <= startNode.pos.toWorldPosition().getRangeTo(goal.pos);
                //logger.log("walking calk", creep.name, startNode.id, creep.pos.toWorldPosition().getRangeTo(goal.pos), startNode.pos.toWorldPosition().getRangeTo(goal.pos), betterToWalk);
            }
            
            if (startNode && endNode && !betterToWalk) {
                //logger.log(creep.name, "found path", startNode.id, endNode.id)
                //path found!
                nextNode = startNode;
                destNode = endNode;
                pathInfo.nextNode = startNode.id;
                pathInfo.currentNode = startNode.id;
                pathInfo.destNode = endNode.id;
                
            } else {
                //logger.log(creep.name, "no path, using moveto", startNode, endNode)
                //can't find a start node, use creep.moveTo
                pathInfo.walking = true;
                
            }
        }
        //check for node network path complete, and path segment complete
        if (creep.pos.inRangeTo(nextNode, 1)) {
            pathInfo.currentNode = nextNode.id;
            if (destNode.id == nextNode.id && destNode.pos.isEqualTo(goal.pos)) { 
                //last node in path, and final destination
                pathInfo.nextNode = false;
                pathInfo.destNode = false;
                pathInfo.edgeId = false;
                pathInfo.done = true;
                creep.memory.pStarPath = pathInfo;
                //logger.log(creep.name, "at final dest node", destNode.id);

                return pathInfo;
            } else if(destNode.id == nextNode.id) {
                //we're at the final node, but not the final location, walk to that pos
                pathInfo.walking = true;
                //logger.log(creep.name, "at final dest node, need to walk", destNode.id);
            } else {
                //logger.log(creep.name, "next to node, doing stuff", pathInfo.currentNode)
                if (false && nextNode.id == pathInfo.currentNode) { //this'll happen when starting a path.. skip?
                    logger.log("starting path");

                } else {
                    //logger.log("move to next node")
                    //end of edge, invalidate and find next node
                    pathInfo.edgeId = false;
                    let nextNodeInPath = nextNode.findClosestNeighborToDestination(destNode);
                    //nextNode.displayNode(true)
                    if (!nextNodeInPath) {
                        nextNode.lastUpdated = false;
                        //nextNode.refineNode();//see if this helps next tick I guess
                        creep.say("no path")
                        logger.log('---------------ERROR no path-----------------')
                        logger.log(nextNode.id, destNode.id, nextNodeInPath, pathInfo.currentNode);
                        pathInfo.nextNode = false;
                        pathInfo.destNode = false;
                        pathInfo.edgeId = false;
                        creep.memory.pStarPath = pathInfo;
                        return pathInfo;
                    }
                    pathInfo.currentNode = nextNode.id;
                    //logger.log(creep.name, "reached a node", nextNode.id, ", next node in path:", nextNodeInPath.id)
                    pathInfo.nextNode = nextNodeInPath.id;
                    nextNode = nextNodeInPath;
                }
            }
        }

        //logger.log("checking for edge", !edge, !pathInfo.walking)
        if (!edge && !pathInfo.walking) {
            pathInfo.walking = true;
            let currentNode = this.getNode(pathInfo.currentNode);
            
            //get edge
            //let nextNodeInPath = nextNode.findClosestNeighborToDestination(destNode);
            //logger.log(currentNode.id, nextNode.id)
            let edgeId = Edge.makeEdgeId(currentNode.id, nextNode.id);
            edge = this.edges.getById(edgeId);
            pathInfo.edgeId = edge.id;
            //logger.log("found edge to walk", edge)
        }

        

            
            
        

        //check for bad path
        if (!nextNode || !destNode) {
            creep.say("bad path")
            logger.log("-----------------ERROR bad next/dest node----------------", nextNode, destNode);
            logger.log(pathInfo.nextNode, pathInfo.destNode);
                   pathInfo.nextNode = false;
                   pathInfo.destNode = false;
                   pathInfo.edgeId = false;
        }


        //save pathinfo back to creep
        creep.memory.pStarPath = pathInfo;
        
        //handle walking, just use moveTo
        if (pathInfo.walking || !edge) {
            creep.say("moveTo");
            let placeToMove = (nextNode && destNode && nextNode.id != destNode.id) ? nextNode.pos: goal.pos;
            let ret = creep.moveTo(goal.pos, {range: goal.range, visualizePathStyle:{stroke:"#f0f"}});
            //logger.log(pathInfo.walking)
            //logger.log(creep.name, "Walking to dest", goal.pos, "ret", ret);
            return pathInfo;
        }

        //display the path we're walking
        edge.displayEdge("#0f0", 0.5);

        //have stored path, walk it
        //logger.log(creep.name, "moving by edge", edge.id);
        let res = edge.path.moveOnPath(creep, nextNode, goal);
        if (res.done && !res.onPath && !res.closeToPath) {
            //failure walking path.. umm... walkmode!
            creep.say("Off path!")
            pathInfo.walking = true;
            creep.memory.pStarPath = pathInfo;
        }

        //logger.log(creep.name, "moved", JSON.stringify(res))
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
        let closestNode = false;
        let roomsToCheck = [pos.roomName];
        
        let exits = Game.map.describeExits(pos.roomName);
        for(let dir in exits) {
            let exitRoomName = exits[dir];
            roomsToCheck.push(exitRoomName);
        }
        //log("got rooms")
        
        let cheapestNode = false;
        let cheapestCost = 1000000;

        for (let r in roomsToCheck) {
            let roomName = roomsToCheck[r];
            //logger.log(roomName, JSON.stringify(this.nodes.getGroup("pos.roomName")))
            let roomNodes = this.nodes.getGroupWithValue("pos.roomName", roomName);
            //logger.log(JSON.stringify(roomNodes))
            if (roomNodes) {
                //check these nodes
                for(let n in roomNodes) {
                    let nodeId = roomNodes[n];
                    let node = this.getNode(nodeId);
                    global.utils.visual.circle(node.pos, "#f00", 1, 0.5)
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
        }
        if (cheapestNode) {
            global.utils.visual.circle(cheapestNode.pos, "#0f0", 1, 1)
        }
        //log("got node")
        return cheapestNode;
    }





    serialize() {
        
        let obj = {
            nodes: this.nodes.serialize(),
            edges: this.edges.serialize(),
            dists: this.distances.serialize(),
            edgeTicksValid: this.edgeTicksValid,
            maxEdgeUpdatesPerTick: this.maxEdgeUpdatesPerTick
        }
        let oldE = logger.enabled;
        logger.enabled = true;
        logger.log("total nodes:", Object.keys(this.nodes.thingsById).length);
        logger.log("total edges:", Object.keys(this.edges.thingsById).length);
        logger.log("total destinations:", Object.keys(this.distances.thingsById).length);
        logger.log("Rooms Covered:", Object.keys(this.nodes.getGroup("pos.roomName")).length)
        logger.log("size breakdown, nodes:", obj.nodes.length, " edges:", obj.edges.length, "destinations:", obj.dists.length);
        logger.enabled = oldE;
        return JSON.stringify(obj);
    }
    static deserialize(str) {
        let obj = JSON.parse(str);
        let inst = new pStar();

        //have to override the global instance so the underlying classes can see inst instead of the global instance.\

        let oldInst = global.utils.pStar.inst;
        global.utils.pStar.inst = inst;

        let nLims = inst.nodes.limits;
        let eLims = inst.edges.limits;
        let dLims = inst.distances.limits;
        inst.nodes = global.utils.array.IndexingCollection.deserialize(obj.nodes, Node);
        inst.nodes.limits = nLims;
        inst.edges = global.utils.array.IndexingCollection.deserialize(obj.edges, Edge);
        inst.edges.limits = eLims;
        if (obj.dists) {
            inst.distances = global.utils.array.IndexingCollection.deserialize(obj.dists, DestinationInfo);
            inst.distances.limits = dLims;
        }
        
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
    Edge,

     /**
     * find a path through the pStar network using A*.. maybe.. 
     * @param {Node} startNode 
     * @param {Node} endNode 
     * @param {IndexingCollection} allNodes 
     */
    findPath(startNode, endNode, maxOps=100) {
        let openNodes = new global.utils.array.PriorityQueue((a, b) => {
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
            f:0,//g+h, fscore for this node
            closed: false,
        };
        nodeInfoLookup[startNode.id] = startNodeInfo;
        openNodes.push(startNodeInfo);
        
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
            if (nodeInfo.parent) {
                
                /** @type {Node} */
                let parentNode = nodeInfo.parent;
                let parentEdgeId = Edge.makeEdgeId(node.id, parentNode.id);
                /** @type {Edge} */
                let parentEdge = global.utils.pStar.inst.edges.getById(parentEdgeId);
                //let parentEdge = node.getNodeEdge(parentNode);
                if (!parentEdge) {
                    //network is broken!
                    logger.log('network broken, missing parent edge')
                    logger.log(node.id, parentNode.id);
                    logger.log(parentEdge);
                    let edgeId = Edge.makeEdgeId(node.id, parentNode.id);
                    logger.log(edgeId);
                    logger.log(new Edge(parentNode, node).id == edgeId);
                    logger.log(this.inst.edges.getById(edgeId))
                    logger.log("all edges");
                    let edges = this.inst.edges.getAll();
                    for(let e in edges) {
                        let edge = edges[e];
                        logger.log(edge.id, edgeId, edge.id == edgeId)
                    }
                }
                let refined = parentEdge.refineEdge();
                //logger.log(node.id, "has parent, edge refined?", refined);
                if (refined) {
                    //if the edge was refined, recalc the scores for this node and add it back into the queue and skip to next node
                    //recalc g score
                    //logger.log(parentEdge.id, 'edge refined', node.id, "going back into queue")
                    //logger.log(JSON.stringify(nodeInfo))
                    let parentNodeInfo = nodeInfoLookup[parentNode.id];
                    nodeInfo.g = parentNodeInfo.g + parentEdge.cost;
                    nodeInfo.f = nodeInfo.g + nodeInfo.h;
                    openNodes.push(nodeInfo);
                    continue;
                }
            } else {
                logger.log(node.id, "has no parent set.. is it the initial node, cuz otherwise you're a dumbass")
            }


            //logger.log(node.id, "closed")
            //by this point the edge to our parent is refined, and we are not the target node.  Do normal A* action and mark this node closed
            nodeInfo.closed = true;
            
            //wait until after parent edge has been updated to say we've reached the goal.
            if (node.pos.isEqualTo(endNode.pos)) {
                logger.log("found path!", startNode.id, endNode.id);
                logger.log(JSON.stringify(nodeInfo));
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
                        logger.log(node.id, "adding destination", JSON.stringify(dest))
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
                    hops: path.length
                };
            }


            //get neighbors, init them if needed, and add them to the queue with this node as parent if that lowsers their g score, otherwise leave them be
            let neighbors = node.edgeNodes;
            for(let n in neighbors) {
                /** @type {node} */
                let neighbor = neighbors[n];
                
                if (neighbor.closed || neighbor === node) {
                    continue;
                }

                let neighborInfo = nodeInfoLookup[neighbor.id];
                let edgeToNode = node.getNodeEdge(neighbor);
                let newGScore = Number.parseInt(nodeInfo.g) + Number.parseInt(edgeToNode.cost);
                //logger.log(node.id, "checking neighbor", neighbor.id, newGScore);
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
                }
            }
            opts++;
        }

        logger.log("we're dumb, and didn't find a path.. one prolly exists tho.. stupid head.");
        logger.log(JSON.stringify(nodeInfoLookup));
        throw new Error("invalid path!" + opts)
        return {
            path: [],
            incomplete: true,
            cost: false,
            hops: false
        };;
    }



}