
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
            this._id = this.pos.toWorldPosition().serialize(); //smaller ids
            //this._id = `${this.pos.x}-${this.pos.y}-${this.pos.roomName}`; //easier to debug
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
        //this._destMap = false;
        if (!this._destMap) {
            let pStar = pstar.inst;
            let destIds = pStar.distances.getGroupWithValue("origin.id", this.id); //list if ids
            this._destMap = new Map();
            for(let d in destIds) {
                let destId = destIds[d];
                let dest = pStar.distances.getById(destId);
                this._destMap.set(dest.goal.id, dest);
            }
        }

        let d = this._destMap;
        //this._destMap = false;

        return d;
    }
    get destinations() {
        let pStar = pstar.inst;
        let destIds = pStar.distances.getGroupWithValue("origin.id", this.id); //list if ids
        let dests = [];
        for(let d in destIds) {
            let destId = destIds[d];
            dests.push( pStar.distances.getById(destId) );
        }
        return dests;
    }
    get allEdges() {
        let pStar = pstar.inst;
        let edges1 = pStar.edges.getGroupWithValue("node1Id", this.id);//returns array of IDs
        let edges2 = pStar.edges.getGroupWithValue("node2Id", this.id);
        if (!edges1) edges1 = [];
        if (!edges2) edges2 = [];
        return edges1.concat(edges2);
    }
    get edgeNodes() {
        let pStar = pstar.inst;
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
        let pStar = pstar.inst;
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
        if (this.lastUpdated == false || (Game.time - this.lastUpdated) >= pstar.inst.nodeTicksValid) {
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

        let pStar = pstar.inst;

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
        let pStar = pstar.inst;
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

            if (!nextNode) {
                //throw new Error("I can't find no path mofo:" + this.id + " to " + destNode.id);
            } else {
                path.push(nextNode);
            }
            currentNode = nextNode;

            if (hops > hopsLimit || !nextNode) {
                incomplete = true;
                break;
            }
            hops++;
        }
        return {
            path,
            incomplete,
            cost: Number.parseInt(this.destinationsMap[destNode.id].travelCost),
            hops: hops + 1
        }
    }

    displayNode(showDests = false) {
        visual.drawText(this.type, this.pos);
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
            visual.drawTextLines(debug, this.pos);
        } else {
            visual.drawText(" " + this.destinations.length + " dests", this.pos)
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

module.exports = Node;
