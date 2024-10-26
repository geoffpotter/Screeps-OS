import { MovementRequest, MoveIntent } from "./types";
import { getStoredPath, calculateNewPath, storePath } from "./PathManager";
import { findNextValidPosition } from "./PathFollower";
import { getCreepPositionHistory, updateCreepPositionHistory, getCreepPathIndex, setCreepPathIndex, clearCreepData } from "./Requests";
import Logger from "shared/utils/logger";
import WorldPosition from "shared/utils/map/WorldPosition";
import visual from "shared/utils/visual";

const logger = new Logger("MoveManager");

const POSITION_HISTORY_LENGTH = 5; // Number of positions to track for cycle detection

export function processMovementRequests(requests: MovementRequest[]): Map<string, MoveIntent> {
    const intents = new Map<string, MoveIntent>();

    logger.log("Processing requests:", requests.length); // Basic logger log

    for (const request of requests) {
        logger.log("Processing request for", request.creep.name, "at", request.creep.pos, "to", request.targetPos);

        // Check if request is valid
        if (!request.creep || !request.targetPos) {
            logger.log("Invalid request - missing creep or target");
            continue;
        }

        const intent = processRequest(request);
        if (intent) {
            intents.set(request.creep.id, intent);
            logger.log("Created intent for", request.creep.name);
        } else {
            logger.log("Failed to create intent for", request.creep.name);
        }
    }

    return intents;
}

function processRequest(request: MovementRequest): MoveIntent | null {
    const { creep, targetPos, options } = request;

    // If already at target, create an intent to stay there
    if (creep.pos.toWorldPosition().inRangeTo(targetPos, options.range || 0)) {
        logger.log(`${creep.name} already at target, creating stay-in-place intent`);
        return {
            creep,
            targetPos: creep.pos.toWorldPosition(),
            priority: options.priority || 1,
            goalPos: targetPos,
            currentPathIndex: 0
        };
    }

    // Get or calculate path
    let path = getStoredPath(creep, targetPos);
    if (!path) {
        logger.log(`Calculating new path for ${creep.name}`);
        path = calculateNewPath(creep, targetPos, options);
        if (path) {
            storePath(creep, targetPos, path);
            logger.log(`Path calculated with length: ${path.length}`);
        } else {
            logger.log(`Path calculation failed for ${creep.name}`);
        }
    } else {
        logger.log(`Using stored path for ${creep.name}`);
    }

    if (!path) return null;

    // Visualize path if requested
    if (options.visualize) {
        // Convert WorldPositions to RoomPositions for visualization
        const roomPositions = path.map(pos => pos.toRoomPosition());

        // Draw the path using the visual utility
        visual.drawPath(
            roomPositions,
            creep.getColor?.() || '#ffffff',
            {
                opacity: 0.5,
                lineStyle: 'dashed'
            }
        );

        // // Draw current target with a circle
        // const nextPos = findNextValidPosition(creep, path, options.maxPathDistance || 3);
        // if (nextPos) {
        //     visual.circle(
        //         nextPos.nextPos.toRoomPosition(),
        //         creep.getColor?.() || '#ffffff',
        //         0.7,
        //         0.25
        //     );
        // }
    }

    // Update position history
    const currentPos = creep.pos.toWorldPosition();
    updateCreepPositionHistory(creep.id, currentPos);

    // Find next position along path within maxPathDistance
    let pathResult = findNextValidPosition(creep, path, options.maxPathDistance || 3);
    if (!pathResult) {
        logger.log(`No valid next position found for ${creep.name}`);
        return null;
    }

    // If we need a new path, clear the stored one and try again
    if (pathResult.needsNewPath) {
        logger.log(`Recalculating path for ${creep.name}`);
        path = calculateNewPath(creep, targetPos, options);
        if (!path) {
            logger.log(`Failed to calculate new path for ${creep.name}`);
            return null;
        }
        storePath(creep, targetPos, path);

        // Try again with new path
        const newPathResult = findNextValidPosition(creep, path, options.maxPathDistance || 3);
        if (!newPathResult) {
            logger.log(`Still no valid position found for ${creep.name} with new path`);
            return null;
        }
        pathResult = newPathResult;
    }

    return {
        creep,
        targetPos: pathResult.nextPos,
        priority: options.priority || 1,
        goalPos: targetPos,
        path,
        currentPathIndex: pathResult.currentIndex,
        pullCreep: options.pull,
        lookAheadPos: pathResult.lookAheadPos // Make sure we pass this through
    };
}

function isInCycle(positions: WorldPosition[]): boolean {
    if (positions.length < POSITION_HISTORY_LENGTH) {
        return false;
    }

    // Check if we're oscillating between positions
    const uniquePositions = new Set(positions.map(p => p.toString()));
    if (uniquePositions.size <= 2) {
        return true;
    }

    // Check for longer cycles
    const lastPos = positions[positions.length - 1];
    const occurrences = positions.filter(p => p.isEqualTo(lastPos)).length;

    // If we've been in the same position more than twice in our history,
    // we're probably in a cycle
    return occurrences >= 3;
}
