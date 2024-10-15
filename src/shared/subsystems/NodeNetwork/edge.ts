import type { NodeNetwork } from './nodeNetwork';
import Node from './node';
import CachedPath from './cachedPath';
import visual from 'shared/utils/visual';
import Logger from 'shared/utils/logger';
import CostMatrix from 'shared/utils/map/CostMatrix';
import WorldPosition, { toWorldPosition } from 'shared/utils/map/WorldPosition';
import nodeTypes from './nodeTypes';
import "./NodeNetworkTypes"
import { makeEdgeId, makeNodeId, sortNodesForEdgeId } from './NodeNetworkTypes';
import networkRoom from './networkRoom';
import type nodeNetwork from './nodeNetwork';

const logger = new Logger("Edge");
// logger.enabled = false;

class Edge {
    network: NodeNetwork;
    node1Id: string;
    node1Pos: WorldPosition;
    node2Id: string;
    node2Pos: WorldPosition;
    path: CachedPath;
    lastUpdated: number;



    get id(): string {
        return makeEdgeId(this.node1Id, this.node2Id);
    }

    get cost(): number {
        return this.path.cost;
    }

    constructor(network:NodeNetwork, node1: Node, node2: Node) {
        this.network = network;
        if (!node1 || !node2) {
            throw new Error("invalid nodes passed!" + node1 + " " + node2);
        }

        // if (node1.pos.roomName != node2.pos.roomName && (node1.type != nodeTypes.ROOM_EXIT || node2.type != nodeTypes.ROOM_EXIT)) {
        //     throw new Error("Invalid Inter-room Edge!" + node1.id + " " + node2.id);
        // }

        let [pos1, pos2] = sortNodesForEdgeId(node1.pos, node2.pos);
        if (pos2.isEqualTo(node1.pos)) {
            let swp = node1;
            node1 = node2;
            node2 = swp;
        }

        this.node1Id = node1.id;
        this.node1Pos = node1.pos;
        this.node2Id = node2.id;
        this.node2Pos = node2.pos;

        this.path = new CachedPath(this.node1Pos, this.node2Pos);
        this.lastUpdated = 0;
    }

    getNodes(): { node1: Node, node2: Node } {
        let n1Room = this.network.getRoom(this.node1Pos.roomName);
        let node1 = n1Room && n1Room.getNodeId(this.node1Id);
        let n2Room = this.network.getRoom(this.node2Pos.roomName);
        let node2 = n2Room && n2Room.getNodeId(this.node2Id);
        if (!node1 || !node2) {
            throw new Error(`Unable to get nodes for edge ${this.id}`);
        }
        return {
            node1,
            node2
        }
    }

    getOtherNode(node: Node): Node {
        let otherRoom;
        let otherNodeId;
        if (node.id == this.node1Id) {
            otherNodeId = this.node2Id;
            otherRoom = this.network.rooms.thingsById[this.node2Pos.roomName];
        } else {
            otherNodeId = this.node1Id;
            otherRoom = this.network.rooms.thingsById[this.node1Pos.roomName];
        }
        return otherRoom.nodes.thingsById[otherNodeId];
    }

    edgeNeedsRefinement(): boolean {
        return !this.path.path || this.lastUpdated == 0 || (Game.time - this.lastUpdated) >= this.network.edgeTicksValid;
    }

    overridePath(in_path: CachedPath): void {
        if (this.node1Pos.isEqualTo(in_path.origin)) {
            this.path.path = in_path.path;
        } else if (this.node1Pos.isEqualTo(in_path.goal) && in_path.path !== false) {
            this.path.path = in_path.path.reverse();
        } else {
            logger.log("wtf are you doing, path makes no sense mofo", this.node1Pos, this.node2Pos, in_path.origin, in_path.goal, in_path.path);
            throw new Error("wtf are you doing, path makes no sense mofo")
        }
        this.path.pathCost = in_path.pathCost;
    }

