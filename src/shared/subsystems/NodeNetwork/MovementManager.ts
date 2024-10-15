import { MovableObject } from "./NodeNetworkTypes";
import WorldPosition, { getAdjacentDirections, reverseDirection } from "shared/utils/map/WorldPosition";
import Node from "./node";
import nodeNetwork from "./nodeNetwork";
import Logger from "shared/utils/logger";
import { setInterval } from "shared/polyfills/setInterval";
import queues from "world_new/queues";
import { builtInQueues, queueMicroTask } from "shared/polyfills/tasks";
import CachedPath from "./cachedPath";
import type { CreepWrapper } from "world_new/wrappers";
import visual from "shared/utils/visual";

const logger = new Logger("MovementManager");
// logger.enabled = false;
interface MovementRequest {
    creep: MovableObject;
    currentPos: WorldPosition;
    desiredDirection: DirectionConstant | false;
    goalPos: WorldPosition;
    goalRange: number;
    priority: number;
    maxPathDistance: number;
    maxEndDistance: number;
}

export class MovementManager {
    private movementRequests: MovementRequest[] = [];
    private desiredPositions: Set<string> = new Set();

    constructor() {
    }

    registerMovement(request: MovementRequest) {
        logger.log(`Registering movement for ${request.creep.name}`);
        logger.log(`Request details: ${JSON.stringify(request)}`);

        if (!request.goalPos || typeof request.goalPos.serialize !== 'function') {
            logger.error(`Invalid goalPos for ${request.creep.name}: ${JSON.stringify(request.goalPos)}`);
            return;
        }
        if (!request.currentPos || typeof request.currentPos.serialize !== 'function') {
            logger.error(`Invalid currentPos for ${request.creep.name}: ${JSON.stringify(request.currentPos)}`);
            return;
        }
        this.movementRequests.push(request);
        if (request.desiredDirection !== false) {
            this.desiredPositions.add(request.goalPos.serialize());
        }
        logger.log(`Registered movement for ${request.creep.name} from ${request.currentPos.serialize()} to ${request.goalPos.serialize()}`);
    }

    registerPathMovement(creep: MovableObject, path: RoomPosition[], goal: { pos: RoomPosition; range: number }, maxPathDistance: number, maxEndDistance: number) {

    }

    registerCachedPathMovement(creep: MovableObject, cachedPath: CachedPath, destNode: Node, goal: { pos: WorldPosition; range: number }, maxEdgeDistance: number, maxNodeDistance: number) {
        const creepPos = creep.pos.toWorldPosition();
        const distanceToNode = creepPos.getRangeTo(destNode.pos);
        const lookahead = Math.max(maxNodeDistance, Math.min(maxEdgeDistance, distanceToNode));

        const { nextPos, lookaheadPos } = cachedPath.getNextPathPosition(creep, destNode, goal, lookahead);

        const targetPos = lookaheadPos || goal.pos;
        const priority = 1; // You may want to adjust this based on creep role or other factors

        this.registerMovement({
            creep,
            currentPos: creepPos,
            desiredDirection: creepPos.getDirectionTo(nextPos),
            goalPos: targetPos,
            goalRange: goal.range,
            priority,
            maxPathDistance: maxEdgeDistance,
            maxEndDistance: maxNodeDistance
        });
    }

