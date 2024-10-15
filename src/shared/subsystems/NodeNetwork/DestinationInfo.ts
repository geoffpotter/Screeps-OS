import Node from './node';
import WorldPosition from "shared/utils/map/WorldPosition";
import type networkRoom from "./networkRoom";

class DestinationInfo {
    origin: Node;
    goal: Node;
    nextNode: Node;
    travelCost: number;

    constructor(originNode: Node, goalNode: Node, nextNode: Node, cost: number) {
        this.origin = originNode;
        this.goal = goalNode;
        this.nextNode = nextNode;
        this.travelCost = cost;
    }

    get id(): string {
        return `${this.origin.id}_${this.goal.id}`;
    }

    serialize(): string {
        const items = [
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

    static deserialize(str: string, getRoom: (roomName: string) => networkRoom | undefined): DestinationInfo {
        const [originId, originRoomName, goalId, goalRoomName, nextNodeId, nextNodeRoomName, cost] = str.split("|");

        const oRoom = getRoom(originRoomName);
        if (!oRoom) throw new Error(`Room ${originRoomName} not found`);
        const origin = oRoom.getNodeId(originId);
        if (!origin) throw new Error(`Node ${originId} not found in room ${originRoomName}`);

        const gRoom = getRoom(goalRoomName);
        if (!gRoom) throw new Error(`Room ${goalRoomName} not found`);
        const goal = gRoom.getNodeId(goalId);
        if (!goal) throw new Error(`Node ${goalId} not found in room ${goalRoomName}`);

        const nRoom = getRoom(nextNodeRoomName);
        if (!nRoom) throw new Error(`Room ${nextNodeRoomName} not found`);
        const next = nRoom.getNodeId(nextNodeId);
        if (!next) throw new Error(`Node ${nextNodeId} not found in room ${nextNodeRoomName}`);
        return new DestinationInfo(origin, goal, next, Number(cost));
    }
}

export default DestinationInfo;
