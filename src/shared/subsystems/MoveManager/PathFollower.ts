import WorldPosition from "shared/utils/map/WorldPosition";
import { getCreepPathIndex, setCreepPathIndex } from "./Requests";
import Logger from "shared/utils/logger";

const logger = new Logger("MoveManager");

interface PathFollowResult {
    nextPos: WorldPosition;
    lookAheadPos: WorldPosition;
    currentIndex: number;
    needsNewPath: boolean;
}

export function findNextValidPosition(
    creep: Creep,
    path: WorldPosition[],
    maxPathDistance: number
): PathFollowResult | null {
    logger.log(`PathFollower: Finding next position for ${creep.name}`);
    logger.log(`Current position: ${creep.pos}`);
    logger.log(`Path length: ${path.length}`);
    logger.log(`Max path distance: ${maxPathDistance}`);

    const creepPos = creep.pos.toWorldPosition();

    // Start searching from the creep's last known path index
    let startIndex = getCreepPathIndex(creep.id);
    logger.log(`Starting search from index: ${startIndex}`);

    // Validate startIndex
    if (startIndex >= path.length) {
        logger.log(`Invalid start index, resetting to 0`);
        startIndex = 0;
    }

    // Find the closest point on the path, starting from the last known index
    let closestPathIndex = startIndex;
    let minDistance = creepPos.getRangeTo(path[startIndex]);

    logger.log(`Initial distance to path: ${minDistance}`);

    // Look ahead up to 5 positions to find a better spot
    const searchEnd = Math.min(startIndex + 5, path.length);
    for (let i = startIndex; i < searchEnd; i++) {
        const distance = creepPos.getRangeTo(path[i]);
        logger.log(`Distance to path[${i}]: ${distance}`);
        if (distance < minDistance) {
            minDistance = distance;
            closestPathIndex = i;
            logger.log(`New closest index: ${i} with distance: ${distance}`);
        }
    }

    // If we're too far from the path, signal for recalculation
    if (minDistance > maxPathDistance) {
        logger.log(`Too far from path (${minDistance} > ${maxPathDistance}), need new path`);
        return {
            nextPos: path[closestPathIndex],
            lookAheadPos: path[Math.min(closestPathIndex + 2, path.length - 1)],
            currentIndex: closestPathIndex,
            needsNewPath: true
        };
    }

    // If we're at the same position for multiple ticks and not at the end, we might be stuck
    const lastPos = creepPos.toString();
    const lastIndex = startIndex;
    if (lastPos === path[lastIndex]?.toString() && lastIndex < path.length - 1) {
        logger.log(`Potentially stuck at ${lastPos}, trying to find alternate route`);
        // Try to move to a position that makes progress
        for (let i = lastIndex + 1; i < Math.min(lastIndex + 3, path.length); i++) {
            if (creepPos.getRangeTo(path[i]) <= 1) {
                closestPathIndex = i;
                logger.log(`Found alternate route through index ${i}`);
                break;
            }
        }
    }

    // Update the path index
    setCreepPathIndex(creep.id, closestPathIndex);

    // Get the next immediate position and a look-ahead position
    const nextIndex = closestPathIndex;
    const lookAheadIndex = Math.min(closestPathIndex + 2, path.length - 1);

    if (nextIndex < path.length) {
        logger.log(`Returning next position at index ${nextIndex}: ${path[nextIndex]}`);
        logger.log(`Look ahead position at index ${lookAheadIndex}: ${path[lookAheadIndex]}`);
        return {
            nextPos: path[nextIndex],
            lookAheadPos: path[lookAheadIndex],
            currentIndex: closestPathIndex,
            needsNewPath: false
        };
    }

    // If we're at the end of the path
    logger.log(`At end of path, returning last position: ${path[path.length - 1]}`);
    return {
        nextPos: path[path.length - 1],
        lookAheadPos: path[path.length - 1],
        currentIndex: path.length - 1,
        needsNewPath: false
    };
}
