import { MoveIntent } from "./types";
import { findAlternatePosition } from "./PositionFinder";
import { executeMove } from "./MovementExecutor";
import Logger from "shared/utils/logger";
import WorldPosition from "shared/utils/map/WorldPosition";
import visual from "shared/utils/visual";

const logger = new Logger("MoveManager");

interface CreepMoveScore {
    intent: MoveIntent;
    score: number;
}

function calculateMoveCost(creep: Creep, pos: WorldPosition): number {
    const terrain = Game.map.getRoomTerrain(pos.roomName);
    const terrainType = terrain.get(pos.x, pos.y);

    // Check for roads
    const structures = pos.toRoomPosition().lookFor(LOOK_STRUCTURES);
    const hasRoad = structures.some(s => s.structureType === STRUCTURE_ROAD);

    if (hasRoad) {
        return creep.getCost("road");
    } else if (terrainType === TERRAIN_MASK_SWAMP) {
        return creep.getCost("swamp");
    } else {
        return creep.getCost("plain");
    }
}

function getMovementDirection(from: WorldPosition, to: WorldPosition): { dx: number; dy: number } {
    return {
        dx: Math.sign(to.x - from.x),
        dy: Math.sign(to.y - from.y)
    };
}

function areMovingInOppositeDirections(intent1: MoveIntent, intent2: MoveIntent): boolean {
    const dir1 = getMovementDirection(intent1.creep.pos.toWorldPosition(), intent1.goalPos);
    const dir2 = getMovementDirection(intent2.creep.pos.toWorldPosition(), intent2.goalPos);

    return (dir1.dx * dir2.dx + dir1.dy * dir2.dy) < 0;
}

function scoreIntent(intent: MoveIntent, allIntents: MoveIntent[]): number {
    let score = 10000; // Base score - we'll subtract costs from this

    // Calculate base movement cost
    const moveCost = calculateMoveCost(intent.creep, intent.targetPos);
    score -= moveCost * 100; // Heavy weight on movement cost

    // Add traffic congestion costs
    for (const other of allIntents) {
        if (other.creep.id === intent.creep.id) continue;

        // Check if creeps are moving to adjacent squares
        if (intent.targetPos.getRangeTo(other.targetPos) <= 1) {
            // Calculate how many ticks we might have to wait
            const otherCreepCost = calculateMoveCost(other.creep, other.targetPos);
            score -= otherCreepCost * 50; // Penalty for nearby slow creeps
        }

        // Extra penalty for creeps moving in opposite directions
        if (intent.creep.pos.toWorldPosition().getRangeTo(other.creep.pos.toWorldPosition()) <= 2) {
            const myDir = {
                dx: intent.targetPos.x - intent.creep.pos.x,
                dy: intent.targetPos.y - intent.creep.pos.y
            };
            const otherDir = {
                dx: other.targetPos.x - other.creep.pos.x,
                dy: other.targetPos.y - other.creep.pos.y
            };

            // If moving in opposite directions
            if ((myDir.dx * otherDir.dx + myDir.dy * otherDir.dy) < 0) {
                score -= 500; // Significant penalty for opposing traffic
            }
        }
    }

    // Progress bonus - encourage following the path
    if (intent.path && intent.currentPathIndex !== undefined) {
        const progressPercent = intent.currentPathIndex / intent.path.length;
        score += progressPercent * 1000; // Bonus for being further along path
    }

    // Fatigue penalty - if creep is already tired, it will take longer to move
    if (intent.creep.fatigue > 0) {
        score -= intent.creep.fatigue * 10000;
    }

    // // Staying still bonus - sometimes it's better to wait
    // if (intent.targetPos.isEqualTo(intent.creep.pos.toWorldPosition())) {
    //     // Only apply stay-still bonus if we're not blocking other creeps
    //     let isBlocking = false;
    //     for (const other of allIntents) {
    //         if (other.creep.id === intent.creep.id) continue;
    //         if (intent.targetPos.isEqualTo(other.targetPos)) {
    //             isBlocking = true;
    //             break;
    //         }
    //     }
    //     if (!isBlocking) {
    //         score += 200; // Bonus for not moving if we're not in the way
    //     }
    // }

    return score;
}