    checkIntersections(): void {
        // logger.log("Refining network for edge", this.id);

        const path = this.path.getPath();
        if (!path || path.length < 2) {
            logger.error("Path is missing or too short for edge", this.id);
            return;
        }

        // Skip intersection checks for start and end nodes
        const startNode = this.network.getNodeById(this.node1Id)!;
        const endNode = this.network.getNodeById(this.node2Id)!;
        if (!startNode || !endNode) {
            logger.error("Start or end node not found for edge", this.id);
            return;
        }

        let currentNode: Node = startNode;
        let currentRoom: networkRoom = this.network.getRoom(currentNode.pos.roomName)!;
        if (!currentRoom) {
            logger.error("Start room not found for edge", this.id);
            return;
        }

        let newEdges: Array<Edge|false> = [];
        let currentPathSegment: WorldPosition[] = [path[0]];
        let ridingEdgeId: string | null = null;
        this.updateCostMatrix(path[0]);
        for (let i = 1; i < path.length; i++) {
            const previousPos = path[i - 1];
            const pos = path[i];
            logger.log("checking pos", pos.serialize(), previousPos.serialize(), ridingEdgeId);
            currentPathSegment.push(pos);

            this.updateCostMatrix(pos);

            if (pos.roomName !== currentRoom.roomName && false) {
                // // Handle room transition
                // logger.log("Room transition at position", pos);
                // let exit1 = path[i - 2];
                // let exit2 = path[i + 1];

                // currentNode = this.handleRoomTransition(currentNode, exit1, exit2, newEdges);
                // currentRoom = this.network.getRoom(pos.roomName)!;
                // if (!currentRoom) {
                //     if (!this.network.addRoomNow(pos.roomName)) {
                //         throw new Error("Failed to add room at position: " + pos);
                //     }
                //     currentRoom = this.network.getRoom(pos.roomName)!;
                // }
                // currentPathSegment = [pos];
            } else {
                // Check for intersections within the room
                const intersectionResult = this.checkForIntersection(pos, previousPos, currentNode, currentPathSegment, ridingEdgeId);
                if (intersectionResult) {
                    if (typeof intersectionResult === 'object' && 'ridingEdgeId' in intersectionResult) {
                        ridingEdgeId = intersectionResult.ridingEdgeId;
                    } else {
                        // logger.log("Intersection found at position", pos, intersectionResult.newNode.id, intersectionResult.newEdge && intersectionResult.newEdge.id, ridingEdgeId);
                        currentNode = intersectionResult.newNode;
                        newEdges.push(intersectionResult.newEdge);
                        if (ridingEdgeId && intersectionResult.newNode.pos.isEqualTo(previousPos)) {
                            currentPathSegment = [previousPos, pos];
                        } else {
                            currentPathSegment = [pos];
                        }
                        ridingEdgeId = null;
                    }
                }
            }
        }

        // Connect the last node to the final destination if needed
        if (currentNode.id !== this.node2Id && currentNode.id !== this.node1Id) {
            logger.log("Connecting last node to final destination", currentNode.id, this.node2Id, this.node1Id, ridingEdgeId);
            const finalNode = this.network.getNodeById(this.node2Id);
            if (finalNode) {
                // currentPathSegment.shift();
                // currentPathSegment.shift();

                logger.log("Connecting last node to final destination", currentNode.id, finalNode.id, currentPathSegment.map(p=>p.serialize()), currentPathSegment.length);
                const finalEdge = this.network.addEdge(currentNode, finalNode);
                finalEdge.path = new CachedPath(currentNode.pos, finalNode.pos);
                finalEdge.path.path = [...currentPathSegment];
                finalEdge.lastUpdated = Game.time;
                newEdges.push(finalEdge);
            }
        }

        if (newEdges.length == 0) {
            // logger.log("No new edges created", this.id);
            this.network.addEdgeToPosMap(this);
        } else {

            // Remove the original edge
            this.network.removeEdge(this);
            this.network.removeEdgeFromPosMap(this);
            // Update all new edges
            for (const edge of newEdges) {
                if (!edge) {
                    continue;
                }
                edge.lastUpdated = Game.time;
                //@ts-ignore
                // logger.log("Adding new edge", edge.id, edge.path.path!.length);
                this.network.addEdgeToPosMap(edge);
            }
        }

    }

    private handleRoomTransition(currentNode: Node, exit1: WorldPosition, exit2: WorldPosition, newEdges: Edge[]): Node {
        const exitPos = exit1;
        const entrancePos = exit2;

        // Create or get exit node for the previous room
        const exitNode = this.createOrGetExitNode(exitPos);

        // Create edge from current node to exit node if needed
        if (currentNode.id !== exitNode.id) {
            const edgeToExit = this.network.addEdge(currentNode, exitNode);
            newEdges.push(edgeToExit);
        }

        // Create or get entrance node for the new room
        const entranceNode = this.createOrGetExitNode(entrancePos);

        // Create edge between exit and entrance nodes
        const edgeBetweenRooms = this.network.addEdge(exitNode, entranceNode);
        edgeBetweenRooms.path = new CachedPath(exitNode.pos, entranceNode.pos);
        edgeBetweenRooms.path.path = [exitPos, entrancePos];
        newEdges.push(edgeBetweenRooms);

        // Return the entrance node as the new current node
        return entranceNode;
    }

