import WorldPosition from "shared/utils/map/WorldPosition";

export interface MoveToOptions {
    visualize?: boolean;
    range?: number;
    ignoreCreeps?: boolean;
    ignoreDestructibleStructures?: boolean;
    ignoreRoads?: boolean;
    maxOps?: number;
    maxRooms?: number;
    plainCost?: number;
    swampCost?: number;
    flee?: boolean;
    maxPathDistance?: number;
    priority?: number;
    pull?: Creep; // Creep to pull along with this movement
}

export interface MoveIntent {
    creep: Creep;
    targetPos: WorldPosition;
    priority: number;
    goalPos: WorldPosition;
    path?: WorldPosition[];
    currentPathIndex?: number;
    pullCreep?: Creep; // Creep being pulled
    lastPositions?: WorldPosition[]; // Track last few positions to detect cycles
    lookAheadPos?: WorldPosition;
}

export interface MovementRequest {
    creep: Creep;
    targetPos: WorldPosition;
    options: MoveToOptions;
}
