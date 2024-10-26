export * from "./WorldPosition";
export * from "./CostMatrix";

import Logger from "shared/utils/logger";
import WorldPosition from "./WorldPosition";
import { StructureWrapper } from "world_new/wrappers/base/HasStorageWrapper";
import type { GameObjectWrapper } from "world_new/wrappers/base/GameObjectWrapper";
import { WorldPositionData, RoomPositionData } from './types';

let logger = new Logger("map/index.ts");

export function getExitPositions(roomName: string): { [key: string]: RoomPosition[] } {
    const terrain = Game.map.getRoomTerrain(roomName);
    //@ts-ignore missing from screeps types
    const raw = terrain.getRawBuffer();
    const exitDescriptions: { [key: string]: RoomPosition[] } = {};
    const exits = Game.map.describeExits(roomName);

    for (const exitDir in exits) {
        const exitsThisWay: RoomPosition[] = [];
        for (let i = 0; i < 50; i++) {
            let x: number, y: number;
            switch (Number.parseInt(exitDir)) {
                case FIND_EXIT_TOP:
                    x = i; y = 0;
                    break;
                case FIND_EXIT_BOTTOM:
                    x = i; y = 49;
                    break;
                case FIND_EXIT_LEFT:
                    x = 0; y = i;
                    break;
                case FIND_EXIT_RIGHT:
                    x = 49; y = i;
                    break;
                default:
                    continue;
            }
            const code = raw[y * 50 + x];
            const isWall = code & TERRAIN_MASK_WALL;
            if (!isWall) {
                const pos = new RoomPosition(x, y, roomName);
                exitsThisWay.push(pos);
            }
        }
        exitDescriptions[exitDir] = exitsThisWay;
    }

    return exitDescriptions;
}

export function arrayContainsLoc(array: RoomPosition[], pos: RoomPosition, debug?: boolean): boolean {
    for(let apos of array) {
        if (debug)
            logger.log(pos, apos);
        if (apos.x == pos.x && apos.y == pos.y && apos.roomName == pos.roomName)
            return true;
    }
    return false;
}

/**
 * Finds the current, next, and lookahead positions on a path for a given creep position.
 * @param creepPos The current position of the creep
 * @param path The path to follow
 * @param lookahead The number of steps to look ahead
 * @param startIndex The index to start searching from
 * @returns An object containing the current, next, and lookahead positions, and the new current index
 */
export function findPathPositions(creepPos: WorldPosition, path: WorldPosition[], lookahead: number, startIndex: number = 0): {
    currentPos: WorldPosition,
    nextPos: WorldPosition,
    lookaheadPos: WorldPosition,
    currentIndex: number
} {
    startIndex = Math.min(startIndex, path.length - 1);
    let closestIndex = startIndex;
    let closestDist = creepPos.getRangeTo(path[startIndex]);
    for (let i = startIndex + 1; i < path.length; i++) {
        let posDist = creepPos.getRangeTo(path[i]);
        if (posDist < closestDist) {
            closestDist = posDist;
            closestIndex = i;
        } else {
            // If distance starts increasing, we've found the closest point
            break;
        }
    }

    let currentPos = path[closestIndex];
    let nextPos = path[Math.min(closestIndex + 1, path.length - 1)];
    let lookaheadPos = path[Math.min(closestIndex + lookahead, path.length - 1)];

    return { currentPos, nextPos, lookaheadPos, currentIndex: closestIndex };
}

const blockingStructures: StructureConstant[] = [
    STRUCTURE_WALL,
    STRUCTURE_RAMPART,
    STRUCTURE_SPAWN,
    STRUCTURE_EXTENSION,
    STRUCTURE_LINK,
    STRUCTURE_STORAGE,
    STRUCTURE_TOWER,
    STRUCTURE_OBSERVER,
    STRUCTURE_POWER_SPAWN,
    STRUCTURE_LAB,
    STRUCTURE_TERMINAL,
    STRUCTURE_NUKER,
    STRUCTURE_FACTORY
];

const destructibleStructures: StructureConstant[] = [
    STRUCTURE_WALL,
    STRUCTURE_RAMPART,
    STRUCTURE_SPAWN,
    STRUCTURE_EXTENSION,
    STRUCTURE_LINK,
    STRUCTURE_STORAGE,
    STRUCTURE_TOWER,
    STRUCTURE_OBSERVER,
    STRUCTURE_POWER_SPAWN,
    STRUCTURE_LAB,
    STRUCTURE_TERMINAL,
    STRUCTURE_NUKER,
    STRUCTURE_FACTORY
];

export function StuctureIsBlocking(structure: Structure | GameObjectWrapper<any>): boolean {
    //@ts-ignore
    if (structure.objectType) {
        //@ts-ignore
        return blockingStructures.includes(structure.objectType as StructureConstant);
    }
    //@ts-ignore
    return blockingStructures.includes(structure.structureType);
}

export function StructureIsDestructible(structure: Structure | GameObjectWrapper<any>): boolean {
    //@ts-ignore
    if (structure.objectType) {
        //@ts-ignore
        return destructibleStructures.includes(structure.objectType as StructureConstant);
    }
    //@ts-ignore
    return destructibleStructures.includes(structure.structureType);
}

// Export basic position utilities that don't depend on other systems
export function serializePos(pos: RoomPosition): string {
    return `${pos.x},${pos.y},${pos.roomName}`;
}

export function deserializePos(serialized: string): RoomPositionData {
    const [x, y, roomName] = serialized.split(',');
    return { x: parseInt(x), y: parseInt(y), roomName };
}

export function toWorldPosition(target: RoomPosition | { pos: RoomPosition } | WorldPosition): WorldPosition {
    if (target instanceof WorldPosition) return target;
    const pos = 'pos' in target ? target.pos : target;
    return WorldPosition.fromRoomPosition(pos);
}

// Export types
export type { WorldPositionData, RoomPositionData };
export { WorldPosition };
