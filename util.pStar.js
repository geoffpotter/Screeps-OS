

var logger = require("screeps.logger");
logger = new logger("pr.pStar");
logger.color = COLOR_PURPLE;


class DestinationInfo {
    constructor(orginNode, goalNode, cost) {
        this.orgin = orginNode;
        this.goal = goalNode;
        this.travelCost = cost;
    }

    get id() {
        return this.orgin.id + "_" + this.goal.id;
    }
}

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
            
            logger.log("processing edge:", JSON.stringify(edge))
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
        logger.log("refining node:", this.id);
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
        logger.log(this.id, 'update pathing with node:', otherNode.id);
        
        let pStar = global.utils.pStar.inst;

        /** @type {Edge} */
        let edge = this.getNodeEdge(otherNode);
        logger.log("edge cost:", edge.cost, JSON.stringify(edge));
        let destInfo = new DestinationInfo(this, otherNode, edge.cost);
        this.addDestination(destInfo);

        //for all the distances for otherNode, add same destination with cost increased by edge len
        let otherDests = otherNode.destinations;
        for(let i in otherDests) {
            /** @type {DestinationInfo} */
            let otherDest = otherDests[i];
            
            logger.log("check neighbor node", otherDest.goal.id, this.id, otherDest.travelCost);
            if (otherDest.goal.id == this.id || otherDest.goal.id == otherNode.id || otherDest.orgin.id == this.id) {
                logger.log("skipping")
                continue;
            }
            //let edge = this.getNodeEdge(otherDest.goal);
            let goal = otherDest.goal;
            
            let totalCost = 0 + otherDest.travelCost;
            totalCost += edge.cost;



            
            let destInfo = new DestinationInfo(this, otherDest.goal, totalCost);
            let currentCost = pStar.distances.getById(destInfo.id).travelCost;
            if (currentCost)
                destInfo.travelCost = currentCost;
            logger.log("costs", currentCost, totalCost)
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
        if (pStar.distances.has(destInfo)) {
            let currentCost = pStar.distances.getById(destInfo.id);
            if (currentCost != destInfo.travelCost) {
                //cost update, invalidate both nodes
                destInfo.orgin.invalidateNode();
                destInfo.goal.invalidateNode();
            }
            pStar.distances.remove(destInfo);
        } else {
            //we're adding a destination, invalidate both nodes
            destInfo.orgin.invalidateNode();
            destInfo.goal.invalidateNode();
        }
        //logger.log("adding dest", destInfo.id, pStar.distances.has(destInfo));
        pStar.distances.add(destInfo)
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
        global.utils.visual.drawTextLines(debug, this.pos);
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
        this.maxNodeUpdatesPerTick = 1;
        this.edgeTicksValid = 500;
        this.maxEdgeUpdatesPerTick = 1;
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
                logger.log("node",JSON.stringify(node))
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
        if (Game.time%10!=0) {
            return;
        }
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
                let maxConns = 1;
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



let inst = new pStar();

module.exports = {
    inst,
    class: pStar,
    Node,
    Edge
}