


var logger = require("screeps.logger");
logger = new logger("util.pStar.room");
//logger.enabled = false;
logger.color = COLOR_CYAN;

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
            this.origin.pos.roomName,
            this.goal.id,
            this.goal.pos.roomName,
            this.nextNode.id,
            this.nextNode.pos.roomName,
            this.travelCost
        ];
        return items.join("|");
    }

    static deserialize(str) {
        let [originId, originRoomName, goalId, goalRoomName, nextNodeId, nextNodeRoomName, cost] = str.split("|");

        let oRoom = global.utils.pStar.inst.getRoom(originRoomName);
        let origin = oRoom.getNode(originId);
        let gRoom = global.utils.pStar.inst.getRoom(goalRoomName);
        let goal = gRoom.getNode(goalId);
        let nRoom = global.utils.pStar.inst.getRoom(nextNodeRoomName);
        let next = nRoom.getNode(nextNodeId);
        return new DestinationInfo(origin, goal, next, cost);
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
        this._destMap = false;
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
            /** @type {Edge} */
            let edge = pStar.edges.thingsById[edgeId];
            
            //logger.log("processing edge:", JSON.stringify(edge))
            
            let otherNode = edge.getOtherNode(this);
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
        edge = new Edge(this, otherNode);
        logger.log("couldn't find node edge!", edgeId, edge.id);
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
            if (this.pos.roomName == destNode.pos.roomName) {
                return this.pos.getRangeTo(destNode.pos);
            } else {
                return this.pos.toWorldPosition().getRangeTo(destNode.pos);
            }
            
        }
        //logger.log(this.id, "using path cost")
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

        //log("got node")
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
            //logger.log("next closest node:", currentNode.id, nextNode ? nextNode.id : "no node!!");
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
        return;

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
        //let ser = this.pos.toWorldPosition().serialize() + '|' + this.type
        let ser = this.pos.x + "-" + this.pos.y + "-" + this.pos.roomName + '|' + this.type
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
        // let nodes = [node1Id, node2Id];
        // nodes = nodes.sort();
        if (node1Id < node2Id) {
            let swp = node1Id;
            node1Id = node2Id;
            node2Id = swp;
        }
        return node1Id + "_" + node2Id;
    }
    get id() {
        return this.node1Id + "_" + this.node2Id;
    }
    get cost() {
        return this.path.cost;
    }
    constructor(node1, node2) {
        
        if (!node1 || !node2) {
            throw new Error("invalid nodes passed!" + node1 + " " + node2)
        }
        //check if we should swap the nodes so that node1 and node2 are in a constant direction
        if (node1.id < node2.id) {
        //if (node1.pos.x < node2.pos.x && node1.pos.y < node2.pos.y && node1.pos.roomName < node2.pos.roomName) {
            let swp = node1;
            node1 = node2;
            node2 = swp;
        }
        // let nodes = [node1, node2];
        // nodes = _.sortBy(nodes, (n) => n.id);
        // //logger.log(JSON.stringify(nodes));
        // node1 = nodes[0];
        // node2 = nodes[1];
        this.node1Id = node1.id;
        this.node1Pos = node1.pos;
        this.node2Id = node2.id;
        this.node2Pos = node2.pos;

        this.path = new global.utils.map.classes.CachedPath(this.node1Pos, this.node2Pos);
        //this.cost = this.node1Pos.getRangeTo(this.node2Pos);
        this.lastUpdated = 0;
    }
    getOtherNode(node) {
        let otherRoom;
        let otherNodeId;
        if (node.id == this.node1Id) {
            otherNodeId = this.node2Id;
            otherRoom = global.utils.pStar.inst.rooms.thingsById[this.node2Pos.roomName];
        } else {
            otherNodeId = this.node1Id;
            otherRoom = global.utils.pStar.inst.rooms.thingsById[this.node1Pos.roomName];
        }
        return otherRoom.nodes.thingsById[otherNodeId];
    }
    edgeNeedsRefinement() {
        return !this.path.path || this.lastUpdated == 0 || (Game.time - this.lastUpdated) >= global.utils.pStar.inst.edgeTicksValid;
    }

    checkIntersections() {
        logger.log("refining edge", this.id);

        // if (!Game.rooms[this.node1Pos.roomName] || !Game.rooms[this.node2Pos.roomName]) {
        //     //I can't see! bum ba dum dum dum dum WOOWOOOOO is meee!!
        //     return false;
        //     //I can't see!
        // }
        
        //invalidate connected nodes
        let pStar = global.utils.pStar.inst;
        let n1Room = pStar.getRoom(this.node1Pos.roomName);
        let n2Room = pStar.getRoom(this.node2Pos.roomName);
        if (!n1Room || !n2Room) {
            return false;
        }
        if (!n1Room.getNode(this.node1Id) || !n2Room.getNode(this.node2Id)) {
            return false;
        }
        n1Room.getNode(this.node1Id).lastUpdated = 0;
        n2Room.getNode(this.node2Id).lastUpdated = 0;

        // n1Room.removeEdgeFromPosMap(this);
        // n2Room.removeEdgeFromPosMap(this);

        if (n1Room.roomName == n2Room.roomName) {
            //walk path and check for intersecting nodes and edges
            let cm = global.utils.cm.getCM(this.node1Pos.roomName, "pStar");
            let path = this.path.getPath();
            let currentEdge = this;
            let startNode = n1Room.getNode(currentEdge.node1Id);
            for(let p in path) {
                
                let pos = path[p];

                

                let atEnds = p == 0 || p == path.length - 1;
                let closeToEnds = p <= 1 || p >= path.length - 2;
                
                let intersectionNode = new Node(pos, Node.INTERSECTION);
                let intersectingEdge = n1Room.getEdgeAtPos(pos);

                cm.set(pos.x, pos.y, 1);
                if (!n1Room.getEdgeAtPos(pos)) {
                    n1Room.setEdgeAtPos(pos, this.id);
                }

                if (n1Room.hasNode(intersectionNode)) {
                    //intersecting node
                    if (intersectionNode.id == this.node1Id || intersectionNode.id == this.node2Id) {
                        if (intersectionNode.id == this.node1Id) { //start node
                            global.utils.visual.circle(pos, "#fff", 1, 0.5);
                        } else {
                            global.utils.visual.circle(pos, "#000", 1, 0.5);
                        }
                        
                    } else {
                        //valid intersection, bi-sect currect edge with node.
                        logger.log("found Intersection node", intersectionNode.id, n1Room.nodes.hasId(intersectionNode.id))
                        

                        let ourNode1 = n1Room.getNode(currentEdge.node1Id);
                        let ourNode2 = n1Room.getNode(currentEdge.node2Id);

                        let ourEdge1 = new Edge(ourNode1, intersectionNode);
                        let ourEdge2 = new Edge(ourNode2, intersectionNode);
                        ourEdge1.lastUpdated = ourEdge2.lastUpdated = currentEdge.lastUpdated;

                        let [ourPath1, ourPath2] = currentEdge.path.splitAtPos(intersectionNode.pos);
                        if(!ourPath1) {
                            continue;
                        }
                        ourEdge1.path = ourPath1;
                        ourEdge2.path = ourPath2;


                        if (global.utils.pStar.inst.edges.hasId(currentEdge.id)) {
                            global.utils.pStar.inst.removeEdge(currentEdge);
                        }
                        n1Room.removeEdgeFromPosMap(currentEdge);


                        global.utils.pStar.inst.edges.add(ourEdge1);
                        global.utils.pStar.inst.edges.add(ourEdge2);

                        

                        if (startNode.id == ourNode1.id) {
                            currentEdge = ourEdge2;
                            n1Room.addEdgeToPosMap(ourEdge1);
                        } else {
                            currentEdge = ourEdge1;
                            n1Room.addEdgeToPosMap(ourEdge2);
                        }
                        
                        startNode = intersectionNode;

                        global.utils.visual.circle(pos, "#00f", 1, 0.5);
                    }
                } else if (intersectingEdge && intersectingEdge.id != currentEdge.id) {
                    
                    let interNode1 = n1Room.getNode(intersectingEdge.node1Id);
                    let interNode2 = n1Room.getNode(intersectingEdge.node2Id);

                    let ourNode1 = n1Room.getNode(currentEdge.node1Id);
                    let ourNode2 = n1Room.getNode(currentEdge.node2Id);

                    let skipSpot = false;
                    //look for edges that contain our starting node
                    if (startNode.id == interNode1.id || startNode.id == interNode2.id) {
                        
                        let nextPos = path[Number.parseInt(p)+1];
                        //logger.log(path.length, p, Number.parseInt(p)+1);
                        if(nextPos) {
                            //logger.log("nextpos", nextPos);
                            let nextIntersectionNode = new Node(nextPos, Node.INTERSECTION);
                            let nextIntersectingEdge = n1Room.getEdgeAtPos(nextPos);

                            //if (!nextIntersectingEdge || (!n1Room.hasNode(nextIntersectionNode) && nextIntersectingEdge.id != intersectingEdge.id)) {
                            if (!nextIntersectingEdge) {
                                logger.log("diverging point", pos);
                                //we have a diverging point!
                                //global.utils.visual.circle(pos, "#fff", 1, 0.5);
                                skipSpot = false;
                            } else {
                                logger.log('no diverging point!', nextIntersectingEdge.id);
                                //no diverging point, skip till we find one
                                skipSpot = true;
                            }
                        } else {
                            logger.log("no next position, skip this spot cuz I dunno.. why not")
                            skipSpot = true;
                        }
                    }

                    if (skipSpot) {
                        global.utils.visual.circle(pos, "#ff0", 1, 0.5);
                        logger.log("skipping intersection")
                        continue;
                    }

                    global.utils.visual.circle(pos, "#f00", 1, 0.5);
                    //intersecting edge
                    intersectingEdge.displayEdge("#f00", 0.5);

                    //actuall do the swap
                    logger.log("adding Intersection node", intersectionNode.id, n1Room.nodes.hasId(intersectionNode.id))
                    
                    



                    //make new edges
                    let interEdge1 = new Edge(interNode1, intersectionNode);
                    let interEdge2 = new Edge(interNode2, intersectionNode);
                    let ourEdge1 = new Edge(ourNode1, intersectionNode);
                    let ourEdge2 = new Edge(ourNode2, intersectionNode);
                    
                    //extract/insert path info
                    let [interPath1, interPath2] = intersectingEdge.path.splitAtPos(intersectionNode.pos);
                    let [ourPath1, ourPath2] = currentEdge.path.splitAtPos(intersectionNode.pos);
                    logger.log("splitting", intersectingEdge.id, "at", pos, JSON.stringify(interPath1), JSON.stringify(interPath2));
                    
                    if (!ourPath1 || ! interPath1) {
                        continue;
                    }

                    interEdge1.path = interPath1;                    
                    interEdge2.path = interPath2;


                    ourEdge1.path = ourPath1;
                    ourEdge2.path = ourPath2;

                    interEdge1.lastUpdated = interEdge2.lastUpdated = intersectingEdge.lastUpdated;
                    ourEdge1.lastUpdated = ourEdge2.lastUpdated = currentEdge.lastUpdated;
                    

                    //remove old edges
                    global.utils.pStar.inst.removeEdge(intersectingEdge);
                    if (global.utils.pStar.inst.edges.hasId(currentEdge.id)) {
                        global.utils.pStar.inst.removeEdge(currentEdge);
                    }

                    //remove old edges from room's edge map
                    n1Room.removeEdgeFromPosMap(intersectingEdge);
                    n1Room.removeEdgeFromPosMap(currentEdge);

                    n1Room.addNode(intersectionNode, false);

                    global.utils.pStar.inst.edges.add(interEdge1);
                    global.utils.pStar.inst.edges.add(interEdge2);
                    global.utils.pStar.inst.edges.add(ourEdge1);
                    global.utils.pStar.inst.edges.add(ourEdge2);
                    
                    
                    n1Room.addEdgeToPosMap(interEdge2);
                    n1Room.addEdgeToPosMap(interEdge1);

                    //n1Room.addEdgeToPosMap(ourEdge2);

                    if(startNode.id == ourNode1.id) {
                        currentEdge = ourEdge2;
                        n1Room.addEdgeToPosMap(ourEdge1);
                    } else {
                        currentEdge = ourEdge1;
                        n1Room.addEdgeToPosMap(ourEdge2);
                    }
                    
                    startNode = intersectionNode;
                    

                } else {
                    //no intersection
                    if(intersectingEdge.id == currentEdge.id) {
                        global.utils.visual.circle(pos, "#f0f", 1, 0.5);
                    } else {
                        global.utils.visual.circle(pos, "#0f0", 1, 0.5);
                    }
                    
                }
            }
        }
    }

    refineEdge(skipNetworkRefinement=false) {
        if (!this.path.path || this.lastUpdated == 0 || (Game.time - this.lastUpdated) >= global.utils.pStar.inst.edgeTicksValid) {
            logger.log("refining edge", this.id);

            // if (!Game.rooms[this.node1Pos.roomName] || !Game.rooms[this.node2Pos.roomName]) {
            //     //I can't see! bum ba dum dum dum dum WOOWOOOOO is meee!!
            //     return false;
            //     //I can't see!
            // }
            
            //invalidate connected nodes
            let pStar = global.utils.pStar.inst;
            let n1Room = pStar.getRoom(this.node1Pos.roomName);
            let n2Room = pStar.getRoom(this.node2Pos.roomName);
            if (!n1Room || !n2Room) {
                return false;
            }
            if (!n1Room.getNode(this.node1Id) || !n2Room.getNode(this.node2Id)) {
                return false;
            }
            n1Room.getNode(this.node1Id).lastUpdated = 0;
            n2Room.getNode(this.node2Id).lastUpdated = 0;

            // n1Room.removeEdgeFromPosMap(this);
            // n2Room.removeEdgeFromPosMap(this);

            

            //bake in path/cost
            let path = this.path.getPath();
            logger.log('wtf is this path', path, JSON.stringify(path))
            global.utils.visual.drawPath(path, "#00f");
            this.lastUpdated = Game.time;

            if (skipNetworkRefinement) {
                return true;
            }

            this.checkIntersections();
            //we got the path, add the positions to our cost matrix
            
            // let cm = global.utils.cm.getCM(this.node1Pos.roomName, "pStar");
            
            // for(let p in path) {
                
            //     let pos = path[p];

                

            //     let atEnds = p == 0 || p == path.length - 1;
            //     let closeToEnds = p <= 1 || p >= path.length - 2;


            //     if (n1Room.roomName == n2Room.roomName && !atEnds && pos.roomName == n1Room.roomName) {
                    
            //         if (!n1Room.getEdgeAtPos(pos)) {
            //             n1Room.setEdgeAtPos(pos, this.id);
            //         }

            //         let intersectionNode = new Node(pos, Node.INTERSECTION);
            //         if (n1Room.hasNode(intersectionNode)) {
            //             let ourNode1 = n1Room.getNode(this.node1Id);
            //             let ourNode2 = n1Room.getNode(this.node2Id);

            //             if (intersectionNode.id == ourNode1.id || intersectionNode.id == ourNode2.id) {
            //                 continue;
            //             }

            //             if (global.utils.pStar.inst.edges.hasId(this.id)) {
            //                 global.utils.pStar.inst.removeEdge(this);
            //                 global.utils.cm.clearPathFromCM(cm, this.path.path);
            //             }
                        
            //             n1Room.removeEdgeFromPosMap(this);

            //             global.utils.pStar.inst.addEdge(intersectionNode, ourNode1);
            //             global.utils.pStar.inst.addEdge(intersectionNode, ourNode2);
            //             global.utils.visual.circle(pos, "#00f", 1, 0.5);

            //             return true;
            //         } else {
            //             // if (p <= 1 || p >= path.length - 2) {
            //             //     continue;
            //             // } 
            //             let intersectingEdge = n1Room.getEdgeAtPos(pos);
                        
            //             if (intersectingEdge && intersectingEdge.id !== this.id) {
            //                 //intersectingEdge.displayEdge("#f00");
            //                 let interNode1 = n1Room.getNode(intersectingEdge.node1Id);
            //                 let interNode2 = n1Room.getNode(intersectingEdge.node2Id);

            //                 let ourNode1 = n1Room.getNode(this.node1Id);
            //                 let ourNode2 = n1Room.getNode(this.node2Id);

            //                 logger.log("found intersection", this.id, intersectingEdge.id);
            //                 logger.log(ourNode1.id, ourNode2.id, interNode1.id, interNode2.id);
            //                 logger.log(ourNode1.id == interNode1.id, ourNode1.id == interNode2.id)
            //                 let skipSpot = false;
            //                 if (ourNode1.id == interNode1.id || ourNode1.id == interNode2.id) {
                                
            //                     let nextPos = path[Number.parseInt(p)+1];
            //                     logger.log(path.length, p, Number.parseInt(p)+1);
            //                     if(nextPos) {
            //                         logger.log("nextpos", nextPos);
            //                         let nextIntersectingEdge = n1Room.getEdgeAtPos(nextPos);
            //                         if (!nextIntersectingEdge) {
            //                             logger.log("diverging point", pos);
            //                             //we have a diverging point!
            //                             global.utils.visual.circle(pos, "#fff", 1, 0.5);
            //                             skipSpot = false;
            //                         } else {
            //                             logger.log('no diverging point!', nextIntersectingEdge.id);
            //                             //no diverging point, skip till we find one
            //                             skipSpot = true;
            //                         }
            //                     } else {
            //                         logger.log("no next position, skip this spot cuz I dunno.. why not")
            //                         skipSpot = true;
            //                     }
            //                 }

            //                 if (skipSpot) {
            //                     global.utils.visual.circle(pos, "#ff0", 1, 0.5);
            //                     logger.log("skipping intersection")
            //                     continue;
            //                 }
                            
            //                 global.utils.visual.circle(pos, "#f00", 1, 0.5);


            //                 logger.log("adding Intersection node", intersectionNode.id, n1Room.nodes.hasId(intersectionNode.id))
            //                 n1Room.addNode(intersectionNode, false);

            //                 //remove old edges
            //                 global.utils.pStar.inst.removeEdge(intersectingEdge);
            //                 global.utils.cm.clearPathFromCM(cm, intersectingEdge.path.path);
                        
            //                 if (global.utils.pStar.inst.edges.hasId(this.id)) {
            //                     global.utils.pStar.inst.removeEdge(this);
            //                     global.utils.cm.clearPathFromCM(cm, this.path.path);
            //                 }
            //                 //remove old edges from room's edge map
            //                 n1Room.removeEdgeFromPosMap(intersectingEdge);
            //                 n1Room.removeEdgeFromPosMap(this);

            //                 global.utils.pStar.inst.addEdge(intersectionNode, ourNode1);
            //                 global.utils.pStar.inst.addEdge(intersectionNode, ourNode2);
            //                 global.utils.pStar.inst.addEdge(intersectionNode, interNode1);
            //                 global.utils.pStar.inst.addEdge(intersectionNode, interNode2);
            //                 let replacementEdgeId = Edge.makeEdgeId(intersectionNode.id, ourNode1.id);
            //                 let replacementEdge = global.utils.pStar.inst.edges.getById(replacementEdgeId);
            //                 logger.log(replacementEdgeId, replacementEdge);
            //                 replacementEdge.refineEdge(true);
            //                 replacementEdge.displayEdge("#0f0");

                            

            //                 return true;

            //                 //logger.log(this.id, "found intersection", intersectingEdge.id)               
            //             } else {
            //                 global.utils.visual.circle(pos, "#0f0", 1, 0.5);
            //             }
            //         }
            //     } else {
            //         global.utils.visual.circle(pos, "#000", 1, 0.5);
            //     }
                
            //     if (!closeToEnds) {
            //         cm.set(pos.x, pos.y, 4);
            //     }
            // }

            return true;
        } else {
            //logger.log(this.node1Pos, this.node2Pos, "already updated", this.path.path)
        }
        return false;
    }

    

    displayEdge(color = "#999", opacity = 0.5) {
        if ( this.path.length == 0) {
            //empty path?
            logger.log("empty path", this.id)
        }
        //if path isn't fully loaded, but cached, then load the roomPositions
        if (!this.path.path && this.path._cachedPath) {
            this.path.getPath();
        }

        
        if (!this.path.path || this.path.path.length == 0) {
            new RoomVisual(this.node1Pos.roomName).line(this.node1Pos, this.node2Pos, {color: color, lineStyle: "dashed", opacity:0.1})
        } else {
            //logger.log("--",Game.time,this.lastUpdated, Game.time - this.lastUpdated,ticksValid)
            //let toRefresh = 1-((Game.time - this.lastUpdated)/ticksValid);
            //logger.log(toRefresh)
            let style = {
                opacity: opacity
            }
            //let color = "#" + global.utils.visual.rgbColor(150,150,150);
            //logger.log(JSON.stringify(this.path));
            
            //global.utils.visual.drawText(this.cost, this.path.path[Math.floor(this.path.path.length/2)]);
            
            global.utils.visual.drawPath(this.path.path, color, style)
        }
    }
    

    serialize(level) {
        //level = 1;
        //level is 1-x for "memory level", like L1, L2, L3 cache. but reversed
        //logger.log(this.id, "serializing", level, level==1 ? "adding path" : "not adding path", "lol even has a path?", this.path.path.length>0)
        let arr = [
            this.node1Id,
            this.node1Pos.roomName,
            this.node2Id,
            this.node2Pos.roomName,
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
        let start = Game.cpu.getUsed();
        let log = (...args) => {
            let usedNow = Game.cpu.getUsed();
            let used = usedNow - start;
            logger.log("cpu used:", used, ...args);
            start = usedNow;
        }
        let [n1Id, n1r, n2Id, n2r, lastUpdated, cachedPath] = str.split("|");
        //we'll assume these will be valid for now
        let node1Room = global.utils.pStar.inst.rooms.thingsById[n1r];
        let node1 = node1Room.nodes.thingsById[n1Id];
        let node2Room = global.utils.pStar.inst.rooms.thingsById[n2r];
        let node2 = node2Room.nodes.thingsById[n2Id];
        //log("1")
        //logger.log(n1Id, node1);
        //logger.log(n2Id, node2);
        let inst = new Edge(node1, node2);
        inst.lastUpdated = lastUpdated;
        //log("2")
        if (cachedPath) {
            //logger.log("----",cachedPath)
            inst.path = global.utils.map.classes.CachedPath.deserialize(cachedPath);
            //inst.path.getPath();
            //logger.log(JSON.stringify(inst.path))
        }
        //log("3")
        return inst;
    }
}