    resolveMovements() {
        logger.log(`Resolving ${this.movementRequests.length} movement requests`);
        // Sort requests by priority (higher priority first)
        this.movementRequests.sort((a, b) => {
            if (a.creep.fatigue > 0 || b.creep.fatigue > 0) {
                return b.creep.fatigue - a.creep.fatigue;
            } else if ((b.desiredDirection == false || a.desiredDirection == false) && !a.desiredDirection === b.desiredDirection) {
                if (a.desiredDirection == false && b.desiredDirection != false) {
                    return 0;
                } else if (a.desiredDirection == false) {
                    return 1;
                } else {
                    return -1;
                }
            } else if (b.priority !== a.priority) {
                return b.priority - a.priority;
            } else if (b.creep.getWeight() !== a.creep.getWeight()) {
                return b.creep.getWeight() - a.creep.getWeight();
            }
            return a.currentPos.getRangeTo(a.goalPos) - b.currentPos.getRangeTo(b.goalPos);
        });
        logger.log(`Sorted movement requests: ${this.movementRequests.map(r => `${r.creep.name} (${r.priority})`).join(', ')}`);
        // debugger;

        const occupiedPositions: Set<string> = new Set();
        const creepMoves: Map<string, DirectionConstant> = new Map();

        for (const request of this.movementRequests) {
            logger.log(`------------- Resolving movement for ${request.creep.name} -------------`, "currentPos", request.currentPos.serialize(), "goalPos", request.goalPos.serialize(), "goalRange", request.goalRange, "desiredDirection", request.desiredDirection);
            const { creep, currentPos, desiredDirection, goalPos, goalRange } = request;
            const creepPos = creep.pos.toWorldPosition();

            if (request.creep.fatigue > 0) {
                logger.log(`${creep.name} is fatigued, skipping movement`);
                occupiedPositions.add(currentPos.serialize());
                continue;
            }

            let bestMove: DirectionConstant | null = null;

            if (desiredDirection !== false) {
                const helpfulMoves = this.findHelpfulMoves(request, desiredDirection, goalPos, goalRange, occupiedPositions);
                logger.log(`Found ${helpfulMoves.length} helpful moves for ${currentPos.serialize()}: ${helpfulMoves.join(', ')}`);
                if (helpfulMoves.length > 0) {
                    bestMove = this.getBestMove(helpfulMoves, request, true, occupiedPositions);
                }
            } else {
                // Creep doesn't want to move, check if its position is desired by others
                const currentPosStr = currentPos.serialize();
                if (!this.desiredPositions.has(currentPosStr)) {
                    logger.log(`${creep.name} staying in place, no one wants its position`);
                    occupiedPositions.add(currentPosStr);
                    continue;
                }

                // Include current position in the list of considered moves
                const stayInPlaceMove = this.evaluateStayInPlace(request, occupiedPositions);
                if (stayInPlaceMove !== null) {
                    bestMove = stayInPlaceMove;
                } else {
                    // Find alternative moves if staying in place is not optimal
                    const alternativeMoves = this.findAlternativeMoves(request, goalPos, goalRange, occupiedPositions);
                    if (alternativeMoves.length > 0) {
                        bestMove = this.getBestMove(alternativeMoves, request, false, occupiedPositions);
                    }
                }
            }

            if (bestMove !== null) {
                creepMoves.set(creep.name, bestMove);
                occupiedPositions.add(creepPos.moveInDir(bestMove).serialize());
                logger.log(`${creep.name} taking move ${bestMove}`);
            } else {
                logger.log(`${creep.name} staying in place, no valid moves`);
                occupiedPositions.add(creepPos.serialize());
            }
        }

        // Execute moves
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

        // Display all occupied positions
        for (const pos of occupiedPositions) {
            visual.circle(WorldPosition.deserialize(pos).toRoomPosition(), '#ff0000', 1, 0.15);
        }

        // Clear requests and desired positions for next tick
        this.movementRequests = [];
        this.desiredPositions.clear();
    }