    private checkForIntersection(pos: WorldPosition, previousPos: WorldPosition, currentNode: Node, pathSegment: WorldPosition[], ridingEdgeId: string | null): ({ newNode: Node, newEdge: Edge|false }|{ridingEdgeId: string}) | null {
        // Skip intersection check if the position is the start or end node of the edge
        if (pos.isEqualTo(this.node1Pos) || pos.isEqualTo(this.node2Pos)) {
            if (ridingEdgeId) {
                logger.log("stepping off of edge to destination node", ridingEdgeId, pos.serialize(), previousPos.serialize());
                //we're stepping off of an edge and onto our destination node
                let ridingEdge = this.network.getEdgeById(ridingEdgeId);
                if (!ridingEdge) {
                    throw new Error("Riding edge not found");
                }
                let ourNodeIds = [this.node1Id, this.node2Id];
                let finalNode = this.network.getNode(pos);
                if (!finalNode) {
                    throw new Error("Final node not found, shit's broken");
                }
                if (!ourNodeIds.includes(ridingEdge.node1Id) && !ourNodeIds.includes(ridingEdge.node2Id)) {
                    //the riding edge is not one of ours, so we need to split it
                    logger.log("splitting riding edge", ridingEdge.id, ridingEdge.node1Id, ridingEdge.node2Id, previousPos.serialize());
                    let splitResult = ridingEdge.splitAt(previousPos);
                    if (!splitResult) {
                        throw new Error("Failed to split edge at node");
                    }
                    let edgeToSplit = this.network.addEdge(splitResult, finalNode);
                    edgeToSplit.path = new CachedPath(splitResult.pos, finalNode.pos);
                    edgeToSplit.path.path = [...pathSegment];
                    edgeToSplit.lastUpdated = Game.time;
                    return {newNode: splitResult, newEdge: edgeToSplit};
                }
                //otherwise, we're done riding the edge

                return {newNode: finalNode, newEdge: false};
            }
            // logger.log("skipping intersection at start or end node", pos, ridingEdgeId);
            return null;
        }

        const existingNode = this.network.getNode(pos);
        const intersectingEdge = this.network.getEdgeAtPos(pos);

        if (existingNode && existingNode.id !== currentNode.id) {
            // Intersection with an existing node
            // logger.log("Intersection with existing node", existingNode.id, currentNode.id, "riding edge", ridingEdgeId, intersectingEdge?.id);
            if (ridingEdgeId) {
                // logger.log("done Riding edge??", ridingEdgeId);
                let ridingEdge = this.network.getEdgeById(ridingEdgeId);
                if (!ridingEdge) {
                    throw new Error("Riding edge not found");
                }
                logger.log("rode existing edge", ridingEdge.id, pos.serialize(), previousPos.serialize(), existingNode.id);
                return {newNode: existingNode, newEdge: ridingEdge};
            }
            const newEdge = this.network.addEdge(currentNode, existingNode);
            newEdge.path = new CachedPath(currentNode.pos, existingNode.pos);
            newEdge.path.path = [...pathSegment];
            newEdge.lastUpdated = Game.time;
            logger.log("New edge-node", newEdge.id, newEdge.path.origin, newEdge.path.goal, newEdge.path.path);
            return { newNode: existingNode, newEdge };
        } else if (intersectingEdge && (intersectingEdge.id !== this.id)) {
            // Check if the intersecting edge shares the same start node
            const { node1, node2 } = intersectingEdge.getNodes();
            if (node1.id === currentNode.id || node2.id === currentNode.id) {
                logger.log("Skipping intersection with edge sharing the same start node", intersectingEdge.id, pos.serialize(), previousPos.serialize());
                return {ridingEdgeId: intersectingEdge.id};
            } else if (ridingEdgeId) {
                // logger.log("done Riding edge??", ridingEdgeId);
                const ridingEdge = this.network.getEdgeById(ridingEdgeId);
                if (!ridingEdge) {
                    throw new Error("Riding edge not found");
                }
                // const intersectionNode = this.getOrCreateNodeAtPosition(pos);
                // return {newNode: intersectionNode, newEdge: ridingEdge};
            }

            // Intersection with another edge
            logger.log("Intersection with another edge", intersectingEdge.id);
            let posToUse = pos;
            if (ridingEdgeId) {
                logger.log("riding edge, using previous pos", ridingEdgeId, pos, previousPos);
                posToUse = previousPos;
            }
            const intersectionNode = this.getOrCreateNodeAtPosition(posToUse);
            const newEdge = this.network.addEdge(currentNode, intersectionNode);
            newEdge.path = new CachedPath(currentNode.pos, intersectionNode.pos);
            newEdge.path.path = [...pathSegment];
            newEdge.lastUpdated = Game.time;

            logger.log("New edge-edge", newEdge.id, newEdge.path.origin, newEdge.path.goal, newEdge.path.path);

            // Split the intersecting edge
            this.splitEdgeAtNode(intersectionNode, intersectingEdge, currentNode);
            // logger.log("New edge", newEdge.id);
            return { newNode: intersectionNode, newEdge };
        } else if (ridingEdgeId) {
            // logger.log("done Riding edge", ridingEdgeId, pos.toRoomPosition(), previousPos.toRoomPosition());
            //we were "riding" an edge, but now we're done riding it and need to update everything
            // the edge we're riding already exists, so we don't need to create a new edge
            // but we do need to correct the path of the edge we're refining
            const ridingEdge = this.network.getEdgeById(ridingEdgeId);
            if (!ridingEdge) {
                throw new Error("Riding edge not found");
            }
            // const intersectionNode = this.getOrCreateNodeAtPosition(previousPos);
            logger.log("intersection node???", ridingEdge.id, pos.toRoomPosition(), previousPos.toRoomPosition());
            // return {newNode: intersectionNode, newEdge: ridingEdge};
            //maybe split edge we're riding:
            let newNode = ridingEdge.splitAt(previousPos);

            return {newNode: newNode, newEdge: false};
        }

        // logger.log("No intersection found", pos);
        return null;
    }