class pStarRoom {
    constructor(roomName) {
        this.roomName = roomName;

        this.nodes = new global.utils.array.classes.IndexingCollection("id", ["pos.roomName", "type"], [100000, 1000000]);
        this.nodes.serializeSeperator = "ʭ";

        this.ticksValid = 1000;
        this.lastUpdated = 0;

        this.exitsAdded = false;

        /**
         * RoomPosition => edgeId
         */
        this.posEdgeMap = new Map();
    }

    /**
     * 
     * @param {RoomPosition} pos
     * 
     * @returns {Edge} 
     */
    getEdgeAtPos(pos) {
        let keys = this.posEdgeMap.keys();
        for(const edgePos of keys) {
            if (pos.isEqualTo(edgePos)) {
                pos = edgePos;
                break;
            }
        }

        if (this.posEdgeMap.has(pos)) {
            let edgeId = this.posEdgeMap.get(pos);
            let edge = global.utils.pStar.inst.edges.getById(edgeId);
            if (!edge) {
                this.posEdgeMap.delete(pos);
                return false;
            }
            return edge;
        }
        return false;
    }

    setEdgeAtPos(pos, edgeId) {
        let keys = this.posEdgeMap.keys();
        for(const edgePos of keys) {
            if (pos.isEqualTo(edgePos)) {
                pos = edgePos;
                break;
            }
        }

        //logger.log(pos, this.posEdgeMap.has(pos), edgeId, this.getEdgeAtPos(pos))
        if (this.posEdgeMap.has(pos)) {
            throw new Error("Pos already an edge");
        }

        this.posEdgeMap.set(pos, edgeId);
    }
    /**
     * 
     * @param {Edge} edge 
     */
    removeEdgeFromPosMap(edge) {
        let keys = this.posEdgeMap.keys();
        logger.log('removing edge', edge.id);
        for(let pos of keys) {
            //let pos = keys[k];
            //logger.log("removing from edge map", pos, this.posEdgeMap.get(pos), edge.id)
            if (this.posEdgeMap.get(pos) == edge.id) {
                // let cm = global.utils.cm.getCM(this.roomName, "pStar");
                // global.utils.cm.clearPathFromCM(cm, edge.path.path);
                this.posEdgeMap.delete(pos);
            }
        }
    }

