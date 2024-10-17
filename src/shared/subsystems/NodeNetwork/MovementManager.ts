import { MovableObject } from "./NodeNetworkTypes";
import WorldPosition, { getAdjacentDirections } from "shared/utils/map/WorldPosition";
import Node from "./node";
import Logger from "shared/utils/logger";
import { builtInQueues, queueMicroTask } from "shared/polyfills/tasks";
import CachedPath from "./cachedPath";
import visual from "shared/utils/visual";
import { setTimeout } from "shared/polyfills/setTimeout";
import queues from "world_new/queues";
import { setInterval } from "shared/polyfills/setInterval";

const logger = new Logger("MovementManager");


setInterval(() => {
    movementManager.resolveMovements()
}, 1, queues.MOVEMENT, true)
setInterval(() => {
    movementManager.clearRequestsAndDesiredPositions()
}, 1, builtInQueues.START_TICK, true)

// Define interfaces for better type checking and readability
interface BaseMovementRequest {
    /**
     * The creep that wants to move
     */
    creep: MovableObject;

    /**
     * The position the creep wants to move towards
     * If following a path, this is a position on the path a few steps ahead of the current position, used to judge fallback positions
     * If not following a path, this is the position the creep wants to stay near, no moves taking it outside of goalRange are allowed
     */
    goalPos: WorldPosition;
    /**
     * How close the creep needs to stay to the goal pos
     */
    goalRange: number;
    /**
     * The priority of the movement request
     */
    priority: number;
}

interface MovingMovementRequest extends BaseMovementRequest {
    /**
     * The current position on the path the creep is moving towards, may not be the same as the creep's current position
     * Only used when following a path
     */
    currentPathPos: WorldPosition;
    /**
     * The next position on the path the creep is moving towards, the direction to it from the current position is the desired direction
     * Only used when following a path
     */
    nextPathPos: WorldPosition | undefined;
    /**
     * How far off the path the creep is allowed to go.
     * Only used when following a path
     */
    pathRange: number;
}

interface StandingMovementRequest extends BaseMovementRequest {

}

interface StandingMovementRequestInfo extends StandingMovementRequest {
    creepPos: WorldPosition;
    prefferedPosition: WorldPosition;
}
interface MovingMovementRequestInfo extends MovingMovementRequest {
    creepPos: WorldPosition;
    prefferedDirection: DirectionConstant;
    prefferedPosition: WorldPosition;
    pathDistance: number;
}

type MovementRequest = MovingMovementRequest | StandingMovementRequest;
type MovementRequestInfo = MovingMovementRequestInfo | StandingMovementRequestInfo;



export class MovementManager {
    private movementRequests: MovementRequestInfo[] = [];
    private takenPositions: Set<string> = new Set();
    private preferredPositions: Map<string, number> = new Map();
    private hasConflicts: boolean = false;
    private stuckCreeps: Map<string, number> = new Map();

