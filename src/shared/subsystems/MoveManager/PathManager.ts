import { MoveToOptions } from "./types";
import WorldPosition from "shared/utils/map/WorldPosition";
import Logger from "shared/utils/logger";
import { getRoomIntel, PlayerStatus } from "shared/subsystems/intel/intel";
import costMatrixUtils from "shared/utils/map/CostMatrix";
import { StructureIsDestructible } from "shared/utils/map";

const logger = new Logger("MoveManager");

interface PathCache {
    path: WorldPosition[];
    timestamp: number;
}

const pathCache = new Map<string, PathCache>();

export function getStoredPath(creep: Creep, targetPos: WorldPosition): WorldPosition[] | null {
    const cacheKey = getCacheKey(creep.pos.toWorldPosition(), targetPos);
    const cached = pathCache.get(cacheKey);

    if (cached && Game.time - cached.timestamp < 20) {
        return cached.path;
    }

    return null;
}

export function calculateNewPath(
    creep: Creep,
    targetPos: WorldPosition,
    options: MoveToOptions
): WorldPosition[] | null {
    logger.log("PathManager: Starting path calculation");
    logger.log("From:", creep.pos);
    logger.log("To:", targetPos);
    logger.log("Options:", JSON.stringify(options));

    try {
        const roomPos = targetPos.toRoomPosition();
        logger.log("Target room position:", roomPos);

        const searchTarget = { pos: roomPos, range: options.range || 0 };
        logger.log("Search target:", searchTarget);

        const searchOptions = {
            maxOps: options.maxOps || 2000,
            maxRooms: options.maxRooms || 16,
            plainCost: options.plainCost || 2,
            swampCost: options.swampCost || 10,
            roomCallback: (roomName: string) => {
                let intel = getRoomIntel(roomName);
                let costMatrix = new PathFinder.CostMatrix;

                // Handle walls and ramparts first
                for (const wall of intel.walls.getAll()) {
                    let pos = wall.wpos.toRoomPosition();
                    costMatrix.set(pos.x, pos.y, 255);
                }

                // Handle ramparts for each player status
                for (const status of Object.values(PlayerStatus)) {
                    for (const rampart of intel.ramparts[status as PlayerStatus].getAll()) {
                        let pos = rampart.wpos.toRoomPosition();
                        if (!rampart.my) {
                            costMatrix.set(pos.x, pos.y, 255);
                        }
                    }
                }

                // Handle other buildings
                let allStructs = [
                    ...intel.buildings[PlayerStatus.MINE].getAll(),
                    ...intel.buildings[PlayerStatus.ENEMY].getAll(),
                    ...intel.buildings[PlayerStatus.FRIENDLY].getAll(),
                    ...intel.buildings[PlayerStatus.NEUTRAL].getAll(),
                ];

                // Add structure costs
                for (const struct of allStructs) {
                    let pos = struct.wpos.toRoomPosition();
                    if (!options.ignoreDestructibleStructures ||
                        !StructureIsDestructible(struct)) {
                        costMatrix.set(pos.x, pos.y, 255);
                    }
                }

                // Add creep costs if not ignoring
                if (!options.ignoreCreeps) {
                    let allCreeps = [
                        ...intel.creeps[PlayerStatus.MINE].getAll(),
                        ...intel.creeps[PlayerStatus.ENEMY].getAll(),
                        ...intel.creeps[PlayerStatus.FRIENDLY].getAll(),
                        ...intel.creeps[PlayerStatus.NEUTRAL].getAll(),
                    ];

                    for (const creep of allCreeps) {
                        let pos = creep.wpos.toRoomPosition();
                        costMatrix.set(pos.x, pos.y, 255);
                    }
                }

                // Add road costs last (lowest priority)
                if (!options.ignoreRoads) {
                    for (const road of intel.roads.getAll()) {
                        let pos = road.wpos.toRoomPosition();
                        // Only set road cost if no other higher cost is present
                        if (costMatrix.get(pos.x, pos.y) === 0) {
                            costMatrix.set(pos.x, pos.y, 1);
                        }
                    }
                }

                return costMatrix;
            }
        };
        logger.log("Search options:", searchOptions);

        const result = PathFinder.search(
            creep.pos,
            searchTarget,
            searchOptions
        );

        logger.log("Path result:", {
            incomplete: result.incomplete,
            pathLength: result.path.length,
            ops: result.ops,
            cost: result.cost
        });

        if (result.incomplete) {
            logger.log("Path calculation incomplete");
            return null;
        }

        const worldPath = result.path.map(pos => WorldPosition.fromRoomPosition(pos));
        logger.log("World path created with length:", worldPath.length);
        return worldPath;
    } catch (e) {
        logger.log("Error in path calculation:", e);
        return null;
    }
}

export function storePath(creep: Creep, targetPos: WorldPosition, path: WorldPosition[]) {
    const cacheKey = getCacheKey(creep.pos.toWorldPosition(), targetPos);
    pathCache.set(cacheKey, {
        path,
        timestamp: Game.time
    });
}

function getCacheKey(startPos: WorldPosition, endPos: WorldPosition): string {
    return `${startPos.toString()}-${endPos.toString()}`;
}
