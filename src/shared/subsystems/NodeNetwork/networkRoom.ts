import IndexingCollection from "shared/utils/queues/indexingCollection";
import type { default as nodeNetwork, NodeNetwork } from "./nodeNetwork";
import Node from "./node";
import Edge from "./edge";
import Logger from "shared/utils/logger";
import visual from "shared/utils/visual";
import { getExitPositions } from "shared/utils/map";
import nodeTypes from "./nodeTypes";
import WorldPosition from "shared/utils/map/WorldPosition";
import { makeNodeId } from "./NodeNetworkTypes";

const logger = new Logger("NodeNetworkRoom");
class networkRoom {
    network: NodeNetwork;
    roomName: string;
    nodes: IndexingCollection<Node>;
    ticksValid: number;
    lastUpdated: number;
    exitsAdded: boolean;

    constructor(network:NodeNetwork, roomName: string) {
        this.network = network;
        this.roomName = roomName;

        this.nodes = new IndexingCollection<Node>("id", ["pos.roomName", "type"], [100000, 1000000]);
        this.nodes.serializeSeperator = "ʭ";

        this.ticksValid = 10000;
        this.lastUpdated = 0;

        this.exitsAdded = false;

    }



    displayRoom(): void {
        let center = new RoomPosition(25, 25, this.roomName);
        visual.drawText(this.roomName + " " + Object.keys(this.nodes.thingsById).length, center, "white", {opacity: 0.5});
        this.displayNodes();

    }

    displayNodes(): void {
        let allNodes = this.nodes.getAll();
        for(let n in allNodes) {
            let node = allNodes[n];
            node.displayNode();
        }
    }

    refineRoom(): boolean {
        if (Game.time > (this.lastUpdated + this.ticksValid)) {
            logger.log(this.roomName, "updating!", Game.time, this.lastUpdated, this.ticksValid)

            let exits = Game.map.describeExits(this.roomName);
            for (let dir in exits) {
                if (exits.hasOwnProperty(dir)) {
                    let otherRoom = exits[dir as keyof typeof exits];
                    if (otherRoom) {
                        this.network.addRoomToAdditionQueue(otherRoom);
                    }
                }
            }

            if (!this.exitsAdded) {
                // this.addRoomExitNodes();
                this.exitsAdded = true;
            }

            this.lastUpdated = Game.time;
            return true;
        }
        return false;
    }

    getNodeId(nodeId: string): Node | undefined {
        return this.nodes.getById(nodeId);
    }
    getNode(pos: WorldPosition): Node | undefined {
        let node = this.nodes.getById(makeNodeId(pos));
        if (!node) {
            return undefined;
        }
        return node;
    }

    hasNode(node: Node): boolean {
        return this.nodes.has(node);
    }
    hasNodePos(pos: WorldPosition) {
        return this.nodes.hasId(makeNodeId(pos))
    }
    hasNodeId(id: string) {
        return this.nodes.hasId(id)
    }

    addNode(node: Node, autoAddEdges = true): void {
        if(this.hasNode(node)) {
            throw new Error("Already a node at this location");
        }
        this.nodes.add(node);
        if (autoAddEdges) {
            this.addNodeEdges(node);
        }
    }

    removeNode(node: Node): void {
        this.nodes.remove(node);
    }