    /**
     * Register a movement request for a creep
     * @param request The movement request details
     */
    registerMovement(request: MovementRequest) {
        // logger.log(`Registering movement for ${request.creep.name}`);

        // Validate input
        if (!this.isValidWorldPosition(request.goalPos) || !this.isValidWorldPosition(request.creep.pos.toWorldPosition())) {
            logger.error(`Invalid position for ${request.creep.name}`);
            return;
        }

        if (request.creep.fatigue > 0) {
            // Creep is fatigued, cannot move
            // logger.log(`${request.creep.name} is fatigued and cannot move this tick.`);
            this.takenPositions.add(request.creep.pos.toWorldPosition().serialize());
            let count = this.preferredPositions.get(request.creep.pos.toWorldPosition().serialize()) || 0;
            count++;
            this.preferredPositions.set(request.creep.pos.toWorldPosition().serialize(), count);
            if (count > 1) {
                this.hasConflicts = true;
            }
            request.creep.say("🛌")
            return;
        }

        this.movementRequests.push(request as MovementRequestInfo);
        this.updatePreferredPositions(request as MovementRequestInfo);
        // logger.log(`Registered movement for ${request.creep.name} from ${request.creep.pos.toWorldPosition().serialize()} to ${request.goalPos.serialize()}`);
    }
    private updatePreferredPositions(request: MovementRequestInfo) {

        request.creepPos = request.creep.pos.toWorldPosition();

        if ("currentPathPos" in request) {
            // creep is following a path
            let desiredDir;
            if (request.nextPathPos && !request.currentPathPos.isEqualTo(request.nextPathPos)) {
                desiredDir = request.currentPathPos.getDirectionTo(request.nextPathPos);
            } else {
                desiredDir = request.creepPos.getDirectionTo(request.goalPos);
            }
            request.prefferedDirection = desiredDir;
            request.prefferedPosition = request.creepPos.moveInDir(desiredDir);
            request.pathDistance = request.creepPos.getRangeTo(request.currentPathPos);
            if (request.pathDistance > 0) {
                this.hasConflicts = true;
            }
            const desiredPos = request.prefferedPosition.serialize();
            let count = this.preferredPositions.get(desiredPos) || 0;
            count++;
            this.preferredPositions.set(desiredPos, count);
            if (count > 1) {
                this.hasConflicts = true;
            }
        } else {
            // creep is standing still
            request.creepPos = request.creep.pos.toWorldPosition();
            request.prefferedPosition = request.creepPos;
            const currentPos = request.prefferedPosition.serialize();
            let count = this.preferredPositions.get(currentPos) || 0;
            count++;
            this.preferredPositions.set(currentPos, count);
            if (count > 1) {
                this.hasConflicts = true;
            }
        }
    }
    /**
     * Resolve all registered movement requests
     */
    resolveMovements() {
        logger.log(`Resolving ${this.movementRequests.length} movement requests`);
        // try {
            if (!this.hasConflicts) {
                this.resolveNonConflictingMovements();
            } else {
                this.resolveConflictingMovements();
            }
        // } catch (e) {
        //     logger.error("Error resolving movements", e)
        // }
    }

    private resolveNonConflictingMovements() {
        const creepMoves: Map<string, DirectionConstant> = new Map();

        for (const request of this.movementRequests) {
            if ("prefferedDirection" in request) {
                creepMoves.set(request.creep.name, request.prefferedDirection);
            }
        }

        this.executeMoves(creepMoves);
    }

    private resolveConflictingMovements() {
        const occupiedPositions: Set<string> = new Set();
        const creepMoves: Map<string, DirectionConstant> = new Map();

        this.handleNonConflictingMovements(creepMoves, occupiedPositions);

        // Sort requests by priority
        this.sortMovementRequests();


        for (const request of this.movementRequests) {
            if (!request) {
                continue; // move is already processed
            }
            const move = this.processMovementRequest(request, occupiedPositions, creepMoves);
        }

        // Execute moves
        this.executeMoves(creepMoves);

        // Visualize occupied positions
        this.visualizeOccupiedPositions(occupiedPositions);
    }

    private handleNonConflictingMovements(creepMoves: Map<string, DirectionConstant>, occupiedPositions: Set<string>) {
        for (const r in this.movementRequests) {
            const request = this.movementRequests[r];
            if (request.prefferedPosition &&
                this.preferredPositions.get(request.prefferedPosition.serialize()) == 1 &&
                (!("pathDistance" in request) || request.pathDistance == 0) &&
                !occupiedPositions.has(request.prefferedPosition.serialize()) &&
                !request.prefferedPosition.isBlocked()
            ) {
                if ("prefferedDirection" in request) {
                    creepMoves.set(request.creep.name, request.prefferedDirection);
                }
                occupiedPositions.add(request.prefferedPosition.serialize());
                delete this.movementRequests[r];
            }
        }
    }

