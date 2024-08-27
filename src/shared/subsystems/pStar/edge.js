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
    /**
     *
     * @param {Node} node1
     * @param {Node} node2
     */
    constructor(node1, node2) {
        if (!node1 || !node2) {
            throw new Error("invalid nodes passed!" + node1 + " " + node2)
        }

        if (node1.pos.roomName != node2.pos.roomName && (node1.type != Node.ROOM_EXIT || node2.type != Node.ROOM_EXIT)) {
            throw new Error("Invalid Inter-room Edge!" + node1.id + " " + node2.id)
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

        this.path = new map.classes.CachedPath(this.node1Pos, this.node2Pos);
        //this.cost = this.node1Pos.getRangeTo(this.node2Pos);
        this.lastUpdated = 0;
    }
    getNodes() {
        let n1Room = pstar.inst.getRoom(this.node1Pos.roomName);
        let node1 = n1Room.getNode(this.node1Id);
        let n2Room = pstar.inst.getRoom(this.node2Pos.roomName);
        let node2 = n2Room.getNode(this.node2Id);
        return {
            node1,
            node2
        }
    }
    getOtherNode(node) {
        let otherRoom;
        let otherNodeId;
        if (node.id == this.node1Id) {
            otherNodeId = this.node2Id;
            otherRoom = pstar.inst.rooms.thingsById[this.node2Pos.roomName];
        } else {
            otherNodeId = this.node1Id;
            otherRoom = pstar.inst.rooms.thingsById[this.node1Pos.roomName];
        }
        return otherRoom.nodes.thingsById[otherNodeId];
    }
    edgeNeedsRefinement() {
        return !this.path.path || this.lastUpdated == 0 || (Game.time - this.lastUpdated) >= pstar.inst.edgeTicksValid;
    }

    /**
     *
     * @param {CachedPath} in_path
     */
    overridePath(in_path) {
        if (this.node1Pos.isEqualTo(in_path.orgin)) {
            this.path.path = in_path.path;
        } else if (this.node1Pos.isEqualTo(in_path.goal)) {
            this.path.path = in_path.path.reverse();
        } else {
            throw new Error("wtf are you doing, path makes no sense mofo")
        }
        this.path.pathCost = Number.parseInt(in_path.pathCost);
    }

    checkIntersections() {
        logger.log("refining network for edge", this.id);

        // if (!Game.rooms[this.node1Pos.roomName] || !Game.rooms[this.node2Pos.roomName]) {
        //     //I can't see! bum ba dum dum dum dum WOOWOOOOO is meee!!
        //     return false;
        //     //I can't see!
        // }

        //invalidate connected nodes
        let pStar = pstar.inst;
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
            let cm = cm.getCM(this.node1Pos.roomName, "pStar");
            let path = this.path.getPath();
            let remainingEdge = this;
            let startNode = n1Room.getNode(remainingEdge.node1Id);
            for(let p in path) {
                let pos = path[p];
                pos = n1Room.getEdgeMapPosObj(pos);
                //logger.log("looking at pos", pos);




                let atEnds = p == 0 || p == path.length - 1;
                let closeToEnds = p <= 1 || p >= path.length - 2;

                let intersectionNode = new Node(pos, Node.INTERSECTION);

                let intersectingEdge = n1Room.getEdgeAtPos(pos);

                if (pos.roomName == this.node1Pos.roomName) {
                    let terrain = new Room.Terrain(pos.roomName);
                    let mask = terrain.get(pos.x, pos.y);
                    if (mask === TERRAIN_MASK_SWAMP) {
                        cm.set(pos.x, pos.y, 9);
                    } else {
                        cm.set(pos.x, pos.y, 1);
                    }

                }
                //cm.set(pos.x, pos.y, 1);
                if (!n1Room.getEdgeAtPos(pos)) {
                    n1Room.setEdgeAtPos(pos, remainingEdge.id);
                }

                if (n1Room.hasNode(intersectionNode)) {
                    intersectionNode = n1Room.getNode(intersectionNode.id);
                    //logger.log("intersecting node", intersectionNode.id, intersectionNode.type);

                    //intersecting node
                    if (intersectionNode.id == this.node1Id || intersectionNode.id == this.node2Id) {
                        if (intersectionNode.id == startNode.id) { //start node
                            //visual.circle(pos, "#fff", 1, 0.5);
                        } else {
                            //visual.circle(pos, "#000", 1, 0.5);
                        }

                    } else {
                        //valid intersection, bi-sect currect edge with node.
                        //logger.log("found Intersection node", intersectionNode.id, n1Room.nodes.hasId(intersectionNode.id))
                        //pstar.inst.logNetwork();

                        let ourNode1 = n1Room.getNode(remainingEdge.node1Id);
                        let ourNode2 = n1Room.getNode(remainingEdge.node2Id);

                        let ourEdge1 = new Edge(ourNode1, intersectionNode);
                        let ourEdge2 = new Edge(ourNode2, intersectionNode);
                        ourEdge1.lastUpdated = ourEdge2.lastUpdated = remainingEdge.lastUpdated;

                        let [ourPath1, ourPath2] = remainingEdge.path.splitAtPos(intersectionNode.pos);
                        if(!ourPath1) {
                            continue;
                        }
                        ourEdge1.overridePath(ourPath1);
                        ourEdge2.overridePath(ourPath2);


                        if (pstar.inst.edges.hasId(remainingEdge.id)) {
                            pstar.inst.removeEdge(remainingEdge);
                        }
                        n1Room.removeEdgeFromPosMap(remainingEdge);


                        pstar.inst.edges.add(ourEdge1);
                        pstar.inst.edges.add(ourEdge2);



                        if (startNode.id == ourNode1.id) {
                            remainingEdge = ourEdge2;
                            n1Room.addEdgeToPosMap(ourEdge1);
                        } else {
                            remainingEdge = ourEdge1;
                            n1Room.addEdgeToPosMap(ourEdge2);
                        }


                        startNode = intersectionNode;

                        //pstar.inst.logNetwork();
                        //logger.log("intersected node!", startNode.id, remainingEdge.id);
                        //visual.circle(pos, "#00f", 1, 0.5);
                    }
                } else if (intersectingEdge && intersectingEdge.id != remainingEdge.id) {

                    //logger.log('found intersecting edge', intersectingEdge.id);

                    let interNode1 = n1Room.getNode(intersectingEdge.node1Id);
                    let interNode2 = n1Room.getNode(intersectingEdge.node2Id);

                    let ourNode1 = n1Room.getNode(remainingEdge.node1Id);
                    let ourNode2 = n1Room.getNode(remainingEdge.node2Id);

                    let skipSpot = false;
                    //look for edges that contain our starting node
                    if (startNode.id == interNode1.id || startNode.id == interNode2.id) {
                        let nextPos = path[Number.parseInt(p)+1];
                        nextPos = n1Room.getEdgeMapPosObj(nextPos);
                        //logger.log(path.length, p, Number.parseInt(p)+1);
                        if(nextPos) {
                            //logger.log("nextpos", nextPos);
                            let nextIntersectionNode = new Node(nextPos, Node.INTERSECTION);
                            nextIntersectionNode = n1Room.getNode(nextIntersectionNode.id);
                            let nextIntersectingEdge = n1Room.getEdgeAtPos(nextPos);
                            let endNode = remainingEdge.getOtherNode(startNode);
                            let nextNodeIsDest = nextIntersectionNode && nextIntersectionNode.id == endNode.id;
                            if (!nextIntersectionNode && (!nextIntersectingEdge || (nextIntersectingEdge.id != intersectingEdge.id))) {
                            //if (!nextIntersectingEdge) {
                                //logger.log("diverging point", pos);
                                //we have a diverging point!
                                //visual.circle(pos, "#999", 1, 0.5);
                                skipSpot = false;
                            } else {
                                //logger.log('no diverging point!', nextIntersectingEdge.id);
                                //no diverging point, skip till we find one
                                skipSpot = true;
                            }
                        } else {
                            //visual.circle(pos, "#00f", 1, 0.5);
                            //logger.log("no next position, skip this spot cuz I dunno.. why not")
                            skipSpot = true;
                        }
                    } else {
                        //visual.circle(pos, "#0f0", 1, 0.5);
                        //visual.drawText(intersectingEdge.id, pos);
                    }

                    if (skipSpot) {
                        //visual.circle(pos, "#ff0", 1, 0.5);
                        ///logger.log("skipping intersection")
                        continue;
                    }

                    //pstar.inst.logNetwork();
                    //visual.circle(pos, "#f00", 1, 0.5);
                    //intersecting edge
                    //intersectingEdge.displayEdge("#f00", 0.5);

                    //actuall do the swap
                    //logger.log("adding Intersection node", intersectionNode.id, n1Room.nodes.hasId(intersectionNode.id))





                    //make new edges
                    let interEdge1 = new Edge(interNode1, intersectionNode);
                    let interEdge2 = new Edge(interNode2, intersectionNode);
                    let ourEdge1 = new Edge(ourNode1, intersectionNode);
                    let ourEdge2 = new Edge(ourNode2, intersectionNode);

                    //extract/insert path info
                    let [interPath1, interPath2] = intersectingEdge.path.splitAtPos(intersectionNode.pos);
                    let [ourPath1, ourPath2] = remainingEdge.path.splitAtPos(intersectionNode.pos);
                    //logger.log("splitting", intersectingEdge.id, "at", pos, JSON.stringify(interPath1), JSON.stringify(interPath2));

                    if (!ourPath1 || ! interPath1) {
                        continue;
                    }

                    interEdge1.overridePath(interPath1);
                    interEdge2.overridePath(interPath2);


                    ourEdge1.overridePath(ourPath1);
                    ourEdge2.overridePath(ourPath2);

                    interEdge1.lastUpdated = interEdge2.lastUpdated = intersectingEdge.lastUpdated;
                    ourEdge1.lastUpdated = ourEdge2.lastUpdated = remainingEdge.lastUpdated;


                    //remove old edges
                    pstar.inst.removeEdge(intersectingEdge);
                    if (pstar.inst.edges.hasId(remainingEdge.id)) {
                        pstar.inst.removeEdge(remainingEdge);
                    }

                    //remove old edges from room's edge map
                    n1Room.removeEdgeFromPosMap(intersectingEdge);
                    n1Room.removeEdgeFromPosMap(remainingEdge);

                    n1Room.addNode(intersectionNode, false);

                    pstar.inst.edges.add(interEdge1);
                    pstar.inst.edges.add(interEdge2);
                    pstar.inst.edges.add(ourEdge1);
                    pstar.inst.edges.add(ourEdge2);


                    n1Room.addEdgeToPosMap(interEdge2);
                    n1Room.addEdgeToPosMap(interEdge1);

                    //n1Room.addEdgeToPosMap(ourEdge2);

                    if(startNode.id == ourNode1.id) {
                        remainingEdge = ourEdge2;
                        n1Room.addEdgeToPosMap(ourEdge1);
                    } else {
                        remainingEdge = ourEdge1;
                        n1Room.addEdgeToPosMap(ourEdge2);
                    }

                    startNode = intersectionNode;
                    //pstar.inst.logNetwork();
                    //logger.log("intersected edge!", startNode.id, remainingEdge.id);

                } else {
                    //no intersection
                    if(intersectingEdge.id == remainingEdge.id) {
                        //visual.circle(pos, "#f0f", 1, 0.5);
                    } else {
                        //visual.circle(pos, "#0f0", 1, 0.5);
                    }

                }
            }
        }
    }

    refineEdge(skipNetworkRefinement=false) {
        if (!this.path.path || this.lastUpdated == 0 || (Game.time - this.lastUpdated) >= pstar.inst.edgeTicksValid) {
            logger.log("refining edge", this.id);

            // if (!Game.rooms[this.node1Pos.roomName] || !Game.rooms[this.node2Pos.roomName]) {
            //     //I can't see! bum ba dum dum dum dum WOOWOOOOO is meee!!
            //     return false;
            //     //I can't see!
            // }

            //invalidate connected nodes
            let pStar = pstar.inst;
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
            //logger.log('wtf is this path', path, JSON.stringify(path))
            //visual.drawPath(path, "#00f");
            this.lastUpdated = Game.time;

            if (skipNetworkRefinement) {
                return true;
            }

            this.checkIntersections();
            //we got the path, add the positions to our cost matrix

            // let cm = cm.getCM(this.node1Pos.roomName, "pStar");

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

            //             if (pstar.inst.edges.hasId(this.id)) {
            //                 pstar.inst.removeEdge(this);
            //                 cm.clearPathFromCM(cm, this.path.path);
            //             }

            //             n1Room.removeEdgeFromPosMap(this);

            //             pstar.inst.addEdge(intersectionNode, ourNode1);
            //             pstar.inst.addEdge(intersectionNode, ourNode2);
            //             visual.circle(pos, "#00f", 1, 0.5);

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
            //                             visual.circle(pos, "#fff", 1, 0.5);
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
            //                     visual.circle(pos, "#ff0", 1, 0.5);
            //                     logger.log("skipping intersection")
            //                     continue;
            //                 }

            //                 visual.circle(pos, "#f00", 1, 0.5);


            //                 logger.log("adding Intersection node", intersectionNode.id, n1Room.nodes.hasId(intersectionNode.id))
            //                 n1Room.addNode(intersectionNode, false);

            //                 //remove old edges
            //                 pstar.inst.removeEdge(intersectingEdge);
            //                 cm.clearPathFromCM(cm, intersectingEdge.path.path);

            //                 if (pstar.inst.edges.hasId(this.id)) {
            //                     pstar.inst.removeEdge(this);
            //                     cm.clearPathFromCM(cm, this.path.path);
            //                 }
            //                 //remove old edges from room's edge map
            //                 n1Room.removeEdgeFromPosMap(intersectingEdge);
            //                 n1Room.removeEdgeFromPosMap(this);

            //                 pstar.inst.addEdge(intersectionNode, ourNode1);
            //                 pstar.inst.addEdge(intersectionNode, ourNode2);
            //                 pstar.inst.addEdge(intersectionNode, interNode1);
            //                 pstar.inst.addEdge(intersectionNode, interNode2);
            //                 let replacementEdgeId = Edge.makeEdgeId(intersectionNode.id, ourNode1.id);
            //                 let replacementEdge = pstar.inst.edges.getById(replacementEdgeId);
            //                 logger.log(replacementEdgeId, replacementEdge);
            //                 replacementEdge.refineEdge(true);
            //                 replacementEdge.displayEdge("#0f0");



            //                 return true;

            //                 //logger.log(this.id, "found intersection", intersectingEdge.id)
            //             } else {
            //                 visual.circle(pos, "#0f0", 1, 0.5);
            //             }
            //         }
            //     } else {
            //         visual.circle(pos, "#000", 1, 0.5);
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
            //let color = "#" + visual.rgbColor(150,150,150);
            //logger.log(JSON.stringify(this.path));

            //visual.drawText(this.cost, this.path.path[Math.floor(this.path.path.length/2)]);

            visual.drawPath(this.path.path, color, style)
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
        let node1Room = pstar.inst.rooms.thingsById[n1r];
        let node1 = node1Room.nodes.thingsById[n1Id];
        let node2Room = pstar.inst.rooms.thingsById[n2r];
        let node2 = node2Room.nodes.thingsById[n2Id];
        //log("1")
        //logger.log(n1Id, node1);
        //logger.log(n2Id, node2);
        let inst = new Edge(node1, node2);
        inst.lastUpdated = lastUpdated;
        //log("2")
        if (cachedPath) {
            //logger.log("----",cachedPath)
            inst.path = map.classes.CachedPath.deserialize(cachedPath);
            //inst.path.getPath();
            //logger.log(JSON.stringify(inst.path))
        }
        //log("3")
        return inst;
    }
}
module.exports = Edge;