export function executeNonConflictingMoves(intents: Map<string, MoveIntent>): {
    remainingIntents: Map<string, MoveIntent>;
    occupiedPositions: Set<string>;
} {
    const remainingIntents = new Map(intents);
    const positionConflicts = buildPositionConflicts(intents);
    const occupiedPositions = new Set<string>();
    const pullMoves = new Map<string, PullMove>();
    const stayingStill = new Set<string>();

    // Visualize all intended positions first
    for (const intent of intents.values()) {
        visual.circle(
            intent.targetPos.toRoomPosition(),
            intent.creep.getColor?.() || '#ffffff',
            0.3,
            0.3
        );
    }

    logger.log("MovementResolver: Starting execution with", intents.size, "intents");

    // First, mark positions of fatigued creeps as occupied
    for (const intent of intents.values()) {
        if (intent.creep.fatigue > 0) {
            logger.log(`${intent.creep.name} is fatigued, marking position as occupied`);
            const pos = intent.creep.pos.toWorldPosition();
            occupiedPositions.add(pos.toString());
            stayingStill.add(intent.creep.id);
            remainingIntents.delete(intent.creep.id);
            // Visualize fatigued creep position
            visual.circle(pos.toRoomPosition(), '#ff0000', 0.7, 0.3);
        }
    }

    // Score and sort remaining intents
    const allIntentsArray = Array.from(remainingIntents.values());
    const scoredIntents: CreepMoveScore[] = allIntentsArray
        .map(intent => ({
            intent,
            score: scoreIntent(intent, allIntentsArray)
        }))
        .sort((a, b) => b.score - a.score);

    // Process intents in priority order
    for (const { intent, score } of scoredIntents) {
        if (pullMoves.has(intent.creep.id) || stayingStill.has(intent.creep.id)) {
            continue;
        }

        const posKey = intent.targetPos.toString();
        const currentPosKey = intent.creep.pos.toWorldPosition().toString();
        logger.log(`Checking move for ${intent.creep.name} to ${posKey} (score: ${score})`);

        // If creep is already at its target position
        if (currentPosKey === posKey) {
            logger.log(`${intent.creep.name} is already at target position`);
            // Only stay if no other creep needs this position
            if (!positionConflicts.has(posKey) || positionConflicts.get(posKey)?.length === 1) {
                logger.log(`${intent.creep.name} can stay at current position`);
                stayingStill.add(intent.creep.id);
                occupiedPositions.add(currentPosKey);
                remainingIntents.delete(intent.creep.id);
                // Visualize staying position with solid circle
                visual.circle(intent.creep.pos, intent.creep.getColor?.() || '#00ff00', 1, 0.5);
                continue;
            }
        }

        // Check if target position is blocked
        if (occupiedPositions.has(posKey)) {
            logger.log(`Position ${posKey} is blocked, looking for alternatives for ${intent.creep.name}`);
            const alternatives = intent.creep.pos.toWorldPosition().getPositionsInRange(1)
                .filter(pos => !occupiedPositions.has(pos.toString()))
                .map(pos => ({
                    pos,
                    score: scoreAlternativePosition(pos, intent, intent.creep)
                }))
                .sort((a, b) => b.score - a.score);

            if (alternatives.length > 0) {
                const bestAlt = alternatives[0].pos;
                logger.log(`Found alternative position for ${intent.creep.name}: ${bestAlt} (score: ${alternatives[0].score})`);
                const result = executeMove(intent.creep, bestAlt);
                logger.log(`Move result for ${intent.creep.name} to alternative: ${result}`);
                if (result === OK) {
                    remainingIntents.delete(intent.creep.id);
                    occupiedPositions.add(bestAlt.toString());
                    // Visualize alternative move
                    visual.circle(bestAlt.toRoomPosition(), intent.creep.getColor?.() || '#ffff00', 1, 0.5);
                } else {
                    logger.log(`Failed to move ${intent.creep.name} to alternative position`);
                    stayingStill.add(intent.creep.id);
                    occupiedPositions.add(currentPosKey);
                    // Visualize failed move position
                    visual.circle(intent.creep.pos, '#ff0000', 1, 0.5);
                }
            } else {
                logger.log(`No alternative positions found for ${intent.creep.name}, staying still`);
                stayingStill.add(intent.creep.id);
                occupiedPositions.add(currentPosKey);
                // Visualize forced stay position
                visual.circle(intent.creep.pos, '#ff0000', 1, 0.5);
            }
            continue;
        }

        // Try original position if not blocked
        const result = executeMove(intent.creep, intent.targetPos);
        logger.log(`Move result for ${intent.creep.name}: ${result}`);
        if (result === OK) {
            remainingIntents.delete(intent.creep.id);
            occupiedPositions.add(intent.targetPos.toString());
            // Visualize successful move
            visual.circle(intent.targetPos.toRoomPosition(), intent.creep.getColor?.() || '#00ff00', 1, 0.5);
        } else {
            logger.log(`Failed to move ${intent.creep.name}, staying still`);
            stayingStill.add(intent.creep.id);
            occupiedPositions.add(currentPosKey);
            // Visualize failed move
            visual.circle(intent.creep.pos, '#ff0000', 1, 0.5);
        }
    }

    // Visualize final positions for any remaining creeps
    for (const creepId of stayingStill) {
        const creep = Game.getObjectById(creepId as Id<Creep>);
        if (creep) {
            visual.circle(creep.pos, creep.getColor?.() || '#ffffff', 1, 0.5);
        }
    }

    return { remainingIntents, occupiedPositions };
}

