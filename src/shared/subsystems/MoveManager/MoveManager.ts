import { MovementRequest, MoveToOptions } from "./types";
import { getMoveRequests, clearMoveRequests, addMoveRequest } from "./Requests";
import { processMovementRequests } from "./RequestProcessor";
import { executeNonConflictingMoves, resolveConflicts } from "./MovementResolver";
import WorldPosition from "shared/utils/map/WorldPosition";
import Logger, { LogLevel } from "shared/utils/logger";

const logger = new Logger("MoveManager");
Logger.setGroupLevel("MoveManager", LogLevel.INFO);
logger.enabled = false;

export function processMoveRequests() {
    const requests = getMoveRequests();
    logger.debug(`Processing ${requests.length} move requests`);

    // Process requests into movement intents
    const movementIntents = processMovementRequests(requests);
    logger.debug(`Generated ${movementIntents.size} movement intents`);

    // Execute non-conflicting moves first
    const { remainingIntents, occupiedPositions } = executeNonConflictingMoves(movementIntents);
    logger.debug(`After non-conflicting moves, ${remainingIntents.size} intents remain`);
    logger.debug(`Occupied positions: ${Array.from(occupiedPositions).join(', ')}`);

    // Resolve and execute conflicting moves
    resolveConflicts(remainingIntents, occupiedPositions);

    // Clear requests for next tick
    clearMoveRequests();
}

export function moveTo(creep: Creep, targetPos: WorldPosition, options: MoveToOptions) {
    if (!options.plainCost) {
        options.plainCost = creep.getCost("plain");
    }
    if (!options.swampCost) {
        options.swampCost = creep.getCost("swamp");
    }
    logger.debug(`${creep.name} requesting move to ${targetPos}`);
    addMoveRequest({ creep, targetPos, options });
}

export default {
    processMoveRequests,
    moveTo,
};