    /**
     * 
     * @param {Edge} edge 
     */
    addEdgeToPosMap(edge) {
        let path = edge.path.path;
        for(let p in path) {
            let pos = path[p];
            if (!this.getEdgeAtPos(pos)) {
                this.setEdgeAtPos(pos, edge.id);
            }
            //this.posEdgeMap[pos] = edge.id;
        }
    }

    displayPosMap() {
        
        this.posEdgeMap.forEach((edgeId, pos) => {
            //logger.log("I'm prolly dumb.. wanna bet pos isn't a room position??", pos, pos.x, edgeId);
            global.utils.visual.drawText("#", pos);    
        });
    }

    displayRoom() {
        let center = new RoomPosition(25, 25, this.roomName);
        global.utils.visual.drawText(this.roomName + " " + Object.keys(this.nodes.thingsById).length, center);
        this.displayNodes();
        this.displayPosMap();
    }

    displayNodes() {
        let allNodes = this.nodes.getAll();
        for(let n in allNodes) {
            /** @type {Node} */
            let node = allNodes[n];
            node.displayNode();
        }

        //logger.log(this.roomName, "total nodes:", Object.keys(this.nodes.thingsById).length);
    }

    refineRoom() {
        if (Game.time > (this.lastUpdated + this.ticksValid)) {
            logger.log(this.roomName, "updating!", Game.time, this.lastUpdated, this.ticksValid)

            //first, add our neighbor rooms to pStar
            let exits = Game.map.describeExits(this.roomName);
            for(let dir in exits) {
                let otherRoom = exits[dir];
                global.utils.pStar.inst.addRoomToAdditionQueue(otherRoom);
            }

            if (!this.exitsAdded) {
                //add room exit nodes for this room
                this.addRoomExitNodes();
                this.exitsAdded = true;
            }
            

            this.lastUpdated = Game.time;
            return true;
        }
        return false;
    }