function findBestPosition(
    intent: MoveIntent,
    occupiedPositions: Set<string>,
    isOnPath: boolean,
    currentPos: WorldPosition
): WorldPosition | null {
    // Try original target position first if not occupied
    if (!occupiedPositions.has(intent.targetPos.toString())) {
        return intent.targetPos;
    }

    // Find best alternate position, including current position as an option
    return findAlternatePosition(intent, occupiedPositions, isOnPath, currentPos);
}

interface PullMove {
    puller: Creep;
    pulled: Creep;
    pullerPos: WorldPosition;
}

function buildPositionConflicts(intents: Map<string, MoveIntent>): Map<string, Creep[]> {
    const conflicts = new Map<string, Creep[]>();

    for (const intent of intents.values()) {
        const posKey = intent.targetPos.toString();
        const creeps = conflicts.get(posKey) || [];
        creeps.push(intent.creep);
        conflicts.set(posKey, creeps);
    }

    return conflicts;
}

export function resolveConflicts(
    intents: Map<string, MoveIntent>,
    occupiedPositions: Set<string>
) {
    // Sort remaining moves by priority
    const sortedIntents = Array.from(intents.values())
        .sort((a, b) => b.priority - a.priority);

    for (const intent of sortedIntents) {
        const bestPos = findBestPosition(intent, occupiedPositions, false, intent.creep.pos.toWorldPosition());
        if (bestPos) {
            // if (true) { // Debug flag
            //     new RoomVisual(intent.creep.room.name).line(
            //         intent.creep.pos,
            //         bestPos.toRoomPosition(),
            //         { color: intent.pullCreep ? '#ff0000' : '#00ff00', lineStyle: 'dashed' }
            //     );
            // }
            executeMove(intent.creep, bestPos);
            occupiedPositions.add(bestPos.toString());
        }
    }
}

function isPositionViable(creep: Creep, pos: WorldPosition): boolean {
    const roomPos = pos.toRoomPosition();
    const terrain = Game.map.getRoomTerrain(roomPos.roomName);
    const terrainType = terrain.get(roomPos.x, roomPos.y);

    if (terrainType === TERRAIN_MASK_WALL || pos.isBlocked()) {
        return false;
    }

    const swampCost = creep.getCost("swamp");
    const plainCost = creep.getCost("plain");

    if (terrainType === TERRAIN_MASK_SWAMP && swampCost === Infinity) {
        return false;
    }
    if (terrainType === 0 && plainCost === Infinity) {
        return false;
    }

    return true;
}

function scoreAlternativePosition(
    pos: WorldPosition,
    intent: MoveIntent,
    creep: Creep
): number {
    let score = 1000;

    // Base movement cost
    const moveCost = calculateMoveCost(creep, pos);
    score -= moveCost * 100;

    // Progress toward goal
    if (intent.lookAheadPos) {
        const distanceToLookAhead = pos.getRangeTo(intent.lookAheadPos);
        score -= distanceToLookAhead * 200; // Heavy penalty for moving away from path
    }

    // Bonus for positions closer to target
    const currentDistanceToGoal = creep.pos.toWorldPosition().getRangeTo(intent.goalPos);
    const newDistanceToGoal = pos.getRangeTo(intent.goalPos);
    if (newDistanceToGoal < currentDistanceToGoal) {
        score += 300; // Significant bonus for getting closer to goal
    }

    return score;
}
