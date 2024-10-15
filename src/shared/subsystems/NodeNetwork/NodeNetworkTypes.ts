import type WorldPosition from "shared/utils/map/WorldPosition";
import type { default as Node } from "./node";
import Logger from "shared/utils/logger";
let logger = new Logger("NodeNetworkTypes");

export interface NodePath {
    path: Node[];
    incomplete: boolean;
    cost: number;
    hops: number;
    ops?: number|undefined;
}

export interface NodeInfo {
    node: Node,
    parent: Node|false,
    h: number,
    g: number,
    f: number,
    closed: boolean
}

export interface NodeNetworkPath {
    path: string | false,
    pathStage: false|0|1|2,
    edgeId: string | false,
    method: string,
    done: boolean,
    goal: WorldPosition,
}

export type MovableObject = Creep;


export function sortNodesForEdgeId(node1Pos: WorldPosition, node2Pos: WorldPosition): [WorldPosition, WorldPosition] {
    if (node1Pos.x < node2Pos.x) {
        return [node2Pos, node1Pos];
    } else if (node1Pos.x > node2Pos.x) {
        return [node1Pos, node2Pos];
    } else if (node1Pos.y < node2Pos.y) {
        return [node2Pos, node1Pos];
    } else {
        return [node1Pos, node2Pos];
    }
}

export function makeEdgeId(node1Id: string, node2Id: string): string {
    let p1 = nodeIdToPos(node1Id);
    let p2 = nodeIdToPos(node2Id);
    let [pos1, pos2] = sortNodesForEdgeId(p1, p2);

    // logger.log('making edge id', node1Id, p1, node2Id, p2, pos1, pos2)
    if (pos1.isEqualTo(p1)) {
        return node1Id + "-" + node2Id;
    } else {
        return node2Id + "-" + node1Id;
    }
}

export function makeNodeId(pos: WorldPosition):string {
    let roomPos = pos.toRoomPosition();
    return roomPos.x + "_" + roomPos.y + "_" + roomPos.roomName;
    // return pos.serialize();
}

export function nodeIdToPos(nodeId: string):WorldPosition {
    let [x, y, roomName] = nodeId.split("_");
    return new RoomPosition(parseInt(x), parseInt(y), roomName).toWorldPosition();
}
