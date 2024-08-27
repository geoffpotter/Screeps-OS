// test
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

        let oRoom = pstar.inst.getRoom(originRoomName);
        let origin = oRoom.getNode(originId);
        let gRoom = pstar.inst.getRoom(goalRoomName);
        let goal = gRoom.getNode(goalId);
        let nRoom = pstar.inst.getRoom(nextNodeRoomName);
        let next = nRoom.getNode(nextNodeId);
        return new DestinationInfo(origin, goal, next, cost);
    }
}

module.exports = DestinationInfo;