    createOrGetExitNode(position: WorldPosition): Node {
        if (this.network.hasNode(position)) {
            let node = this.network.getNode(position);
            if (!node) {
                throw new Error("Node not found at position, something is seriously wrong: " + position);
            }
            return node;
        } else {
            return this.network.addNode(position, nodeTypes.ROOM_EXIT, false);
        }
    }

    updateCostMatrix(worldPos: WorldPosition): void {
        const pos = worldPos.toRoomPosition();

        const terrain = new Room.Terrain(pos.roomName);
        const terrainMask = terrain.get(pos.x, pos.y);
        const cost = terrainMask === TERRAIN_MASK_SWAMP ? 19 : 3;

        const costMatrix = CostMatrix.getCM(pos.roomName, "NodeNetwork");
        costMatrix.set(pos.x, pos.y, cost);
    }

    splitEdgeAtNode(
        intersectionNode: Node,
        remainingEdge: Edge,
        startNode: Node
    ): { remainingEdge: Edge, startNode: Node } | null {
        // logger.log("Splitting edge at node", intersectionNode.id);

        const ourNode1 = this.network.getNodeById(remainingEdge.node1Id);
        const ourNode2 = this.network.getNodeById(remainingEdge.node2Id);
        if (!ourNode1 || !ourNode2) {
            throw new Error("Node not found in network");
        }

        if (intersectionNode.id === ourNode1.id || intersectionNode.id === ourNode2.id) {
            // logger.log("Skipping split at start or end node", intersectionNode.id);
            return null;
        }

        const edgeToIntersection = this.network.addEdge(ourNode1, intersectionNode);
        const edgeFromIntersection = this.network.addEdge(intersectionNode, ourNode2);
        edgeToIntersection.lastUpdated = edgeFromIntersection.lastUpdated = remainingEdge.lastUpdated;

        const [pathToIntersection, pathFromIntersection] = remainingEdge.path.splitAtPos(intersectionNode.pos);
        if (!pathToIntersection || !pathFromIntersection) {
            // logger.log("Failed to split path at node", intersectionNode.id);
            return null;
        }

        logger.log(this.id, intersectionNode.id, "pathToIntersection", pathToIntersection.path, "pathFromIntersection", pathFromIntersection.path);
        logger.log(this.id, pathToIntersection.origin, pathToIntersection.goal, pathFromIntersection.origin, pathFromIntersection.goal);
        // throw new Error("pathToIntersection or pathFromIntersection does not include intersectionNode");


        edgeToIntersection.overridePath(pathToIntersection);
        edgeFromIntersection.overridePath(pathFromIntersection);

        this.network.removeEdge(remainingEdge);
        this.network.removeEdgeFromPosMap(remainingEdge);

        this.network.edges.add(edgeToIntersection);
        this.network.edges.add(edgeFromIntersection);

        // Add new edges to the position map
        this.network.addEdgeToPosMap(edgeToIntersection);
        this.network.addEdgeToPosMap(edgeFromIntersection);

        let newRemainingEdge: Edge;
        if (startNode.id === ourNode1.id) {
            newRemainingEdge = edgeFromIntersection;
        } else {
            newRemainingEdge = edgeToIntersection;
        }

        return {
            remainingEdge: newRemainingEdge,
            startNode: intersectionNode
        };
    }

