

class NodeTypes {
    BASE: string = "🏠";
    CONTROLLER_OWNED: string = "💡";
    CONTROLLER_RESERVED: string = "🕯️";
    STATIC_RESOURCE: string = "🔌";
    BUILDING: string = "🏢";
    ROOM_EXIT: string = "💨";
    INTERSECTION: string = "🚦";

    TYPES: string[] = [
        this.BASE,
        this.CONTROLLER_OWNED,
        this.CONTROLLER_RESERVED,
        this.STATIC_RESOURCE,
        this.BUILDING,
        this.ROOM_EXIT,
        this.INTERSECTION
    ];
}

export default new NodeTypes();