    private findHelpfulMoves(request: MovementRequest, requestedDirection: DirectionConstant, goalPos: WorldPosition, goalRange: number, occupiedPositions: Set<string>): DirectionConstant[] {
        const validMoves: DirectionConstant[] = [];
        const directions: DirectionConstant[] = getAdjacentDirections(requestedDirection);
        const creepPos = request.creep.pos.toWorldPosition();
        let currentRange = request.currentPos.getRangeTo(goalPos);
        if (currentRange < goalRange) {
            currentRange = goalRange;
        }

        for (const direction of directions) {
            const newPos = creepPos.moveInDir(direction);
            // logger.log(currentPos.serialize(), goalPos.serialize(), `Checking move ${direction} to ${newPos.serialize()}, range to goal ${newPos.getRangeTo(goalPos)}`, !occupiedPositions.has(newPos.serialize()), !this.isBlocked(newPos), newPos.getRangeTo(goalPos),  currentRange);
            if (!occupiedPositions.has(newPos.serialize()) &&
                newPos.getRangeTo(goalPos) <= currentRange &&
                !this.isBlocked(newPos) &&
                newPos.getRangeTo(request.currentPos) <= request.maxPathDistance
            ) {
                validMoves.push(direction);
            }
        }

        // logger.log(`Found ${validMoves.length} alternative moves for position ${currentPos.serialize()}`);
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
        let currentRange = request.currentPos.getRangeTo(goalPos);
        if (currentRange < goalRange) {
            currentRange = goalRange;
        }

        for (const direction of directions) {
            const newPos = creepPos.moveInDir(direction);
            logger.log(request.currentPos.serialize(), goalPos.serialize(), `Checking move ${direction} to ${newPos.serialize()}, range to goal ${newPos.getRangeTo(goalPos)}`, !occupiedPositions.has(newPos.serialize()), !this.isBlocked(newPos), newPos.getRangeTo(goalPos), newPos.getRangeTo(request.currentPos), request.maxPathDistance);
            if (newPos.getRangeTo(goalPos) <= currentRange &&
                !this.isBlocked(newPos) &&
                newPos.getRangeTo(request.currentPos) <= request.maxPathDistance
            ) {
                validMoves.push(direction);
            }
        }

        // logger.log(`Found ${validMoves.length} alternative moves for position ${currentPos.serialize()}`);
        return validMoves;
    }

    private getBestMove(moves: DirectionConstant[],
        request: MovementRequest,
        onlyUseful: boolean = false,
        occupiedPositions: Set<string>): DirectionConstant | null {
        const { creep, currentPos, goalPos } = request;
        const weight = creep.getWeight();

        let bestMove: DirectionConstant | null = null;
        let bestScore = Infinity;
        //randomize moves
        moves.sort(() => Math.random() - 0.5);
        for (const move of moves) {
            const newPos = currentPos.moveInDir(move);
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
            const currentDistance = request.creep.pos.toWorldPosition().getRangeTo(goalPos);
            const distanceDelta = currentDistance - distanceToGoal;
            const rangeToCurrent = newPos.getRangeTo(currentPos);
            logger.log("looking at move", newPos.serialize(), "range to current", rangeToCurrent, "distance delta", distanceDelta, "move cost", moveCost, "current distance", currentDistance);
            // Calculate score (lower is better)
            let baseScore = -distanceDelta
            let score: number;
            if (rangeToCurrent > request.maxPathDistance) {
                score = Infinity;
            } else if (occupiedPositions.has(newPos.serialize())) {
                score = baseScore + 2 + rangeToCurrent;
            } else if (moveCost == 0) {
                score = baseScore + rangeToCurrent;
                if (isRoad) {
                    score += 1; // penalty for moving on roads when empty
                }
            } else {
                score = baseScore + moveCost + rangeToCurrent;
            }

            if (score < bestScore) {
                bestScore = score;
                bestMove = move;
            }
            // debugger
            let scaledScore = score / 10;
            let color = visual.rgbColor(Math.floor(scaledScore * 255), Math.floor((1 - scaledScore) * 255), 0);
            // visual.circle(newPos.toRoomPosition(), "#" + color, 1, 0.5);
            logger.log(`Move ${newPos.serialize()} has score ${score}`, moveCost, distanceToGoal, rangeToCurrent, scaledScore);
            //visual.drawText(score.toFixed(2), newPos.toRoomPosition(), '#ffff00', { opacity: 0.5 });
        }

        logger.log(`Best move from ${currentPos.serialize()} to ${goalPos.serialize()} is ${bestMove} with score ${bestScore}`);
        //if no best move, return random move
        if (onlyUseful) {
            return bestMove;
        }
        return bestMove || moves[Math.floor(Math.random() * moves.length)];
    }

    private isBlocked(pos: WorldPosition): boolean {
        const roomPos = pos.toRoomPosition();
        const terrain = Game.map.getRoomTerrain(roomPos.roomName);

        // Check for walls
        if (terrain.get(roomPos.x, roomPos.y) === TERRAIN_MASK_WALL) {
            // visual.circle(pos.toRoomPosition(), '#ff0000', 0.5);
            return true;
        }

        // Check for structures
        const structures = roomPos.lookFor(LOOK_STRUCTURES);
        for (const structure of structures) {
            // List of structure types that block movement
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

            if (blockingStructures.includes(structure.structureType)) {
                // If it's a rampart, check if it's not our own or if it's not public
                if (structure.structureType === STRUCTURE_RAMPART) {
                    const rampart = structure as StructureRampart;
                    if (!rampart.my) {
                        return true;
                    }
                } else {
                    return true;
                }
            }
        }

        return false;
    }

