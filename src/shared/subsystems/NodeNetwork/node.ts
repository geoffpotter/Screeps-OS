import { makeNodeId, NodePath } from "./NodeNetworkTypes";
import type Edge from "./edge";
import DestinationInfo from "./DestinationInfo";
import type {NodeNetwork} from './nodeNetwork';
import visual from 'shared/utils/visual';
import Logger from 'shared/utils/logger';
import { toWorldPosition } from 'shared/utils/map/WorldPosition';
import WorldPosition from 'shared/utils/map/WorldPosition';
import NodeTypes from './nodeTypes';
const logger = new Logger("this.network.node");
import { makeEdgeId } from "./NodeNetworkTypes";"./NodeNetworkTypes"

class Node {

    network: NodeNetwork;
    private _id: string | false = false;
    pos!: WorldPosition;
    type!: string;
    lastUpdated!: number;
    private _destMap: Map<string, DestinationInfo> | false = false;

    constructor(network: NodeNetwork, pos: WorldPosition, type: string, overRide: boolean = false) {
        this.network = network;
        if (overRide) {
            return;
        }
        if (NodeTypes.TYPES.indexOf(type) == -1) {
            throw new Error(`invalid node type: ${type}`);
        }
        this.pos = toWorldPosition(pos);
        this.type = type;
        this.lastUpdated = 0;
    }

    get id(): string {
        if (!this._id) {
            this._id = makeNodeId(this.pos)
        }
        return this._id;
    }

    toJSON(): string {
        return this.serialize();
    }

    resetDestMap() {
        this._destMap = false;
    }

    knowsPathTo(destNode: Node): boolean {
        if (!this._destMap) {
            return false;
        }
        return this._destMap.has(destNode.id);
    }

    get destinationsMap(): Map<string, DestinationInfo> {
        if (!this._destMap) {
            let destIds = this.network.distances.getGroupWithValue("origin.id", this.id);
            this._destMap = new Map();
            if (!destIds) {
                return this._destMap;
            }
            for (let destId of destIds) {
                let dest = this.network.distances.getById(destId);
                if (!dest) {
                    logger.log("ERROR: destination not found in distances!", destId);
                    continue;
                }
                this._destMap.set(dest.goal.id, dest);
            }
        }
        return this._destMap;
    }

    get destinations(): DestinationInfo[] {
        let destIds = this.network.distances.getGroupWithValue("origin.id", this.id);
        let dests: DestinationInfo[] = [];
        if (!destIds) {
            return dests;
        }
        for (let destId of destIds) {
            let dest = this.network.distances.getById(destId);
            if (!dest) {
                logger.log("ERROR: destination not found in distances!", destId);
                continue;
            }
            dests.push(dest);
        }
        return dests;
    }

    get allEdges(): string[] {
        // logger.log("validating edges collection");
        // this.network.edges.validateCollection();
        let edges1 = this.network.edges.getGroupWithValue("node1Id", this.id);
        let edges2 = this.network.edges.getGroupWithValue("node2Id", this.id);
        if (!edges1) edges1 = [];
        if (!edges2) edges2 = [];
        return edges1.concat(edges2);
    }

    get edgeNodes(): Node[] {
        let edges = this.allEdges;

        let edgeNodes: { [id: string]: Node } = {};
        for (let edgeId of edges) {
            let edge = this.network.edges.thingsById[edgeId];
            if (!edge) {
                logger.log("ERROR: edge not found in edges!", edgeId, this.network.edges.getGroupWithValue("node1Id", this.id), this.network.edges.getGroupWithValue("node2Id", this.id));
                continue;
            }
            let otherNode = edge.getOtherNode(this);
            edgeNodes[otherNode.id] = otherNode;
        }
        return Object.values(edgeNodes);
    }

    getNodeEdge(otherNode: Node): Edge | false {
        let edgeId = makeEdgeId(this.id, otherNode.id);
        let edge = this.network.edges.getById(edgeId);
        if (edge) {
            return edge;
        }
        logger.log("couldn't find node edge!", edgeId);
        return false;
    }

    refineNode() {
        if (this.lastUpdated == 0 || (Game.time - this.lastUpdated) >= this.network.nodeTicksValid) {
            logger.log("refining node:", this.id);
            let neighbors = this.edgeNodes;
            for (let neighbor of neighbors) {
                this.updatePathingWithNode(neighbor);
            }
            this.lastUpdated = Game.time;
        }
    }

