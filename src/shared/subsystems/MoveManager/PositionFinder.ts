import { MoveIntent } from "./types";
import WorldPosition from "shared/utils/map/WorldPosition";
import Logger from "shared/utils/logger";
import visual from "shared/utils/visual";

const logger = new Logger("MoveManager");

interface PositionScore {
    pos: WorldPosition;
    score: number;
}

export function findAlternatePosition(
    intent: MoveIntent,
    occupiedPositions: Set<string>,
    isOnPath: boolean,
    currentPos: WorldPosition
): WorldPosition | null {
    // Get all possible positions, including current position
    const possiblePositions = [
        currentPos,
        ...currentPos.getPositionsInRange(1)
    ].filter(pos => !occupiedPositions.has(pos.toString()));

    if (possiblePositions.length === 0) {
        return null;
    }

    // Score all positions
    const scoredPositions: PositionScore[] = possiblePositions
        .map(pos => ({
            pos,
            score: scorePosition(pos, intent, isOnPath, pos.isEqualTo(currentPos))
        }))
        .filter(scored => scored.score !== -1);

    // Find max score for normalization
    const maxScore = Math.max(...scoredPositions.map(p => p.score));

    // Visualize all scored positions
    scoredPositions.forEach(scored => {
        const normalizedScore = scored.score / maxScore;
        const roomPos = scored.pos.toRoomPosition();

        // Draw circle with opacity based on score
        visual.circle(
            roomPos,
            intent.creep.getColor?.() || '#ffffff',
            normalizedScore,
            0.3
        );

        // Draw the score as text
        visual.drawText(
            scored.score.toFixed(0),
            roomPos,
            intent.creep.getColor?.() || '#ffffff',
            { opacity: normalizedScore }
        );
    });

    // Sort and return best position
    scoredPositions.sort((a, b) => b.score - a.score);
    return scoredPositions.length > 0 ? scoredPositions[0].pos : null;
}

function scorePosition(
    pos: WorldPosition,
    intent: MoveIntent,
    isOnPath: boolean,
    isCurrentPos: boolean
): number {
    const roomPos = pos.toRoomPosition();
    const terrain = Game.map.getRoomTerrain(roomPos.roomName);
    const terrainType = terrain.get(roomPos.x, roomPos.y);

    // Check if position is walkable
    if (terrainType === TERRAIN_MASK_WALL || pos.isBlocked()) {
        return -1;
    }

    let score = 1000; // Base score

    // Path progress scoring
    if (intent.path && intent.currentPathIndex !== undefined) {
        // Look ahead on the path (up to 3 positions)
        const lookAheadIndex = Math.min(intent.currentPathIndex + 3, intent.path.length - 1);
        const pathTarget = intent.path[lookAheadIndex];

        // Score based on progress toward the look-ahead point
        const distanceToPathTarget = pos.getRangeTo(pathTarget);
        score -= distanceToPathTarget * 100; // Heavy penalty for being far from path target

        // Bonus for moving along the path
        if (lookAheadIndex > intent.currentPathIndex) {
            const progressMade = intent.path[intent.currentPathIndex].getRangeTo(pos);
            score += (1 / progressMade) * 50; // Bonus for making progress along path
        }
    }

    // Terrain cost scoring
    if (terrainType === TERRAIN_MASK_SWAMP) {
        const swampCost = intent.creep.getCost("swamp");
        if (swampCost === Infinity) return -1;
        score -= swampCost * 10;
    } else {
        const plainCost = intent.creep.getCost("plain");
        if (plainCost === Infinity) return -1;
        score -= plainCost * 10;
    }

    // Road bonus
    const structures = pos.toRoomPosition().lookFor(LOOK_STRUCTURES);
    if (structures.some(s => s.structureType === STRUCTURE_ROAD)) {
        score += 100;
    }

    // Path adherence penalty
    if (isOnPath) {
        score -= 200; // Significant penalty for leaving the path
    }



    return score;
}