    getNode(nodeId) {
        return this.nodes.getById(nodeId);
    }
    hasNode(node) {
        if (!(node instanceof Node)) {
            throw new Error("Adding invalid Node:", node);
        }
        return this.nodes.has(node);
    }

    addNode(node, autoAddEdges=true) {
        if (!(node instanceof Node)) {
            throw new Error("Adding invalid Node:", node);
        }
        if(this.hasNode(node)) {
            throw new Error("Already a node at this location");
        }
        this.nodes.add(node);
        if (autoAddEdges) {
            this.addNodeEdges(node);
        }

        //add to CM
        //let cm = global.utils.cm.getCM(node.pos.roomName, "pStar");
        //cm.set(node.pos.x, node.pos.y, 1);
        
    }

    
    removeNode(node) {
        if (!(node instanceof Node)) {
            throw new Error("Adding invalid Node:", node);
        }
        this.nodes.remove(node);
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
                

                let getExitsForRoom = (roomName) => {
                    /** @type {pStarRoom} */
                    let room = global.utils.pStar.inst.rooms.thingsById[roomName];
                    if (!room) {
                        //logger.log(roomName, "not explored yet")
                        return false;//haven't gotten to that room yet
                    }
                    //logger.log(node.id, "trying to add connections.. butttt..", roomName, "room not found!", room);
                    let nodes = room.nodes.getGroupWithValue("type", Node.ROOM_EXIT);
                    let nodes2 = room.nodes.getGroupWithValue("type", Node.BASE);
                    //nodes = _.filter(nodes, (nodeId) => this.nodes.thingsById[nodeId].type == Node.ROOM_EXIT);
                    let out = [];
                    if (nodes) out = out.concat(nodes);
                    if (nodes2) out = out.concat(nodes2);
                    return out;
                }
                let exits = Game.map.describeExits(node.pos.roomName);
                let otherRooms = _.values(exits);
                let roomExitNodes = getExitsForRoom(node.pos.roomName);
                if (!roomExitNodes) {
                    roomExitNodes = [];
                }
                for(let r in otherRooms) {
                    let otherRoomName = otherRooms[r];
                    let roomExits = getExitsForRoom(otherRoomName);
                    if (roomExits) {
                        roomExitNodes = roomExitNodes.concat(roomExits);
                    }
                    
                }
                //let roomExitNodes = this.nodes.getGroupWithValue("type", Node.ROOM_EXIT);
                roomExitNodes = _.shuffle(roomExitNodes);
                //logger.log("finding exits for", node.id);
                //logger.log(JSON.stringify(roomExitNodes));
                let thisNodePos = new RoomPosition(node.pos.x, node.pos.y, node.pos.roomName);
                let thisNodeWPos = thisNodePos.toWorldPosition();

                

                let nodesConnected = 0;
                let maxConnections = 20;
                
                let ourNodes = _.filter(roomExitNodes, (nodeId) => {
                    if (nodeId == node.id) {
                        return false;
                    }

                    let n = global.utils.pStar.inst.getNode(nodeId);
                    if (!n || n.pos.roomName != node.pos.roomName && otherRooms.indexOf(n.pos.roomName) == -1) {
                        //logger.log("ignoring choice cuz it sucks.. or you do.", nodeId, n)
                        return false;
                    }
                    //logger.log("???", JSON.stringify(n));
                    let nodePos = new RoomPosition(n.pos.x, n.pos.y, n.pos.roomName);
                    let d = thisNodeWPos.getRangeTo(nodePos);
                    //logger.log(d)
                    let sameRoomExit = (n.pos.roomName == thisNodePos.roomName) && n.pos.x != thisNodePos.x && n.pos.y != thisNodePos.y && (nodesConnected < maxConnections);
                    //logger.log("checking node", nodeId, sameRoomExit, d<4)
                    if (sameRoomExit || d < 4 || (n.type == Node.BASE && n.pos.roomName == thisNodePos.roomName)) {
                        if (n.type != Node.BASE) {
                            nodesConnected++;
                        }
                        return true;
                    }
                    return false;
                });
                //logger.log(node.id, "matching nodes", ourNodes)
                _.each(ourNodes, (nodeId) => {
                    let n = global.utils.pStar.inst.getNode(nodeId);
                    global.utils.pStar.inst.addEdge(node, n);
                    //logger.log("Adding room node connection!", node.pos.roomName, n.pos.roomName);
                })
                break;
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
                    dists[edgeKey.n.id+"-"+edgeKey.o.id]  = node.getDistanceTo(otherNode);
                    edges.push(edgeKey);
                    //global.utils.pStar.inst.addEdge(node, otherNode)
                    
                }
                //logger.log("----", JSON.stringify(edges));
                //logger.log(JSON.stringify(dists))
                edges = _.sortBy(edges, (e) => {
                    //logger.log(JSON.stringify(e), dists[e.n.id+"-"+e.o.id])
                    return dists[e.n.id+"-"+e.o.id]
                });
                //logger.log(JSON.stringify(edges))
                let maxExitConns = 20;
                let maxConns = 7;
                let conns = 0;
                let exitConns = 0;
                for(let i=0;i<edges.length;i++) {
                    let o = edges[i];
                    if (o.o.type == Node.ROOM_EXIT && (exitConns < maxExitConns || o.n.type == Node.BASE)) {
                        logger.log("adding edge connection", o.n.id, o.o.id, o.o.type)
                        exitConns++;
                        global.utils.pStar.inst.addEdge(o.n, o.o);
                    }

                    if (o.o.type != Node.ROOM_EXIT && conns < maxConns) {
                        logger.log("adding inner-room connection", o.n.id, o.o.id, o.n.type, o.o.type, Node.ROOM_EXIT)
                        conns++;
                        global.utils.pStar.inst.addEdge(o.n, o.o);
                    }

                    if (conns >= maxConns && exitConns >= maxExitConns) {
                        break;
                    }
                    
                }
                break;
        }
    }

    addRoomExitNodes() {
        let exits = global.utils.map.getExitPositions(this.roomName);
        //logger.log("got exits", JSON.stringify(exits));

        for(let exitDir in exits) {
            let exitPositions = exits[exitDir];
            let dx = 0;
            let dy = 0;
            let byX = true;
            switch (Number.parseInt(exitDir)) {
                case TOP:
                    dy = 1;
                    break;
                case LEFT:
                    dx = 1;
                    byX = false;
                    break;
                case BOTTOM:
                    dy = -1;
                    break;
                case RIGHT:
                    dx = -1;
                    byX = false;
                    break;
                default:
                    throw new Error("invalid direction!" + exitDir)
            }
            let groups = this.groupExits(exitPositions, byX, 15);

            //logger.log('adding exits', this.roomName, exitDir, groups.length);
            //logger.log(JSON.stringify(exitPositions))
            for(let g in groups) {
                let group = groups[g];
                let centerExit = group[Math.floor(group.length/2)];
                //make exit node one square towards center of room
                //logger.log("adding Node", exitDir, centerExit.x + dx, centerExit.y + dy, centerExit.roomName )
                let exitNodePos = new RoomPosition(centerExit.x + dx, centerExit.y + dy, centerExit.roomName);
                let node = new Node(exitNodePos, Node.ROOM_EXIT);
                if (!global.utils.pStar.inst.hasNode(node)) {
                    global.utils.pStar.inst.addNode(node);
                }
                
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

    serialize(level) {
        let arr = [
            this.roomName,
            this.lastUpdated,
            this.exitsAdded,
            this.nodes.serialize()
        ];
        return arr.join("ʬ");
    }

    static deserialize(str) {
        let [roomName, lastUpdated, exitsAdded, nodesStr] = str.split("ʬ");
        let inst = new pStarRoom(roomName);
        inst.lastUpdated = lastUpdated;
        inst.exitsAdded = exitsAdded;
        if (nodesStr) {
            //logger.log(nodesStr)
            inst.nodes = global.utils.array.classes.IndexingCollection.deserialize(nodesStr, Node);
        }
        return inst;
    }
}

// global.profiler.registerClass(pStarRoom,"pStarRoom");
// pStarRoom.deserialize = global.profiler.registerFN(pStarRoom.deserialize, "pStarRoom.deserialize");

// global.profiler.registerClass(Node,"Node");
// Node.deserialize = global.profiler.registerFN(Node.deserialize, "Node.deserialize");

// global.profiler.registerClass(Edge,"Edge");
// Edge.deserialize = global.profiler.registerFN(Edge.deserialize, "Edge.deserialize");

// global.profiler.registerClass(DestinationInfo,"DestinationInfo");
// DestinationInfo.deserialize = global.profiler.registerFN(DestinationInfo.deserialize, "DestinationInfo.deserialize");

module.exports = {
    classes: {
        pStarRoom,
        Node,
        Edge,
        DestinationInfo,
    }


}