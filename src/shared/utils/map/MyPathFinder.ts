
import WorldPosition, { HasPos } from 'shared/utils/map/WorldPosition';
import { getRoomIntel, PlayerStatus } from 'shared/subsystems/intel/intel';
import { StuctureIsBlocking } from '.';
import { StructureRoadWrapper } from 'world_new/wrappers';

export interface PathFinderOptions {
    reusePath?: number;
    visualize?: boolean;
    ignoreCreeps?: boolean;
    ignoreStructures?: boolean;
    ignoreRoads?: boolean;
    maxOps?: number;
    maxRooms?: number;
    plainCost?: number;
    swampCost?: number;
    flee?: boolean;
}

type goalOrPos = WorldPosition | {pos: RoomPosition, range: number}
type goalOrPosArray = goalOrPos[] | goalOrPos
export class MyPathFinder {
    public findPath(
        origin: WorldPosition,
        goal: goalOrPosArray,
        options: PathFinderOptions
    ): WorldPosition[] | null {

        const pathfinderOpts: PathFinderOpts = {
            roomCallback: this.getRoomCallback(options),
            maxOps: options.maxOps,
            maxRooms: options.maxRooms,
            flee: options.flee
        };
        let roomPosGoal = [];
        if (Array.isArray(goal)) {
            for (const thisgoal of goal) {
                if (thisgoal instanceof WorldPosition) {
                    roomPosGoal.push({pos: thisgoal.toRoomPosition(), range: 0});
                } else {
                    roomPosGoal.push(thisgoal);
                }
            }
        } else {
            if (goal instanceof WorldPosition) {
                roomPosGoal.push({pos: goal.toRoomPosition(), range: 0});
            } else {
                roomPosGoal.push(goal);
            }
        }
        const result = PathFinder.search(origin.toRoomPosition(), roomPosGoal, pathfinderOpts);

        if (result.incomplete) {
            return null;
        }

        return result.path.map(pos => WorldPosition.fromRoomPosition(pos));
    }

    private getRoomCallback(options: PathFinderOptions): (roomName: string) => CostMatrix | boolean {
        return (roomName: string) => {
            const intel = getRoomIntel(roomName);
            const costMatrix = new PathFinder.CostMatrix();

            // If we're ignoring both creeps and structures, return empty cost matrix
            if (options.ignoreCreeps && options.ignoreStructures) {
                return costMatrix;
            }
            let roadsPositions: RoomPosition[] = [];
            // Handle structures if not ignoring them
            if (!options.ignoreStructures || !options.ignoreRoads) {
                const allStructures = [
                    ...intel.buildings[PlayerStatus.MINE].getAll(),
                    ...intel.buildings[PlayerStatus.ENEMY].getAll(),
                    ...intel.buildings[PlayerStatus.FRIENDLY].getAll(),
                    ...intel.buildings[PlayerStatus.NEUTRAL].getAll(),
                ];

                for (const struct of allStructures) {
                    const structPos = struct.wpos.toRoomPosition();
                    if (struct instanceof StructureRoadWrapper && !options.ignoreRoads) {
                        roadsPositions.push(structPos);
                    }
                    if (!StuctureIsBlocking(struct) || options.ignoreStructures) {
                        continue;
                    }
                    costMatrix.set(structPos.x, structPos.y, 255);
                }
            }

            // Handle creeps if not ignoring them
            if (!options.ignoreCreeps) {
                const allCreeps = [
                    ...intel.creeps[PlayerStatus.MINE].getAll(),
                    ...intel.creeps[PlayerStatus.ENEMY].getAll(),
                    ...intel.creeps[PlayerStatus.FRIENDLY].getAll(),
                    ...intel.creeps[PlayerStatus.NEUTRAL].getAll(),
                ];

                for (const creep of allCreeps) {
                    const creepPos = creep.wpos.toRoomPosition();
                    costMatrix.set(creepPos.x, creepPos.y, 255);
                }
            }

            // Set plain and swamp costs if specified
            if (options.plainCost || options.swampCost) {
                for (let x = 0; x < 50; x++) {
                    for (let y = 0; y < 50; y++) {
                        const terrain = Game.map.getRoomTerrain(roomName);
                        const terrainType = terrain.get(x, y);
                        if (roadsPositions.some(pos => pos.x === x && pos.y === y)) {
                            costMatrix.set(x, y, 1);
                        } else if (terrainType === TERRAIN_MASK_SWAMP && options.swampCost) {
                            costMatrix.set(x, y, Math.max(costMatrix.get(x, y), options.swampCost));
                        } else if (terrainType === 0 && options.plainCost) { // 0 represents plain
                            costMatrix.set(x, y, Math.max(costMatrix.get(x, y), options.plainCost));
                        }
                    }
                }
            }

            return costMatrix;
        };
    }
}