    private evaluateStayInPlace(request: MovementRequest, occupiedPositions: Set<string>): DirectionConstant | null {
        const currentPosStr = request.currentPos.serialize();
        if (!occupiedPositions.has(currentPosStr)) {
            // Calculate the score for staying in place
            const stayScore = this.calculateMoveScore(request.currentPos, request);

            // Find the best alternative move
            const alternativeMoves = this.findAlternativeMoves(request, request.goalPos, request.goalRange, occupiedPositions);
            let bestAlternativeScore = Infinity;
            let bestAlternativeMove: DirectionConstant | null = null;

            for (const move of alternativeMoves) {
                const newPos = request.currentPos.moveInDir(move);
                const score = this.calculateMoveScore(newPos, request);
                if (score < bestAlternativeScore) {
                    bestAlternativeScore = score;
                    bestAlternativeMove = move;
                }
            }

            // If staying in place is better or equal to the best alternative, stay
            if (stayScore <= bestAlternativeScore) {
                occupiedPositions.add(currentPosStr);
                return null; // Indicate that the creep should stay in place
            }

            // Otherwise, return the best alternative move
            return bestAlternativeMove;
        }

        // The current position is already occupied, so we can't stay here
        return null;
    }

    private calculateMoveScore(pos: WorldPosition, request: MovementRequest): number {
        const distanceToGoal = pos.getRangeTo(request.goalPos);
        const terrainType = this.getTerrainType(pos);
        const moveCost = request.creep.getCost(terrainType);

        // Calculate score (lower is better)
        let score = distanceToGoal + moveCost;

        // Add penalties for occupied positions or positions outside the allowed range
        if (this.isBlocked(pos) || pos.getRangeTo(request.currentPos) > request.maxPathDistance) {
            score += 1000; // Large penalty
        }

        return score;
    }

    private getTerrainType(pos: WorldPosition): string {
        const roomPos = pos.toRoomPosition();
        const terrain = Game.map.getRoomTerrain(roomPos.roomName);
        const terrainMask = terrain.get(roomPos.x, roomPos.y);

        const structures = roomPos.lookFor(LOOK_STRUCTURES);
        const isRoad = structures.some(s => s.structureType === STRUCTURE_ROAD);

        if (isRoad) return "road";
        if (terrainMask === TERRAIN_MASK_SWAMP) return "swamp";
        if (terrainMask === TERRAIN_MASK_WALL) return "wall";
        return "plain";
    }

}

export const movementManager = new MovementManager();



// interface MoveToOpts {
//     reusePath?: number;
//     serializeMemory?: boolean;
//     noPathFinding?: boolean;
//     visualizePathStyle?: PolyStyle;
//     range?: number;
//     ignoreCreeps?: boolean;
//     ignoreDestructibleStructures?: boolean;
//     ignoreRoads?: boolean;
//     maxOps?: number;
//     maxRooms?: number;
//     plainCost?: number;
//     swampCost?: number;
//     flee?: boolean;
//     // Add new options here
//     maxPathDistance?: number;
//     maxEndDistance?: number;
// }

// interface MoveMemory {
//     dest: { x: number; y: number; room: string };
//     time: number;
//     path: string;
//     room: string;
//     stuck: number;
//     lastPos: WorldPosition;
//     lastPos2: WorldPosition;
//     idx: number;
//     onPath: boolean;
//     closeToPath: boolean;
// }