    updatePathingWithNode(otherNode: Node) {
        let edge = this.getNodeEdge(otherNode);
        if (!edge) {
            return;
        }
        let destInfo = new DestinationInfo(this, otherNode, otherNode, edge.cost);
        this.addDestination(destInfo);

        let otherDests = otherNode.destinations;
        for (let otherDest of otherDests) {
            if (otherDest.goal.id == this.id || otherDest.goal.id == otherNode.id || otherDest.origin.id == this.id) {
                continue;
            }

            let totalCost = 0 + otherDest.travelCost;
            if (edge.cost) {
                totalCost += edge.cost;
            }

            let destInfo = new DestinationInfo(this, otherDest.goal, otherNode, totalCost);
            this.addDestination(destInfo);
        }
    }

    addDestination(destInfo: DestinationInfo) {
        this._destMap = false;
        let betterPath = false;
        if (this.network.distances.has(destInfo)) {
            let dests = this.network.distances.getById(destInfo.id)
            if (!dests) {
                logger.log("ERROR: destination not found in distances!", destInfo.id);
                return;
            }
            let currentCost = dests.travelCost;
            if (currentCost > destInfo.travelCost) {
                destInfo.origin.invalidateNode();
                destInfo.goal.invalidateNode();
                this.network.distances.remove(destInfo);
                betterPath = true;
            }
        } else {
            destInfo.origin.invalidateNode();
            destInfo.goal.invalidateNode();
            betterPath = true;
        }
        if (betterPath) {
            this.network.distances.add(destInfo);
        }
    }

    invalidateNode(depthToGo: number = 2) {
        this.lastUpdated = 0;
        let neighbors = this.edgeNodes;
        for (let neighbor of neighbors) {
            if (depthToGo <= 0) {
                return;
            }
        }
    }

    getDistanceTo(destNode: Node): number {
        if (destNode.id == this.id) {
            return 0;
        }
        let dest = this.destinationsMap.get(destNode.id);
        if (!dest) {
            return this.pos.getRangeTo(destNode.pos);
        }
        return dest.travelCost;
    }

    nextNodeInCachedPathToDestination(destNode: Node): Node | false {
        let start = Game.cpu.getUsed();
        let log = (...args: any[]) => {
            let usedNow = Game.cpu.getUsed();
            let used = usedNow - start;
            logger.log("cpu used:", used, args);
            start = usedNow;
        }

        let destInfo = this.destinationsMap.get(destNode.id);
        if (!destInfo) {
            return false;
        }
        let nextNode = destInfo.nextNode;
        return nextNode;
    }

    findCachedNodePathTo(destNode: Node): NodePath|false {
        if (!this.destinationsMap.has(destNode.id)) {
            return false;
        }

        let currentNode:Node|false = this;
        let path:Node[] = [this];
        let hops = 0;
        let hopsLimit = 10000;
        let incomplete = false;
        while (true) {
            if (!currentNode ||currentNode.id == destNode.id) {
                break;
            }
            if (!currentNode) {
                logger.log("ERROR: currentNode not found in path finding!", currentNode);
                break;
            }
            let nextNode = currentNode.nextNodeInCachedPathToDestination(destNode);
            if (nextNode) {
                path.push(nextNode);
            }
            currentNode = nextNode;

            if (hops > hopsLimit || !currentNode) {
                incomplete = true;
                break;
            }
            hops++;
        }
        let destInfo = this.destinationsMap.get(destNode.id)
        return {
            path,
            incomplete,
            cost: destInfo?.travelCost ?? Infinity,
            hops: hops + 1
        }
    }

    displayNode(showDests: boolean = false) {
        visual.drawText(this.type, this.pos.toRoomPosition(), "white", {opacity: 0.5});
        // if (showDests) {
        //     let dests = this.destinations;
        //     let debug = [];
        //     for (let dest of dests) {
        //         debug.push(`${dest.id} > ${dest.travelCost} by ${dest.nextNode.id}`);
        //     }
        //     visual.drawTextLines(debug, this.pos.toRoomPosition());
        // } else {
        //     visual.drawText(` ${this.destinations.length} dests`, this.pos.toRoomPosition())
        // }
    }

    serialize(): string {
        let ser = this.pos.serialize() + '|' + this.type
        return ser;
    }

    static deserialize(str: string, network: NodeNetwork): Node {
        let [posStr, type] = str.split("|");
        let pos = WorldPosition.deserialize(posStr);
        let inst = new Node(network, pos, type);
        return inst;
    }

}

export default Node;
