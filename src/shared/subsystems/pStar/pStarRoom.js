class pStarRoom {
    constructor(roomName) {
        this.roomName = roomName;

        this.nodes = new IndexingCollection("id", ["pos.roomName", "type"], [100000, 1000000]);
        this.nodes.serializeSeperator = "ʭ";

        this.ticksValid = 10000;
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
            let edge = pstar.inst.edges.getById(edgeId);
            if (!edge) {
                this.posEdgeMap.delete(pos);
                return false;
            }
            return edge;
        }
        return false;
    }

    getEdgeMapPosObj(pos) {
        let keys = this.posEdgeMap.keys();
        for(const edgePos of keys) {
            if (pos.isEqualTo(edgePos)) {
                pos = edgePos;
                break;
            }
        }
        return pos;
    }

    setEdgeAtPos(pos, edgeId) {
        pos = this.getEdgeMapPosObj(pos);

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
                // let cm = cm.getCM(this.roomName, "pStar");
                // cm.clearPathFromCM(cm, edge.path.path);
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
            pos = this.getEdgeMapPosObj(pos);
            if (!this.posEdgeMap.has(pos)) {
                this.setEdgeAtPos(pos, edge.id);
            }

            //this.posEdgeMap[pos] = edge.id;
        }
    }

    displayPosMap() {

        this.posEdgeMap.forEach((edgeId, pos) => {
            //logger.log("I'm prolly dumb.. wanna bet pos isn't a room position??", pos, pos.x, edgeId);
            visual.drawText("#", pos);
        });
    }

    displayRoom() {
        let center = new RoomPosition(25, 25, this.roomName);
        visual.drawText(this.roomName + " " + Object.keys(this.nodes.thingsById).length, center);
        this.displayNodes();
        //this.displayPosMap();
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
                pstar.inst.addRoomToAdditionQueue(otherRoom);
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
            throw new Error("Checking for invalid Node:", node);
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
        //let cm = cm.getCM(node.pos.roomName, "pStar");
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
                    let room = pstar.inst.rooms.thingsById[roomName];
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
                let maxConnections = 200;

                let ourNodes = _.filter(roomExitNodes, (nodeId) => {
                    if (nodeId == node.id) {
                        return false;
                    }

                    let n = pstar.inst.getNode(nodeId);
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
                    let n = pstar.inst.getNode(nodeId);
                    pstar.inst.addEdge(node, n);
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
                    //pstar.inst.addEdge(node, otherNode)

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
                        pstar.inst.addEdge(o.n, o.o);
                    }

                    if (o.o.type != Node.ROOM_EXIT && conns < maxConns) {
                        logger.log("adding inner-room connection", o.n.id, o.o.id, o.n.type, o.o.type, Node.ROOM_EXIT)
                        conns++;
                        pstar.inst.addEdge(o.n, o.o);
                    }

                    if (conns >= maxConns && exitConns >= maxExitConns) {
                        break;
                    }

                }
                break;
        }
    }

    addRoomExitNodes() {
        let exits = map.getExitPositions(this.roomName);
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
            let groups = this.groupExits(exitPositions, byX, 10);

            //logger.log('adding exits', this.roomName, exitDir, groups.length);
            //logger.log(JSON.stringify(exitPositions))
            for(let g in groups) {
                let group = groups[g];
                let centerExit = group[Math.floor(group.length/2)];
                //make exit node one square towards center of room
                //logger.log("adding Node", exitDir, centerExit.x + dx, centerExit.y + dy, centerExit.roomName )
                let exitNodePos = new RoomPosition(centerExit.x + dx, centerExit.y + dy, centerExit.roomName);
                let node = new Node(exitNodePos, Node.ROOM_EXIT);
                if (!pstar.inst.hasNode(node)) {
                    pstar.inst.addNode(node);
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
            inst.nodes = IndexingCollection.deserialize(nodesStr, Node);
        }
        return inst;
    }
}
module.exports = pStarRoom;