// //override internal movement functions
// declare global {
//     interface Creep {
//         move(direction: DirectionConstant | Creep, goalPos?: WorldPosition): CreepMoveReturnCode;
//         _move(direction: DirectionConstant | Creep): CreepMoveReturnCode;
//         _moveByPath(path: PathStep[] | RoomPosition[] | string): CreepMoveReturnCode | ERR_NOT_FOUND | ERR_INVALID_ARGS;
//         _moveTo(target: RoomPosition | { pos: RoomPosition }, opts?: MoveToOpts): CreepMoveReturnCode | ERR_NO_PATH | ERR_INVALID_TARGET | ERR_NOT_FOUND;
//         getWeight(): number;
//         getCost(terrainType: string): number;
//         getColor(): string;
//         _weight: number;
//         maxPathDistance: number;
//         maxEndDistance: number;
//     }
//     interface CreepMemory {
//         _move?: MoveMemory;
//     }
// }

// // Store original methods
// Creep.prototype._move = Creep.prototype.move;
// Creep.prototype._moveByPath = Creep.prototype.moveByPath;
// Creep.prototype._moveTo = Creep.prototype.moveTo;


// let colors = new Map<string, string>();
// Creep.prototype.getColor = function () {
//     if (!colors.has(this.name)) {
//         colors.set(this.name, "#" + visual.rgbColor(Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), Math.floor(Math.random() * 256)).toString());
//     }
//     return colors.get(this.name)!;
// }


// /**
// * Calculate the weight (fatness factor) of the creep
// * @returns {number} The weight of the creep
// */
// Creep.prototype.getWeight = function (): number {
//     if (!this._weight) {
//         const body = this.body;
//         const carryParts = body.filter(part => part.type === CARRY);
//         const otherParts = body.filter(part => part.type !== CARRY && part.type !== MOVE);

//         // Calculate the weight of parts that generate fatigue
//         const baseWeight = otherParts.length * 2; // Non-CARRY, non-MOVE parts cost 2 fatigue

//         // Calculate the weight of CARRY parts based on their contents
//         const carryWeight = (this.store.getUsedCapacity() / (carryParts.length || 1)) * 2; // Each unit of resource costs 1 fatigue, so multiply by 2 for the new scale

//         // Calculate total weight
//         const totalWeight = baseWeight + carryWeight;


//         this._weight = totalWeight;
//     }
//     // this.say((this._weight).toFixed(2));
//     return this._weight;
// }

// const terrainCosts = {
//     "wall": Infinity,
//     "swamp": 10,
//     "plain": 2,
//     "road": 1,
// };
// Creep.prototype.getCost = function (terrainType: keyof typeof terrainCosts): number {
//     let cost = terrainCosts[terrainType] || 1;
//     let totalWeight = this.getWeight();
//     // Calculate the effective weight considering MOVE parts
//     // Each MOVE part reduces the effect of weight by 2
//     const moveParts = this.body.filter(part => part.type === MOVE);
//     const effectiveWeight = Math.max(0, totalWeight * cost - (moveParts.length * 2));

//     // Normalize the weight
//     const normalizedWeight = effectiveWeight / this.body.length;

//     // Adjust the weight to fit the terrain multiplier scale
//     // This will result in a value that, when multiplied by the terrain factor,
//     // gives the number of ticks the creep will spend on that tile
//     return normalizedWeight;
// }


// // Add new properties
// Object.defineProperty(Creep.prototype, 'maxPathDistance', {
//     writable: true,
//     enumerable: false,
//     value: 0
// });

// Object.defineProperty(Creep.prototype, 'maxEndDistance', {
//     writable: true,
//     enumerable: false,
//     value: 0
// });

// // Override move method
// //@ts-ignore
// Creep.prototype.move = function (direction: DirectionConstant | Creep, goalPos?: WorldPosition): CreepMoveReturnCode {
//     if (!this.my) {
//         return ERR_NOT_OWNER;
//     }
//     if (this.spawning) {
//         return ERR_BUSY;
//     }

//     // Handle fatigue
//     if (this.fatigue > 0) {
//         movementManager.registerMovement({
//             creep: this,
//             currentPos: this.pos.toWorldPosition(),
//             desiredDirection: false,
//             goalPos: goalPos || this.pos.toWorldPosition(),
//             goalRange: 0,
//             priority: 1000,  // Lower priority for fatigued creeps
//             maxPathDistance: 0,
//             maxEndDistance: 0
//         });
//         return ERR_TIRED;
//     }

//     if (!this.body.some(part => part.type === MOVE && part.hits > 0)) {
//         return ERR_NO_BODYPART;
//     }

