import { NodePath, NodeInfo, NodeNetworkPath, MovableObject, makeEdgeId, makeNodeId, nodeIdToPos } from "./NodeNetworkTypes";
import IndexingCollection from "shared/utils/queues/indexingCollection";
import { PriorityQueue } from "shared/utils/queues/priorityQueue";
import DestinationInfo from "./DestinationInfo";
import Edge from "./edge";
import Node from "./node";
import networkRoom from "./networkRoom";
import Logger from "shared/utils/logger"
import visual from "shared/utils/visual";
import WorldPosition, { toWorldPosition } from "shared/utils/map/WorldPosition";
let closestNodeLookup: Map<WorldPosition, Node> = new Map();
import nodeTypes from "./nodeTypes";
import { movementManager } from "./MovementManager";

let logger = new Logger("NodeNetwork");
// logger.enabled = false;

declare global {
    interface CreepMemory {
        NodeNetworkPath?: NodeNetworkPath;
    }
    interface PowerCreepMemory {
        NodeNetworkPath?: NodeNetworkPath;
    }
}

export function findPath(startNode: Node, endNode: Node, maxOps = 100, refinePath = true, recursing = true): NodePath {
    logger.log("finding path", startNode.id, endNode.id);
    let start = Game.cpu.getUsed();
    let log = (...args: any[]) => {
        let usedNow = Game.cpu.getUsed();
        let used = usedNow - start;
        logger.log("cpu used:", used, args);
        start = usedNow;
    }

    let openNodes = new PriorityQueue<NodeInfo>((a: NodeInfo, b: NodeInfo) => {
        return a.f < b.f;//compare
    });
    let heuristic = (node: Node, goal: any) => {
        return node.getDistanceTo(goal);
    }

    let nodeInfoLookup: Map<string, NodeInfo> = new Map();
    let startNodeInfo: NodeInfo = {
        node: startNode,
        parent: false,
        h: heuristic(startNode, endNode),//heuristic to goal node
        g: 0,//shortest distance to source node
        f: 0,//g+h, fscore for this node, best possible distance to goal
        closed: false,
    };
    nodeInfoLookup.set(startNode.id, startNodeInfo);
    openNodes.push(startNodeInfo);

    let ops = 0;
    while (openNodes.size() > 0) {
        if (ops > maxOps) {
            break;
        }
        let nodeInfo = openNodes.pop();
        let node: Node = nodeInfo.node;
        logger.log("processing node", JSON.stringify(nodeInfo));



        //process node
        //if edge to parent is not refined, then refine it, recalculate our g score and re-add the node and skip to next node
        if (nodeInfo.parent && refinePath) {
            let parentNode: Node = nodeInfo.parent;
            let parentEdgeId = makeEdgeId(node.id, parentNode.id);
            let parentEdge = nodeNetwork.getEdgeById(parentEdgeId);



            //let parentEdge = node.getNodeEdge(parentNode);
            if (parentEdge === undefined) {
                //network is broken!
                logger.log('network broken, missing parent edge', node.id, parentNode.id, parentEdgeId, Object.keys(nodeNetwork.edges.thingsById));
                // Instead of re-adding the parent, we'll try to find a new path from this node
                let newPath = findPath(node, endNode, maxOps - ops, refinePath, false);
                if (!newPath.incomplete) {
                    // If we found a new path, prepend the current node and return
                    newPath.path.unshift(node);
                    newPath.hops++;
                    newPath.cost += nodeInfo.g;
                    return newPath;
                }
                // If we couldn't find a new path, continue with the next node in openNodes
                logger.log("couldn't find a new path, continuing");
                continue;
            }

            let refined = parentEdge.refineEdge();
            // logger.log(node.id, "has parent, edge refined?", refined);
            if (refined) {
                let parentNodeInfo = nodeInfoLookup.get(parentNode.id);
                //logger.log(nodeInfoLookup[parentNode.id])
                //logger.log("wtf")
                //logger.log("edge refined, re-opening parent node incase path is gone", node.id, parentNode.id, JSON.stringify(parentNodeInfo));
                if (!parentNodeInfo) {
                    logger.log("Lost parent info, skipping node", node.id, parentNode.id)
                } else {
                    parentNodeInfo.closed = false;
                    openNodes.push(parentNodeInfo);
                    nodeInfoLookup.delete(node.id);
                }
                logger.log("re-opening parent node", node.id, parentNode.id, JSON.stringify(parentNodeInfo));
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
            logger.log(node.id, "has no parent set.. is it the initial node, cuz otherwise you're a dumbass")
        }


        logger.log(node.id, "closed", JSON.stringify(nodeInfo))
        //logger.log(node.destinationsMap[endNode.id] ? node.destinationsMap[endNode.id].travelCost : "node has no stored path" + nodeInfo.g)
        //by this point the edge to our parent is refined, and we are not the target node.  Do normal A* action and mark this node closed
        //logger.log(node.id, "closed", nodeInfo.g)
        if (!(nodeInfo.g == 0 || nodeInfo.g > 0)) {
            throw new Error("g is null!?!? " + nodeInfo);
        }

        nodeInfo.closed = true;

        //wait until after parent edge has been updated to say we've reached the goal.
        if (node.pos.isEqualTo(endNode.pos)) {
            logger.log("reached goal", node.id, endNode.id);
            return reconstructPath(nodeInfo, nodeInfoLookup, ops);
        }

        let neighborEdges = node.destinationsMap.has(endNode.id)
            ? [makeEdgeId(node.id, node.destinationsMap.get(endNode.id)!.nextNode.id)]
            : node.allEdges;

        for (let edgeToNodeId of neighborEdges) {
            let edgeToNode = nodeNetwork.edges.getById(edgeToNodeId);
            if (edgeToNode === undefined) {
                logger.error("edgeToNode is missing", edgeToNodeId);
                continue;
            }
            let neighbor = edgeToNode.getOtherNode(node);
            let newGScore = nodeInfo.g + edgeToNode.cost;

            let neighborInfo = nodeInfoLookup.get(neighbor.id);
            if (!neighborInfo) {
                neighborInfo = {
                    node: neighbor,
                    parent: node,
                    h: heuristic(neighbor, endNode),
                    g: newGScore,
                    f: 0,
                    closed: false,
                };
                neighborInfo.f = neighborInfo.h + neighborInfo.g;
                nodeInfoLookup.set(neighbor.id, neighborInfo);
                openNodes.push(neighborInfo);
            } else if (newGScore < neighborInfo.g) {
                neighborInfo.parent = node;
                neighborInfo.g = newGScore;
                neighborInfo.f = neighborInfo.h + neighborInfo.g;
                if (neighborInfo.closed) {
                    neighborInfo.closed = false;
                    openNodes.push(neighborInfo);
                } else {
                    openNodes.replaceByValue(neighborInfo, (a, b) => a.node.id == b.node.id);
                }
            }
        }
        ops++;
    }

    logger.log("Path not found", startNode.pos, endNode.pos);
    return {
        path: [],
        incomplete: true,
        cost: 0,
        hops: 0,
        ops: ops,
    };
}

function reconstructPath(nodeInfo: NodeInfo, nodeInfoLookup: Map<string, NodeInfo>, ops: number): NodePath {
    let path = [];
    let cost = nodeInfo.g;
    //@ts-ignore
    // logger.log("reconstructing path", nodeInfo.node.id, nodeInfo.parent?.id);
    while (nodeInfo) {
        // logger.log("adding node to path", nodeInfo.node.id);
        path.push(nodeInfo.node);
        if (nodeInfo.parent) {
            let parentInfo = nodeInfoLookup.get(nodeInfo.parent.id);
            if (!parentInfo) {
                logger.log("Parent node info is missing", nodeInfo.node.id, nodeInfo.parent.id);
                break;
            }
            nodeInfo = parentInfo;
        } else {
            break;
        }
    }
    // logger.log("path reconstructed", path.length, cost, ops);
    return {
        path: path.reverse(),
        incomplete: false,
        cost: cost,
        hops: path.length,
        ops: ops
    };
}

export function findDistance(startPos: WorldPosition, endPos: WorldPosition, maxOps = 1000, refinePath = false): number {
    let start = Game.cpu.getUsed();
    let log = (...args: any[]) => {
        let usedNow = Game.cpu.getUsed();
        let used = usedNow - start;
        logger.log("cpu used:", used, args);
        start = usedNow;
    }
    let startNode: Node | false;
    let endNode: Node | false;

    if (closestNodeLookup.has(startPos)) {
        startNode = closestNodeLookup.get(startPos)!;
    } else {
        startNode = nodeNetwork.findClosestNode(startPos);
        if (startNode) {
            closestNodeLookup.set(startPos, startNode);
        }
    }
    if (closestNodeLookup.has(endPos)) {
        endNode = closestNodeLookup.get(endPos)!;
    } else {
        endNode = nodeNetwork.findClosestNode(endPos);
        if (endNode) {
            closestNodeLookup.set(endPos, endNode);
        }
    }

    //logger.log(closestNodeLookup[startPos]);
    //logger.log(closestNodeLookup[endPos]);
    //log('got start nodes')
    //logger.log("wtf", startNode, endNode)
    if (!startNode || !endNode) {
        return startPos.getRangeTo(endPos);
    }

    let pathCost;
    if ((startNode.destinationsMap.get(endNode.id)) || (endNode.destinationsMap.get(startNode.id))) {
        if (startNode.destinationsMap.get(endNode.id)) {
            pathCost = startNode.destinationsMap.get(endNode.id)!.travelCost;
        } else {
            pathCost = endNode.destinationsMap.get(startNode.id)!.travelCost;
        }
    } else {
        let path = findPath(startNode, endNode, maxOps, refinePath);
        if (path.incomplete) {
            return startPos.getRangeTo(endPos);;
        }
        pathCost = path.cost;
    }





    let startDist = startNode.pos.getRangeTo(startPos);
    let endDist = endNode.pos.getRangeTo(endPos);
    if (!pathCost) pathCost = 0;
    let range = startDist + pathCost + endDist;
    //log("got full range:" + range)
    return range;
}

export class NodeNetwork {
    edges: IndexingCollection<Edge>;
    distances: IndexingCollection<DestinationInfo>;
    rooms: IndexingCollection<networkRoom>;
    roomAdditionQueue: string[];
    roomTicksValid: number;
    maxRoomUpdatesPerTick: number;
    maxRoomAdditionsPerTick: number;
    nodeTicksValid: number;
    maxNodeUpdatesPerTick: number;
    edgeTicksValid: number;
    maxEdgeUpdatesPerTick: number;
    maxDistanceToBaseNodeForRooms: number;
    edgeQueueRefreshed: number;
    edgeRefineQueue: Edge[] = [];
    posEdgeMap: Map<string, string>;

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
        this.edgeQueueRefreshed = 0;
        this.posEdgeMap = new Map();
    }

    getEdgeAtPos(pos: WorldPosition): Edge | undefined {
        const key = pos.serialize();
        if (this.posEdgeMap.has(key)) {
            let edgeId = this.posEdgeMap.get(key)!;
            let edge = this.edges.getById(edgeId);
            if (!edge) {
                this.posEdgeMap.delete(key);
                return undefined;
            }
            return edge;
        }
        return undefined;
    }

    setEdgeAtPos(pos: WorldPosition, edgeId: string): void {
        const key = pos.serialize();
        this.posEdgeMap.set(key, edgeId);
    }
    deleteEdgeAtPos(pos: WorldPosition, edgeId?: string): void {
        const key = pos.serialize();
        if (edgeId) {
            let currentEdgeId = this.posEdgeMap.get(key);
            if (currentEdgeId === edgeId) {
                this.posEdgeMap.delete(key);
            } else {
                logger.log("edge id mismatch", currentEdgeId, edgeId);
            }
        } else {
            this.posEdgeMap.delete(key);
        }
    }

    removeEdgeFromPosMap(edge: Edge): void {
        let path = edge.path.path;
        if (!path) {
            return;
        }
        for(let pos of path) {
            this.deleteEdgeAtPos(pos, edge.id);
        }
    }


    addEdgeToPosMap(edge: Edge): void {
        let path = edge.path.path;
        if (!path) {
            return;
        }
        for (let pos of path) {
            if (pos.isEqualTo(edge.node1Pos)) {
                continue;
            }
            if (pos.isEqualTo(edge.node2Pos)) {
                continue;
            }
            // logger.log("setting edge at pos", pos.serialize(), edge.id);
            this.setEdgeAtPos(pos, edge.id);
        }
    }
    displayPosMap(): void {
        this.posEdgeMap.forEach((edgeId, posId) => {
            let wpos = WorldPosition.deserialize(posId);
            visual.drawText("#", wpos.toRoomPosition());
        });
    }

    addRoomToAdditionQueue(roomName: string) {
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

    getNodesByType(type: any) {
        let nodes = [];
        for (let r in this.rooms.thingsById) {
            /** @type {networkRoom} */
            let room = this.rooms.thingsById[r];
            let roomNodeIds = room.nodes.getGroupWithValue("type", type);
            if (!roomNodeIds) {
                continue;
            }
            for (let i in roomNodeIds) {
                let id = roomNodeIds[i];
                let node = room.nodes.thingsById[id];
                nodes.push(node);
            }
        }
        return nodes;
    }

    addRoomsToNetwork(maxRoomsToAdd = 0) {
        let roomsAdded = 0;

        let baseNodes = this.getNodesByType(nodeTypes.BASE)
        if (!baseNodes) {
            return;
        }
        let minDistToBaseNode = (pos: WorldPosition) => {
            let minDist = 9999999999;
            for (let b in baseNodes) {
                let baseNode = baseNodes[b];
                let roomDist = findDistance(pos, baseNode.pos);
                if (!!roomDist) {
                    minDist = Math.min(minDist, roomDist);
                }
            }
            return minDist;
        };
        let excludedRooms = [];
        while (this.roomAdditionQueue.length > 0 && roomsAdded < this.maxRoomAdditionsPerTick) {
            let roomName = this.roomAdditionQueue.shift();
            if (!roomName) continue;
            let center = new RoomPosition(25, 25, roomName).toWorldPosition();
            let DistToBase = minDistToBaseNode(center);
            if (DistToBase > this.maxDistanceToBaseNodeForRooms) {
                if (DistToBase == 9999999999) {
                    excludedRooms.push(roomName);
                }
                continue;
            }
            if (this.addRoomNow(roomName)) {
                roomsAdded++;
            }
            if (maxRoomsToAdd != 0 && roomsAdded >= maxRoomsToAdd) {
                break;
            }
        }
        if (excludedRooms.length > 0) {
            this.roomAdditionQueue = this.roomAdditionQueue.concat(excludedRooms);
            logger.log("queue left", this.roomAdditionQueue)
        }
        logger.log(roomsAdded, "rooms added!")
    }

    addRoomNow(roomName: string): boolean {
        if (!this.rooms.hasId(roomName)) {
            let room = new networkRoom(this, roomName);
            this.rooms.add(room);
            this.edgeQueueRefreshed = 0;
            return true;
        }
        return false;
    }

    refineRooms() {
        let rooms = _.sortBy(this.rooms.getAll(), (r) => r.lastUpdated);
        let roomsRefined = 0;
        for (let r in rooms) {
            /** @type {networkRoom} */
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
     * @returns {networkRoom}
     */
    getRoom(roomName: any) {
        let room = this.rooms.getById(roomName);
        return room;
    }
    hasRoom(roomName: string) {
        return this.rooms.hasId(roomName);
    }

    displayRooms() {
        let rooms = this.rooms.getAll();
        for (let r in rooms) {
            /** @type {networkRoom} */
            let room = rooms[r];
            room.displayRoom();
        }
        logger.log("displayed rooms.  Total rooms", rooms.length)
    }

    addEdge(node1: Node, node2: Node): Edge {
        let edgeId = makeEdgeId(node1.id, node2.id);
        // logger.log("adding edge", edgeId);
        let edge;
        if (!this.edges.hasId(edgeId)) {
            edge = new Edge(this, node1, node2);
            this.edges.add(edge);
        } else {
            edge = this.edges.getById(edgeId)!;
            //throw new Error("adding edge that already exists! edge id:" +  edgeId)
        }
        node1.resetDestMap();
        node2.resetDestMap();
        return edge;
    }
    getEdgeById(edgeId: string): Edge | undefined {
        return this.edges.getById(edgeId);
    }
    removeEdge(edge: Edge) {
        // logger.log("removing edge", edge.id);
        this.edges.remove(edge);
    }


    connectNodes(fromNodes: Node[], toNodes: Node[]) {
        for(const fromNode of fromNodes) {
            for(const toNode of toNodes) {
                if (fromNode.id === toNode.id) {
                    continue;
                }
                if (fromNode.knowsPathTo(toNode) || toNode.knowsPathTo(fromNode)) {
                    logger.log("nodes already connected", fromNode.id, toNode.id);
                    continue;
                }
                this.addEdge(fromNode, toNode);
            }
        }
    }

    refineEdges_old() {
        let edges = _.filter(this.edges.getAll(), (e) => e.edgeNeedsRefinement());
        edges = _.sortBy(edges, (e) => e.cost);
        let edgesRefined = 0;
        for (let e in edges) {
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
        while (edge = edges.shift()) {
            /** @type {Edge} */
            // if (!edge.edgeNeedsRefinement()) {
            //     continue;
            // }
            //edge.
            let { node1, node2 } = edge.getNodes();
            let path = findPath(node1, node2);
            let refined = path.ops !== undefined && path.ops > 0;
            if (refined) {
                edgesRefined++;
            }
            // logger.log("refined edge", edge.id, refined, path.ops, edgesRefined, this.maxEdgeUpdatesPerTick);
            if (edgesRefined >= this.maxEdgeUpdatesPerTick) {
                break;
            }
        }
        //logger.log("after loop", Game.cpu.getUsed() - start);
        //logger.log(edgesRefined, "edges refined, ", edges.length, "remaining");
        return edgesRefined;
    }

    hasNode(pos: WorldPosition) {
        /** @type {networkRoom} */
        let room = this.rooms.thingsById[pos.roomName];//get room without triggering the room as "used"
        if (!room) {
            //our room doesn't exist.. this prolly shouldn't happen..
            logger.log(pos.serialize(), pos.roomName, this.rooms.hasId(pos.getRoomName()))
            // throw new Error("node's room doesn't exist");
            return false;
        }
        return room.hasNodePos(pos);
    }

    addNode(pos: WorldPosition, type: string, autoAddEdges = true) {
        let node = new Node(this, pos, type)
        /** @type {networkRoom} */
        let room = this.getRoom(node.pos.roomName); //triggers "used" for the room
        if (!room) {
            if (node.type == nodeTypes.BASE) {
                //if the room doesn't exist, and we're adding a base node, create the room and add it right quick
                room = new networkRoom(this, node.pos.roomName);
                this.rooms.add(room);
                room.refineRoom();
            } else {
                //our room doesn't exist.. this prolly shouldn't happen..
                logger.log(node.id, node.pos.roomName, this.rooms.hasId(node.pos.getRoomName()))
                // throw new Error("node's room doesn't exist");
                if (!this.addRoomNow(node.pos.roomName)) {
                    throw new Error("node's room doesn't exist and we couldn't add it!");
                }
                room = this.getRoom(node.pos.roomName);
                if (!room) {
                    throw new Error("node's room doesn't exist and we couldn't add it!");
                }
            }


        }
        room.addNode(node, autoAddEdges);
        closestNodeLookup = new Map();
        return node;
    }

    /**
     * Kinda expensive once you've got thousands of rooms.. I'd think..
     * @param {String} nodeId
     */
    getNode(pos: WorldPosition): Node | undefined {
        // let node: Node | false = false;
        // let rooms = this.rooms.getAll();
        // for (let r in rooms) {
        //     let room = rooms[r];
        //     node = room.getNode(nodeId) || false;
        //     if (node) {
        //         break;
        //     }
        // }
        // return node;

        /** @type {networkRoom} */
        let room = this.rooms.thingsById[pos.roomName];//get room without triggering the room as "used"
        if (!room) {
            //our room doesn't exist.. this prolly shouldn't happen..
            logger.log(pos.serialize(), pos.roomName, this.rooms.hasId(pos.getRoomName()))
            // throw new Error("node's room doesn't exist");
            return undefined;
        }
        let node = room.getNode(pos);
        if (!node) {
            return undefined;
        }
        return node;
    }
    getNodeById(nodeId: string): Node | undefined {
        let pos = nodeIdToPos(nodeId);
        let room = this.rooms.thingsById[pos.roomName];
        if (!room) {
            return undefined;
        }
        let node = room.getNodeId(nodeId);
        if (!node) {
            return undefined;
        }
        return node;
    }
    removeNode(node: Node) {
        if (!(node instanceof Node)) {
            throw new Error("Adding invalid Node");
        }
        let room = this.getRoom(node.pos.roomName);
        room?.removeNode(node);
    }




    displayNodes() {

        let allEdges = this.edges.getAll();
        for (let e in allEdges) {
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

    findNodePath(startPos: WorldPosition, destinationPos: WorldPosition) {
        let startNode = this.findClosestNode(startPos);
        let endNode = this.findClosestNode(destinationPos);
        logger.log("finding node path", startNode, endNode);
        if (!startNode || !endNode) {
            logger.log("no start or end node", startNode, endNode);
            return false;
        }
        if (startNode.id === endNode.id) {
            return {
                path: [startNode],
                incomplete: false,
            };
        }
        let nodePath = startNode.findCachedNodePathTo(endNode);
        if (!nodePath || 'incomplete' in nodePath && nodePath.incomplete) {
            nodePath = findPath(startNode, endNode);
        }
        return nodePath;
    }

    serializeFindPath(path: { [x: string]: any; }) {
        //path is an array of nodes
        let ids = [];
        for (let n in path) {
            let node = path[n];
            ids.push(node.id);
        }
        return ids.join("|");
    }
    deserializeFindPath(str: string): Node[] | false {
        let ids = str.split("|");
        let path = [];
        for (let i in ids) {
            let id = ids[i];
            let node = this.getNodeById(id);
            if (!node) {
                return false;
            }
            path.push(node);
        }
        return path;
    }

    displayFindPath(path: { [x: string]: any; }, color = "#ddd", opacity: any) {
        let lastNode: Node | false = false;
        for (let n in path) {
            /** @type {Node} */
            let node = path[n];
            // visual.circle(node.pos, color, opacity, 0.5)
            //node.displayNode();
            if (lastNode) {
                let edgeId = makeEdgeId(node.id, lastNode.id);
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
    getNextEdge(path: Node[]) {
        if (path.length < 2) {
            throw new Error("Calling next edge on finished path");
        }
        let currentNode = path[0];
        let nextNode = path[1];
        let edgeId = makeEdgeId(currentNode.id, nextNode.id);
        let edge = this.edges.getById(edgeId);
        path.shift();
        return {
            edge: edge,
            path: path
        };
    }


    moveTo(creep: MovableObject, goal: { pos: WorldPosition; range: number }): ScreepsReturnCode {
        logger.log(`${creep.name} moveTo ${goal.pos.serialize()}`);
        if (creep.getWeight() < 0) {
            return creep.moveTo(goal.pos, {range: goal.range, visualizePathStyle: {stroke: '#ff0000'}});
        }
        const creepPos = creep.pos.toWorldPosition();

        // Check if we've reached the goal
        if (creepPos.inRangeTo(goal.pos, goal.range)) {
            logger.log(`${creep.name} reached goal`);
            delete creep.memory.NodeNetworkPath;
            return OK;
        }

        let pathInfo: NodeNetworkPath = creep.memory.NodeNetworkPath || {
            path: '',
            pathStage: 0, // 0 = walking to first node, 1 = traveling through node network, 2 = walking to destination node
            edgeId: '',
            goal: goal.pos,
            method: '',
            done: false,
        };
        if (pathInfo.goal && !(pathInfo.goal instanceof WorldPosition)) {
            pathInfo.goal = toWorldPosition(pathInfo.goal);
        }

        logger.log(`${creep.name} pathInfo: ${JSON.stringify(pathInfo)}`);

        logger.log('Im having goal problems and I feel bad for me, son', pathInfo.goal, goal.pos, goal.pos.isEqualTo(pathInfo.goal));
        // Check for goal change
        if (!goal.pos.isEqualTo(pathInfo.goal)) {
            logger.log(`${creep.name} goal changed, resetting path`);
            pathInfo = {
                path: '',
                pathStage: 0,
                edgeId: '',
                goal: goal.pos,
                method: '',
                done: false,
            };
        }

        // Initial state or path reset
        if (pathInfo.method === '') {
            logger.log(`${creep.name} finding new path`);
            let nodePath = this.findNodePath(creepPos, goal.pos);
            if (nodePath && !nodePath.incomplete) {
                pathInfo.method = 'nodeNetwork';
                pathInfo.path = this.serializeFindPath(nodePath.path);
                pathInfo.pathStage = 0;
                logger.log(`${creep.name} found node path: ${pathInfo.path}`);
            } else {
                logger.log(`${creep.name} incomplete node path, falling back to normal moveTo`);
                pathInfo.method = 'moveTo';
            }
        }

        let path = pathInfo.path ? this.deserializeFindPath(pathInfo.path) || [] : [];

        switch (pathInfo.method) {
            case 'nodeNetwork':
                creep.say(pathInfo.pathStage.toString());
                logger.log(`${creep.name} using nodeNetwork method, stage: ${pathInfo.pathStage}`);
                switch (pathInfo.pathStage) {
                    case 0: // Move to first node
                        if (path.length === 0) {
                            logger.log(`${creep.name} no path found, falling back to normal moveTo`);
                            pathInfo.method = 'moveTo';
                            break;
                        }
                        let firstNode = path[0];
                        if (creepPos.inRangeTo(firstNode.pos, 1)) {
                            logger.log(`${creep.name} reached first node, moving to stage 1`);
                            pathInfo.pathStage = 1;
                        } else {
                            logger.log(`${creep.name} moving to first node: ${firstNode.pos.serialize()}`);
                            return creep.moveTo(firstNode.pos, { range: 1, visualizePathStyle: { stroke: '#00ff00' } });
                        }
                        break;

                    case 1: // Travel through node network
                        if (path.length < 2) {
                            logger.log(`${creep.name} reached last node, moving to stage 2`);
                            pathInfo.pathStage = 2;
                            break;
                        }
                        let currentNode = path[0];
                        let nextNode = path[1];
                        let edgeId = makeEdgeId(currentNode.id, nextNode.id);

                        if (edgeId !== pathInfo.edgeId) {
                            // We're moving to a new edge
                            let edge = this.getEdgeById(edgeId);
                            if (!edge) {
                                logger.log(`${creep.name} failed to get edge, resetting path`);
                                pathInfo.method = '';
                                break;
                            }
                            let edgePath = edge.path.path;
                            if (!edgePath) {
                                logger.log(`${creep.name} edge has no path, moving to next node`);
                                path.shift();
                                pathInfo.path = this.serializeFindPath(path);
                                break;
                            }

                            // Check if we need to reverse the path
                            let reversePath = !creepPos.isEqualTo(edge.node1Pos);
                            if (reversePath) {
                                logger.log(`${creep.name} reversing edge path`);
                                edgePath = [...edgePath].reverse();
                            }

                            // Set the path for the creep
                            creep.setPath(nextNode.pos, edgePath);
                            pathInfo.edgeId = edgeId;
                            logger.log(`${creep.name} set new path for edge ${edgeId}`);
                        }

                        // Move along the edge
                        let result = creep.moveTo(nextNode.pos, {
                            range: 1,
                            visualizePathStyle: { lineStyle: 'dashed' },
                            maxPathDistance: 3,
                            goalPos: nextNode.pos,
                            noPathFinding: true
                        });

                        logger.log(`${creep.name} moving along edge ${pathInfo.edgeId}, result: ${result}`);

                        if (result === OK) {
                            if (creepPos.isEqualTo(nextNode.pos)) {
                                logger.log(`${creep.name} reached next node, updating path`);
                                path.shift();
                                pathInfo.path = this.serializeFindPath(path);
                                pathInfo.edgeId = ''; // Reset edgeId to trigger new path setting on next tick
                            }
                        } else if (result === ERR_NOT_FOUND) {
                            logger.log(`${creep.name} reached end of edge or path error, moving to next node`);
                            path.shift();
                            pathInfo.path = this.serializeFindPath(path);
                            pathInfo.edgeId = ''; // Reset edgeId to trigger new path setting on next tick
                        }
                        break;

                    case 2: // Move from last node to goal
                        if (creepPos.inRangeTo(goal.pos, goal.range)) {
                            logger.log(`${creep.name} reached final goal`);
                            pathInfo.done = true;
                        } else {
                            logger.log(`${creep.name} moving to final goal: ${goal.pos.serialize()}`);
                            return creep.moveTo(goal.pos, { range: goal.range, visualizePathStyle: { stroke: '#00ff00' } });
                        }
                        break;
                }
                break;

            case 'moveTo':
                creep.say('moveTo');
                logger.log(`${creep.name} using normal moveTo to ${goal.pos.serialize()}`);
                return creep.moveTo(goal.pos, { range: goal.range, visualizePathStyle: { stroke: '#ff0000' } });

            default:
                creep.say('broken');
                logger.log(`${creep.name} invalid movement method`);
                pathInfo.method = '';
                break;
        }

        creep.memory.NodeNetworkPath = pathInfo;
        return OK;
    }


    /**
     * Find the node closest to a world position(by range), only searches in same and adjecent rooms.
     * @param {WorldPosition} pos
     * @returns {Node|boolean} The closest node, or false
     */
    findClosestNode(pos: WorldPosition) {
        let start = Game.cpu.getUsed();
        let log = (...args: any[]) => {
            let usedNow = Game.cpu.getUsed();
            let used = usedNow - start;
            logger.log("cpu used:", used, args);
            start = usedNow;
        }
        //logger.log("find closest node", pos)
        let closestNode = false;
        let roomsToCheck = [pos.roomName];


        //log("got rooms")

        let cheapestNode: Node | false = false;
        let cheapestCost = 1000000;
        let maxCost = 3;

        while (roomsToCheck.length > 0) {
            let roomName = roomsToCheck.shift();
            if (!roomName) {
                break;
            }

            let NodeNetworkRoom = this.rooms.thingsById[roomName];
            if (!NodeNetworkRoom) {
                //logger.log("trying to get a room that doesn't exist, skip it, there's no nodes there bro");
                continue;
            }
            let roomNodes = NodeNetworkRoom.nodes.getAll();
            //logger.log(JSON.stringify(roomNodes))
            if (roomNodes) {
                //check these nodes
                for (let n in roomNodes) {
                    let node = roomNodes[n];
                    //logger.log(node.id, node, node.pos, NodeNetworkRoom.roomName)
                    //global.utils.visual.circle(node.pos, "#f00", 1, 0.5)
                    let nodeCost = pos.getRangeTo(node.pos);
                    if (nodeCost < cheapestCost && nodeCost < maxCost) {
                        cheapestNode = node;
                        cheapestCost = nodeCost;
                    }
                }
            }
            //log("checked room: " + roomName + " " + (roomName == pos.roomName))
            // if (roomName == pos.roomName && cheapestNode === false) {
            //     //logger.log("not found yet, adding neighbors", cheapestNode);

            //     let exits = Game.map.describeExits(pos.roomName);
            //     for (let dir in exits) {
            //         if (exits.hasOwnProperty(dir)) {
            //             const exitRoomName = exits[dir as ExitKey];
            //             if (exitRoomName) {
            //                 roomsToCheck.push(exitRoomName);
            //             }
            //         }
            //     }
            // }
        }
        // if (cheapestNode) {
        //     visual.circle(cheapestNode.pos.toRoomPosition(), "#0f0", 1, 1)
        // }
        //log("got node")
        return cheapestNode;
    }


    logNetwork() {
        logger.log("----------------------Network dump--------------------------")

        let rooms = this.rooms.getAll();
        for (let r in rooms) {
            /** @type {networkRoom} */
            let room = rooms[r];
            let nodes = room.nodes.getAll();
            logger.log("room:", room.roomName, nodes.length);
            for (let n in nodes) {
                /** @type {Node} */
                let node = nodes[n];
                logger.log("--node:", node.id, node.type);
            }
            let output = "";
            this.posEdgeMap.forEach((edgeId: string, key: string) => {
                output += `${key}, `;
            })
            logger.log("edge map", output);
        }
        logger.log('------edges------')
        let edges = this.edges.getAll();
        for (let e in edges) {
            /** @type {Edge} */
            let edge = edges[e];
            logger.log("edge:", edge.id, edge.path.path && edge.path.path.map(pos=>pos.serialize()), edge.cost)
        }
    }



    serialize() {

        let obj = {
            rooms: this.rooms.serialize(),
            edges: this.edges.serialize(),
            dists: this.distances.serialize(),
            rmQue: this.roomAdditionQueue.join("|"),
            edgeTicksValid: this.edgeTicksValid,
            maxEdgeUpdatesPerTick: this.maxEdgeUpdatesPerTick,
            posEdgeMap: Array.from(this.posEdgeMap.entries()),
        }
        // let oldE = logger.enabled;
        // logger.enabled = true;
        logger.log("total Rooms:", Object.keys(this.rooms.thingsById).length, Object.keys(this.rooms.thingsById));
        logger.log("total nodes in rooms:", _.reduce(this.rooms.thingsById, (res, room, roomName) => {
            //logger.log("tttt",room, roomName)
            res += Object.keys(room.nodes.thingsById).length;
            return res;
        }, 0));
        logger.log("total edges:", Object.keys(this.edges.thingsById).length);
        logger.log("total destinations:", Object.keys(this.distances.thingsById).length);
        logger.log("size breakdown, rooms:", obj.rooms.length, " edges:", obj.edges.length, "destinations:", obj.dists.length);
        // logger.enabled = oldE;
        return JSON.stringify(obj);
    }
    static deserialize(str: string) {
        let obj = JSON.parse(str);
        let inst = new NodeNetwork();


        inst.roomAdditionQueue = obj.rmQue.split("|");

        let nLims = inst.rooms.limits;
        let eLims = inst.edges.limits;
        let dLims = inst.distances.limits;
        let roomDeserializer = {
            deserialize: (str: string) => {
                networkRoom.deserialize(str, nodeNetwork)
            }
        }
        inst.rooms = IndexingCollection.deserialize(obj.rooms, roomDeserializer) as IndexingCollection<networkRoom>;
        //logger.log("deserialized rooms", obj.rooms)
        inst.rooms.limits = nLims;
        let edgeDeserializer = {
            deserialize: (str: string) => {
                return Edge.deserialize(str, inst);
            }
        }
        inst.edges = IndexingCollection.deserialize(obj.edges, edgeDeserializer) as IndexingCollection<Edge>;
        inst.edges.limits = eLims;
        if (obj.dists) {
            let fakeDeserialize = (str: string) => {
                return DestinationInfo.deserialize(str, (roomName: string) => inst.rooms.thingsById[roomName]);
            }
            let deserializer = { deserialize: fakeDeserialize };
            inst.distances = IndexingCollection.deserialize(obj.dists, deserializer) as IndexingCollection<DestinationInfo>;
            inst.distances.limits = dLims;
        }

        inst.edgeTicksValid = obj.edgeTicksValid;
        inst.maxEdgeUpdatesPerTick = obj.maxEdgeUpdatesPerTick;
        inst.posEdgeMap = new Map(obj.posEdgeMap);

        return inst;
    }
}

let nodeNetwork = new NodeNetwork();
export default nodeNetwork;