    private processMovementRequest(
        request: MovementRequestInfo,
        occupiedPositions: Set<string>,
        creepMoves: Map<string, DirectionConstant>
    ): DirectionConstant | null | 0 {
        logger.log(
            `Processing movement for ${request.creep.name}`,
            request.prefferedPosition?.serialize(),
            this.preferredPositions.get(request.prefferedPosition?.serialize() || "")
        );
        // If the creep has a preferred position and it is not conflicted, move to it
        if (
            request.prefferedPosition &&
            this.preferredPositions.get(request.prefferedPosition.serialize()) == 1 &&
            (!("pathDistance" in request) || request.pathDistance == 0) &&
            !occupiedPositions.has(request.prefferedPosition.serialize()) &&
            !request.prefferedPosition.isBlocked()
        ) {
            logger.log(`${request.creep.name} has a preferred position and it is not conflicted`);
            occupiedPositions.add(request.prefferedPosition.serialize());
            if ("prefferedDirection" in request) {
                creepMoves.set(request.creep.name, request.prefferedDirection);
                return request.prefferedDirection;
            }
            return 0;
        }

        // Now we know the creep has a conflicting preferred position
        // Try to find a helpful move
        if ("currentPathPos" in request) {
            logger.log(`${request.creep.name} is following a path`);
            const helpfulMoves = this.findHelpfulMoves(
                request,
                request.prefferedDirection,
                request.goalPos,
                request.goalRange,
                occupiedPositions
            );
            if (helpfulMoves.length > 0) {
                const move = this.getBestMove(helpfulMoves, request, true, occupiedPositions);
                if (move) {
                    creepMoves.set(request.creep.name, move);
                    // **Add the new position to the occupied positions set**
                    const newPos = request.creepPos.moveInDir(move);
                    occupiedPositions.add(newPos.serialize());
                    return move;
                }
            }
        }

        // either the creep is not following a path, or no helpful moves were found
        // try to find a valid move
        logger.log(`${request.creep.name} path is bad, or is staying still, or is stuck`);
        const alternativeMoves = this.findAlternativeMoves(
            request,
            request.goalPos,
            request.goalRange,
            occupiedPositions
        );
        if (alternativeMoves.length > 0) {
            const move = this.getBestMove(alternativeMoves, request, false, occupiedPositions);
            if (move) {
                creepMoves.set(request.creep.name, move);
                // **Add the new position to the occupied positions set**
                const newPos = request.creepPos.moveInDir(move);
                occupiedPositions.add(newPos.serialize());
                return move;
            }
        }

        // If no valid moves, stay in place
        logger.log(`${request.creep.name} staying in place, no valid moves`);
        occupiedPositions.add(request.creepPos.serialize());
        this.handleStuckCreep(request.creep);
        return null;
    }

    /**
     * Sort movement requests by priority
     */
    private sortMovementRequests() {
        this.movementRequests.sort((a, b) => {
            if (a.creep.fatigue > 0 || b.creep.fatigue > 0) {
                return b.creep.fatigue - a.creep.fatigue;
            } else if (!("currentPathPos" in b) || !("currentPathPos" in a)) {
                return "currentPathPos" in a ? 1 : -1;
            } else if (b.priority !== a.priority) {
                return b.priority - a.priority;
            } else if (b.creep.getWeight() !== a.creep.getWeight()) {
                return b.creep.getWeight() - a.creep.getWeight();
            }
            //if all else is equal, sort by distance to goal
            return a.creep.pos.toWorldPosition().getRangeTo(a.goalPos) - b.creep.pos.toWorldPosition().getRangeTo(b.goalPos);
        });
    }

    /**
     * Find the best move for a given request
     * @param request The movement request
     * @param occupiedPositions Set of occupied positions
     * @returns The best move direction or null if no valid move
     */
    private findBestMove(request: MovementRequestInfo, occupiedPositions: Set<string>): DirectionConstant | null {

        if ("nextPathPos" in request && request.prefferedDirection) {
            const helpfulMoves = this.findHelpfulMoves(request, request.prefferedDirection, request.goalPos, request.goalRange, occupiedPositions);
            logger.log(`Found ${helpfulMoves.length} helpful moves for ${request.currentPathPos?.serialize()}: ${helpfulMoves.join(', ')}`);
            if (helpfulMoves.length > 0) {
                return this.getBestMove(helpfulMoves, request, true, occupiedPositions);
            }
        }

        // If no helpful moves, try alternative moves
        const alternativeMoves = this.findAlternativeMoves(request, request.goalPos, request.goalRange, occupiedPositions);
        if (alternativeMoves.length > 0) {
            return this.getBestMove(alternativeMoves, request, false, occupiedPositions);
        }

        return null;
    }