//     if (direction instanceof Creep) {
//         return this._move(direction);
//     }
//     const creepPos = this.pos.toWorldPosition();
//     const targetPos = goalPos || creepPos.moveInDir(direction);

//     movementManager.registerMovement({
//         creep: this,
//         currentPos: creepPos,
//         desiredDirection: direction,
//         goalPos: targetPos,
//         goalRange: 0,
//         priority: 1, // Adjust priority as needed
//         maxPathDistance: this.maxPathDistance,
//         maxEndDistance: this.maxEndDistance
//     });

//     return OK; // Always return OK, actual movement will be handled by MovementManager
// };

// // Override moveByPath method
// Creep.prototype.moveByPath = function(path: RoomPosition[] | string, opts: MoveToOpts = {}): CreepMoveReturnCode | ERR_NOT_FOUND | ERR_INVALID_ARGS {
//     if (!this.my) return ERR_NOT_OWNER;
//     if (this.spawning) return ERR_BUSY;
//     if (this.fatigue > 0) return ERR_TIRED;

//     let worldPath: WorldPosition[];
//     if (typeof path === 'string') {
//         worldPath = Room.deserializePath(path).map(step => new RoomPosition(step.x, step.y, this.room.name).toWorldPosition());
//     } else if (path[0] instanceof RoomPosition) {
//         worldPath = path.map(pos => pos.toWorldPosition());
//     } else {
//         worldPath = path.map(step => new RoomPosition(step.x, step.y, this.room.name).toWorldPosition());
//     }

//     const moveMemory = this.memory._move;
//     if (!moveMemory) return ERR_NOT_FOUND;

//     const creepPos = this.pos.toWorldPosition();
//     const goalPos = worldPath[worldPath.length - 1];

//     if (creepPos.inRangeTo(goalPos, opts.range || 0)) {
//         this.memory._move = undefined;
//         return OK;
//     }

//     let closestPos = worldPath[0];
//     let closestDist = Infinity;
//     const startI = Math.min(worldPath.length - 1, moveMemory.onPath ? moveMemory.idx + 1 : moveMemory.idx);

//     visual.drawPath(worldPath.map(wp => wp.toRoomPosition()), "#ffffff", { opacity: 0.5 });

//     for (let i = startI; i < worldPath.length; i++) {
//         const pos = worldPath[i];
//         const nextPos = worldPath[i + 1];
//         const posDist = creepPos.getRangeTo(pos);

//         if (posDist < closestDist) {
//             closestPos = pos;
//             closestDist = posDist;
//         }

//         const onPath = creepPos.isEqualTo(pos);
//         const closeToPath = onPath || (posDist <= (opts.range || 0) && posDist < creepPos.getRangeTo(nextPos));

//         if (onPath || closeToPath) {
//             moveMemory.onPath = onPath;
//             moveMemory.closeToPath = closeToPath;
//             moveMemory.idx = i;

//             visual.circle(pos.toRoomPosition(), "#666");
//             if (nextPos) visual.circle(nextPos.toRoomPosition(), "#999");

//             const moveDir = creepPos.getDirectionTo(nextPos || goalPos);

//             movementManager.registerMovement({
//                 creep: this,
//                 currentPos: creepPos,
//                 desiredDirection: moveDir,
//                 goalPos: nextPos || goalPos,
//                 goalRange: opts.range || 0,
//                 priority: 1,
//                 maxPathDistance: opts.maxPathDistance || 3,
//                 maxEndDistance: opts.maxEndDistance || 1,
//             });

//             return OK;
//         }
//     }

//     if (!moveMemory.onPath && !moveMemory.closeToPath || moveMemory.stuck > 3) {
//         moveMemory.lastPos2 = moveMemory.lastPos;
//         moveMemory.lastPos = creepPos;
//         moveMemory.stuck = 0;
//         moveMemory.idx = 0;
//         moveMemory.onPath = false;
//         moveMemory.closeToPath = false;
//         this.say("off path!");
//     } else {
//         moveMemory.stuck++;
//     }

//     this.memory._move = moveMemory;
//     return ERR_NOT_FOUND;
// };