    getOrCreateNodeAtPosition(position: WorldPosition): Node {
        if (this.network.hasNode(position)) {
            // logger.log("Existing node found at position", position);
            let node = this.network.getNode(position);
            if (!node) {
                throw new Error("Node not found at position, something is seriously wrong: " + position);
            }
            return node;
        } else {
            // logger.log("Creating new node at position", position);
            const newNode = this.network.addNode(position, nodeTypes.INTERSECTION, false);
            return newNode;
        }
    }

    splitAt(pos: WorldPosition) {
        let node1 = this.network.getNodeById(this.node1Id);
        let node2 = this.network.getNodeById(this.node2Id);
        if (!node1 || !node2) {
            throw new Error("Node not found at position, something is seriously wrong: " + this.node1Pos);
        }
        //if pos is either of our nodes, return that node
        if (pos.isEqualTo(this.node1Pos)) {
            return node1;
        } else if (pos.isEqualTo(this.node2Pos)) {
            return node2;
        }

        //otherwise, split the edge at this position
        let intersectionNode = this.getOrCreateNodeAtPosition(pos);
        let splitResult = this.splitEdgeAtNode(intersectionNode, this, node1);
        if (!splitResult) {
            throw new Error("Failed to split edge at node");
        }
        let newEdge = splitResult.remainingEdge;
        let startNode = splitResult.startNode;
        this.network.addEdge(startNode, node2);
        return intersectionNode;
    }




    refineEdge(skipNetworkRefinement: boolean = false): boolean {
        if (!this.path.path || this.lastUpdated == 0 || (Game.time - this.lastUpdated) >= this.network.edgeTicksValid) {
            logger.log("--------------------- refining edge --------------", this.id);

            let n1Room = this.network.getRoom(this.node1Pos.roomName);
            let n2Room = this.network.getRoom(this.node2Pos.roomName);
            if (!n1Room || !n2Room) {
                logger.log("Room missing", this.id, this.node1Pos.roomName, this.node2Pos.roomName);
                return false;
            }
            let node1 = n1Room.getNodeId(this.node1Id);
            let node2 = n2Room.getNodeId(this.node2Id);
            if (!node1 || !node2) {
                logger.log("Node missing", this.id, this.node1Id, this.node2Id);
                return false;
            }
            node1.lastUpdated = 0;
            node2.lastUpdated = 0;

            let path = this.path.getPath();
            this.lastUpdated = Game.time;

            if (skipNetworkRefinement) {
                return true;
            }

            // try {
                this.checkIntersections();
            // } catch (error) {
            //     logger.error(`Error in checkIntersections for edge ${this.id}:`, error);
            //     return false;
            // }

            return true;
        } else {
        }
        return false;
    }

    displayEdge(color: string = "#999", opacity: number = 0.5): void {
        if ( this.path.path && this.path.path.length == 0) {
            logger.log("empty path", this.id)
        }
        if (!this.path.path && this.path._cachedPath) {
            this.path.getPath();
        }

        if (!this.path.path || this.path.path.length == 0) {
            new RoomVisual(this.node1Pos.roomName).line(this.node1Pos.toRoomPosition(), this.node2Pos.toRoomPosition(), {color: color, lineStyle: "dashed", opacity:0.1})
        } else {
            let style = {
                opacity: opacity
            }
            visual.drawPath(this.path.path.map(pos => pos.toRoomPosition()), color, style)
        }
    }

    serialize(level: number): string {
        let arr = [
            this.node1Id,
            this.node1Pos.serialize(),
            this.node2Id,
            this.node2Pos.serialize(),
            this.lastUpdated
        ]
        if (level == 1) {
            arr.push(this.path.serialize())
        }
        return arr.join("|");
    }

    static deserialize(str: string, network: NodeNetwork): Edge {
        let [n1Id, n1Pos, n2Id, n2Pos, lastUpdated, cachedPath] = str.split("|");
        let node1Room = network.rooms.thingsById[WorldPosition.deserialize(n1Pos).roomName];
        let node1 = node1Room.nodes.thingsById[n1Id];
        let node2Room = network.rooms.thingsById[WorldPosition.deserialize(n2Pos).roomName];
        let node2 = node2Room.nodes.thingsById[n2Id];

        let inst = new Edge(network, node1, node2);
        inst.lastUpdated = Number(lastUpdated);

        if (cachedPath) {
            inst.path = CachedPath.deserialize(cachedPath);
        }

        return inst;
    }
}

export default Edge;