    private findHelpfulMoves(request: MovingMovementRequest, requestedDirection: DirectionConstant, goalPos: WorldPosition, goalRange: number, occupiedPositions: Set<string>): DirectionConstant[] {
        const validMoves: DirectionConstant[] = [];
        const directions: DirectionConstant[] = getAdjacentDirections(requestedDirection);
        const creepPos = request.creep.pos.toWorldPosition();
        let currentRange = request.currentPathPos.getRangeTo(goalPos);
        if (currentRange < goalRange) {
            currentRange = goalRange;
        }

        for (const direction of directions) {
            const newPos = creepPos.moveInDir(direction);
            logger.log(request.creep.name, "looking at move", newPos.serialize(), "range to goal", newPos.getRangeTo(goalPos), "occupied", occupiedPositions.has(newPos.serialize()), "blocked", newPos.isBlocked(), "current range", currentRange, "path range", request.pathRange);

            if (!occupiedPositions.has(newPos.serialize()) &&
                newPos.getRangeTo(goalPos) <= currentRange &&
                !newPos.isBlocked()
            ) {
                validMoves.push(direction);
            }
        }

        logger.log(`Found ${validMoves.length} helpful moves for position ${request.currentPathPos.serialize()}`);
        return validMoves;
    }

    private findAlternativeMoves(
        request: MovementRequest,
        goalPos: WorldPosition,
        goalRange: number,
        occupiedPositions: Set<string>
    ): DirectionConstant[] {
        const validMoves: DirectionConstant[] = [];
        const directions: DirectionConstant[] = [TOP, TOP_RIGHT, RIGHT, BOTTOM_RIGHT, BOTTOM, BOTTOM_LEFT, LEFT, TOP_LEFT];
        const creepPos = request.creep.pos.toWorldPosition();
        let currentRange = creepPos.getRangeTo(goalPos);
        if (currentRange < goalRange) {
            currentRange = goalRange;
        }

        for (const direction of directions) {
            const newPos = creepPos.moveInDir(direction);
            let pathPos = creepPos;
            if ("nextPathPos" in request && request.nextPathPos) {
                pathPos = request.nextPathPos;
            } else if ("currentPathPos" in request && request.currentPathPos) {
                pathPos = request.currentPathPos;
            }
            logger.log(pathPos.serialize(), goalPos.serialize(), `Checking move ${direction} to ${newPos.serialize()}, range to goal ${newPos.getRangeTo(goalPos)}`, "occupied", occupiedPositions.has(newPos.serialize()), "blocked", newPos.isBlocked(), "current range", currentRange, "path range", (("pathRange" in request) ? request.pathRange : request.goalRange), "range to path", newPos.getRangeTo(pathPos));
            if (newPos.getRangeTo(goalPos) <= currentRange &&
                !newPos.isBlocked()
            ) {
                validMoves.push(direction);
            }
        }

        logger.log(`Found ${validMoves.length} alternative moves for position ${creepPos.serialize()}`);
        return validMoves;
    }