// // Override moveTo method
// //@ts-ignore
// Creep.prototype.moveTo = function (target: RoomPosition | { pos: RoomPosition }, opts: MoveToOpts = {}): CreepMoveReturnCode | ERR_NO_PATH | ERR_INVALID_TARGET | ERR_NOT_FOUND {
//     opts.plainCost = this.getCost("plain");
//     opts.swampCost = this.getCost("swamp");
//     opts.maxPathDistance = opts.maxPathDistance || 3;
//     opts.maxEndDistance = opts.maxEndDistance || 1;
//     opts.reusePath = opts.reusePath || 5;

//     logger.log(`moveTo ${this.name}`, target);
//     const targetPos = target instanceof RoomPosition ? target : target.pos;

//     if (!targetPos || typeof targetPos.x !== 'number' || typeof targetPos.y !== 'number' || !targetPos.roomName) {
//         logger.error(`Invalid target position for ${this.name}: ${JSON.stringify(target)}`);
//         return ERR_INVALID_TARGET;
//     }

//     if (!this.my) return ERR_NOT_OWNER;
//     if (this.spawning) return ERR_BUSY;
//     if (this.fatigue > 0) {
//         // Register that the creep is not moving due to fatigue
//         try {
//             movementManager.registerMovement({
//                 creep: this,
//                 currentPos: this.pos.toWorldPosition(),
//                 desiredDirection: false,
//                 goalPos: targetPos.toWorldPosition(),
//                 goalRange: opts.range || 0,
//                 priority: 1000,  // higher priority for fatigued creeps, since they can't move
//                 maxPathDistance: 0,
//                 maxEndDistance: 0
//             });
//         } catch (error) {
//             logger.error(`Error registering fatigue movement for ${this.name}: ${error}`);
//         }
//         this.say("💤");
//         return ERR_TIRED;
//     }
//     if (!this.body.some(part => part.type === MOVE && part.hits > 0)) return ERR_NO_BODYPART;

//     const creepPos = this.pos;
//     if (creepPos.isEqualTo(targetPos)) {
//         // register a movement to the target position
//         try {
//             movementManager.registerMovement({
//                 creep: this,
//                 currentPos: creepPos.toWorldPosition(),
//                 desiredDirection: false,
//                 goalPos: targetPos.toWorldPosition(),
//                 goalRange: opts.range || 0,
//                 priority: 1,
//                 maxPathDistance: this.maxPathDistance,
//                 maxEndDistance: this.maxEndDistance
//             });
//         } catch (error) {
//             logger.error(`Error registering equal position movement for ${this.name}: ${error}`);
//         }
//         this.memory._move = undefined;
//         return OK;
//     }

//     let moveMemory = this.memory._move;

//     // Check if we can reuse the existing path
//     if (moveMemory && moveMemory.time > Game.time - opts.reusePath &&
//         moveMemory.dest.x === targetPos.x &&
//         moveMemory.dest.y === targetPos.y &&
//         moveMemory.dest.room === targetPos.roomName) {

//         logger.log(`${this.name} reusing existing path`);
//         //@ts-ignore
//         return this.moveByPath(moveMemory.path);
//     }

//     // If no valid reusable path, find a new path
//     if (opts.noPathFinding) return ERR_NOT_FOUND;

//     logger.log(`Finding new path for ${this.name} from ${creepPos} to ${targetPos}`);
//     const newPath = this.pos.findPathTo(targetPos, opts);
//     if (!newPath || newPath.length === 0) {
//         logger.error(`No path found for ${this.name} from ${this.pos} to ${targetPos}`);
//         return ERR_NO_PATH;
//     }

//     // Store the new path for future reuse
//     this.memory._move = {
//         dest: { x: targetPos.x, y: targetPos.y, room: targetPos.roomName },
//         time: Game.time,
//         path: Room.serializePath(newPath),
//         room: creepPos.roomName,
//         stuck: 0,
//         lastPos: creepPos.toWorldPosition(),
//         lastPos2: creepPos.toWorldPosition(),
//         idx: 0,
//         onPath: true,
//         closeToPath: true
//     };

//     logger.log(`${this.name} moving with new path`);
//     //@ts-ignore
//     return this.moveByPath(newPath);
// };