    addNodeEdges(node: Node): void {
        switch(node.type) {
            case nodeTypes.ROOM_EXIT:
                let getExitsForRoom = (roomName: string): Node[] | false => {
                    let room = this.network.rooms.thingsById[roomName];
                    if (!room) {
                        return false;
                    }
                    let nodes = room.nodes.getGroupWithValue("type", nodeTypes.ROOM_EXIT);
                    let nodes2 = room.nodes.getGroupWithValue("type", nodeTypes.BASE);
                    let outIds: string[] = [];
                    if (nodes) outIds = outIds.concat(nodes);
                    if (nodes2) outIds = outIds.concat(nodes2);
                    let out: Node[] = [];
                    for (let id of outIds) {
                        let n = this.network.getNodeById(id);
                        if (n) {
                            out.push(n);
                        }
                    }
                    return out;
                }
                let exits = Game.map.describeExits(node.pos.roomName);
                let otherRooms:string[] = _.values(exits);
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
                roomExitNodes = _.shuffle(roomExitNodes);
                let thisNodePos = node.pos.toRoomPosition();
                let thisNodeWPos = node.pos;

                let nodesConnected = 0;
                let maxConnections = 200;

                let ourNodes = _.filter(roomExitNodes, (roomExitNode) => {
                    if (roomExitNode.id == node.id) {
                        return false;
                    }

                    if (!roomExitNode || roomExitNode.pos.roomName != node.pos.roomName && otherRooms.indexOf(roomExitNode.pos.roomName) == -1) {
                        return false;
                    }

                    let d = thisNodeWPos.getRangeTo(roomExitNode.pos);
                    let sameRoomExit = (roomExitNode.pos.roomName == thisNodePos.roomName) && roomExitNode.pos.x != thisNodeWPos.x && roomExitNode.pos.y != thisNodeWPos.y && (nodesConnected < maxConnections);
                    if (sameRoomExit || d < 4 || (roomExitNode.type == nodeTypes.BASE && roomExitNode.pos.roomName == thisNodePos.roomName)) {
                        if (roomExitNode.type != nodeTypes.BASE) {
                            nodesConnected++;
                        }
                        return true;
                    }
                    return false;
                });
                _.each(ourNodes, (ourNode) => {
                    this.network.addEdge(node, ourNode);
                })
                break;
            default:
                let allNodes = this.nodes.getGroupWithValue("pos.roomName", node.pos.roomName);
                let edges: { n: Node, o: Node }[] = [];
                let dists: { [key: string]: number } = {};
                if (allNodes) {
                    for (let otherNodeId of allNodes) {
                        let otherNode = this.nodes.getById(otherNodeId);
                        if (otherNode && node.id !== otherNode.id && !(node.type === nodeTypes.ROOM_EXIT && otherNode.type === nodeTypes.ROOM_EXIT)) {
                            let edgeKey = {n: node, o: otherNode};
                            dists[`${edgeKey.n.id}-${edgeKey.o.id}`] = node.getDistanceTo(otherNode);
                            edges.push(edgeKey);
                        }
                    }
                }
                edges = _.sortBy(edges, (e) => dists[e.n.id+"-"+e.o.id]);
                let maxExitConns = 20;
                let maxConns = 7;
                let conns = 0;
                let exitConns = 0;
                for(let i=0;i<edges.length;i++) {
                    let o = edges[i];
                    if (o.o.type == nodeTypes.ROOM_EXIT && (exitConns < maxExitConns || o.n.type == nodeTypes.BASE)) {
                        // logger.log("adding edge connection", o.n.id, o.o.id, o.o.type)
                        exitConns++;
                        this.network.addEdge(o.n, o.o);
                    }

                    if (o.o.type != nodeTypes.ROOM_EXIT && conns < maxConns) {
                        // logger.log("adding inner-room connection", o.n.pos.toRoomPosition(), o.o.pos.toRoomPosition(), o.n.type, o.o.type, nodeTypes.ROOM_EXIT)
                        conns++;
                        this.network.addEdge(o.n, o.o);
                    }

                    if (conns >= maxConns && exitConns >= maxExitConns) {
                        break;
                    }
                }
                break;
        }
    }

    addRoomExitNodes(): void {
        let exitPositionsList = getExitPositions(this.roomName);
        for(let exitDir in exitPositionsList) {

            let exitPositions = exitPositionsList[exitDir as keyof typeof exitPositionsList];
            if (!exitPositions) {
                continue;
            }
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
            logger.log("total groups", groups.length);
            for(let g in groups) {
                let group = groups[g];
                let centerExit = group[Math.floor(group.length/2)];
                let newX = centerExit.x + dx;
                let newY = centerExit.y + dy;
                if (newX < 0 || newX >= 50 || newY < 0 || newY >= 50) {
                    logger.log("skipping exit node", newX, newY, centerExit.roomName, exitDir);
                    continue;
                }
                let exitNodePos = new RoomPosition(newX, newY, centerExit.roomName);
                if (!this.network.hasNode(exitNodePos.toWorldPosition())) {

                    logger.log("adding exit node", exitNodePos.x, exitNodePos.y, exitNodePos.roomName);
                    this.network.addNode(exitNodePos.toWorldPosition(), nodeTypes.ROOM_EXIT);
                }
            }
        }
    }

    groupExits(exits: RoomPosition[], byX = true, lengthLimit = 0): RoomPosition[][] {
        const worldExits = exits;
        const field = byX ? "x" : "y";
        const sortedExits = _.sortBy(worldExits, [field]);
        logger.log("sorted exits", sortedExits);
        const exitGroups: RoomPosition[][] = [];
        let currentGroup: RoomPosition[] = [];

        for (let i = 0; i < sortedExits.length; i++) {
            const exit = sortedExits[i];
            const exitField = exit[field] as number;
            // i !== 0 && logger.log("exitField", exitField, sortedExits[i - 1][field]+1, "lims",  lengthLimit, currentGroup.length);
            if (i === 0 || exitField !== (sortedExits[i - 1][field] + 1) ||
                (lengthLimit > 0 && currentGroup.length >= lengthLimit)) {
                if (currentGroup.length > 0) {
                    exitGroups.push(currentGroup);
                }
                currentGroup = [];
            }

            currentGroup.push(exit);
        }

        if (currentGroup.length > 0) {
            exitGroups.push(currentGroup);
        }

        return exitGroups;
    }

    serialize(): string {
        let arr = [
            this.roomName,
            this.lastUpdated,
            this.exitsAdded,
            this.nodes.serialize()
        ];
        return arr.join("ʬ");
    }

    static deserialize(str: string, network:  NodeNetwork): networkRoom {
        let [roomName, lastUpdated, exitsAdded, nodesStr] = str.split("ʬ");
        let inst = new networkRoom(network, roomName);
        inst.lastUpdated = Number(lastUpdated);
        inst.exitsAdded = exitsAdded === 'true';
        if (nodesStr) {
            let deseralizer = {
                deserialize: function(str: string) {
                    return Node.deserialize(str, network)
                }
            }
            inst.nodes = IndexingCollection.deserialize(nodesStr, deseralizer) as IndexingCollection<Node>;
        }
        return inst;
    }
}

export default networkRoom;