    private getBestMove(moves: DirectionConstant[],
        request: MovementRequestInfo,
        onlyUseful: boolean = false,
        occupiedPositions: Set<string>): DirectionConstant | null {
        const { creep, goalPos } = request;
        const weight = creep.getWeight();
        const creepPos = creep.pos.toWorldPosition();
        let bestMove: DirectionConstant | null = null;
        let bestScore = Infinity;
        //randomize moves
        // moves.sort(() => Math.random() - 0.5);
        for (const move of moves) {
            let pathPos = creepPos;
            if ("nextPathPos" in request && request.nextPathPos) {
                pathPos = request.nextPathPos;
            } else if ("currentPathPos" in request && request.currentPathPos) {
                pathPos = request.currentPathPos;
            }
            let score: number = this.scoreMove(creepPos, move, creep, goalPos, pathPos, request, occupiedPositions);

            if (score < bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        logger.log(`Best move from ${("currentPathPos" in request) ? request.currentPathPos?.serialize() : request.creep.pos.toWorldPosition().serialize()} to ${goalPos.serialize()} is ${bestMove} with score ${bestScore}`);
        //if no best move, return random move
        if (onlyUseful) {
            return bestMove;
        }
        return bestMove || moves[Math.floor(Math.random() * moves.length)];
    }

    private scoreMove(creepPos: WorldPosition, move: number, creep: Creep, goalPos: WorldPosition, pathPos: WorldPosition, request: MovementRequestInfo, occupiedPositions: Set<string>) {
        const newPos = creepPos.moveInDir(move);
        if (!Game.rooms[newPos.roomName] || newPos.roomName != creep.room.name) {
            return 1;
        }
        const terrain = Game.map.getRoomTerrain(newPos.roomName);
        const terrainMask = terrain.get(newPos.x, newPos.y);

        // Check if the new position is a road
        const structures = newPos.toRoomPosition().lookFor(LOOK_STRUCTURES);
        const isRoad = structures.some(s => s.structureType === STRUCTURE_ROAD);
        let terrainType;
        switch (true) {
            case isRoad: terrainType = "road"; break;
            case terrainMask == TERRAIN_MASK_SWAMP: terrainType = "swamp"; break;
            case terrainMask == TERRAIN_MASK_WALL: terrainType = "wall"; break;
            default: terrainType = "plain"; break;
        }
        // Calculate move cost based on terrain and creep weight
        // logger.log("wtf", weight, creep.getCost(terrainType));
        const moveCost = creep.getCost(terrainType);

        // Calculate distance to goal
        const distanceToGoal = newPos.getRangeTo(goalPos);
        const currentDistance = creepPos.getRangeTo(goalPos);
        const distanceDelta = currentDistance - distanceToGoal;
        const rangeToCurrent = newPos.getRangeTo(pathPos);
        logger.log("looking at move", newPos.serialize(), "range to current", rangeToCurrent, "distance delta", distanceDelta, "move cost", moveCost, "current distance", currentDistance);
        // Calculate score (lower is better)
        let baseScore = -distanceDelta;
        let score: number;
        if (rangeToCurrent > (("pathRange" in request) ? request.pathRange : request.goalRange)) {
            baseScore += 5;
        }
        if (occupiedPositions.has(newPos.serialize())) {
            score = baseScore + 2 + rangeToCurrent;
        } else if (moveCost == 0) {
            score = baseScore + rangeToCurrent;
            if (isRoad) {
                score += 1; // penalty for moving on roads when empty
            }
        } else {
            score = baseScore + moveCost + rangeToCurrent;
        }

        if (newPos.isEqualTo(request.prefferedPosition)) {
            score -= 1;
        }
        if (occupiedPositions.has(newPos.serialize())) {
            score += 1;
        }
        // debugger
        let scaledScore = score / 10;
        let color = visual.rgbColor(Math.floor(scaledScore * 255), Math.floor((1 - scaledScore) * 255), 0);
        // visual.circle(newPos.toRoomPosition(), "#" + color, 1, 0.5);
        // visual.drawText(score.toFixed(2), newPos.toRoomPosition(), '#ffff00', { opacity: 0.5 });
        logger.log(`Move ${newPos.serialize()} has score ${score}`, moveCost, distanceToGoal, rangeToCurrent, scaledScore);
        return score;
    }

    /**
     * Execute the moves for all creeps
     * @param creepMoves Map of creep names to their moves
     */
    private executeMoves(creepMoves: Map<string, DirectionConstant>) {
        for (const [creepName, direction] of creepMoves) {
            const creep = Game.creeps[creepName];
            if (creep) {
                queueMicroTask(() => {
                    if (direction !== null) {
                        let ret = creep._move(direction);
                        if (ret !== OK) {
                            logger.error(`Failed to move ${creep.name} to ${direction}, error code ${ret}`);
                        }
                    } else {
                        logger.log(`${creep.name} staying in place`);
                    }
                }, builtInQueues.END_TICK);
            } else {
                logger.error(`Creep ${creepName} not found`);
            }
        }
    }

    /**
     * Visualize all occupied positions
     * @param occupiedPositions Set of occupied positions
     */
    private visualizeOccupiedPositions(occupiedPositions: Set<string>) {
        for (const pos of occupiedPositions) {
            visual.circle(WorldPosition.deserialize(pos).toRoomPosition(), '#ff0000', 1, 0.15);
        }
    }

    /**
     * Clear requests and desired positions for the next tick
     */
    clearRequestsAndDesiredPositions() {
        this.movementRequests = [];
        this.takenPositions.clear();
        this.preferredPositions.clear();
        this.hasConflicts = false;
    }

    /**
     * Check if a position is a valid WorldPosition
     * @param pos The position to check
     * @returns True if the position is valid, false otherwise
     */
    private isValidWorldPosition(pos: WorldPosition): boolean {
        return pos && typeof pos.serialize === 'function';
    }

    private handleStuckCreep(creep: MovableObject) {
        const stuckCount = (this.stuckCreeps.get(creep.name) || 0) + 1;
        this.stuckCreeps.set(creep.name, stuckCount);

        if (stuckCount >= 3) {
            logger.log(`${creep.name} is stuck, forcing repath`);
            // Force the creep to repath
            delete creep.memory._move;
            this.stuckCreeps.delete(creep.name);
        }
    }
}

export const movementManager = new MovementManager();
