import visual from "shared/utils/visual";
import { movementManager } from "shared/subsystems/NodeNetwork/MovementManager";
import { NodeNetwork } from "shared/subsystems/NodeNetwork/nodeNetwork";
import WorldPosition, { deserializeWPath, serializeWPath, toWorldPosition } from "shared/utils/map/WorldPosition";
import { deserializePath, serializePath } from "./roomPosition";
import { findPathPositions } from "../utils/map/index";
import Logger from "../utils/logger";
import { getRoomIntel, PlayerStatus } from "shared/subsystems/intel/intel";
import costMatrixUtils from "shared/utils/map/CostMatrix";
let logger = new Logger("CreepMovement");

interface CustomMoveToOpts {
    reusePath?: number;
    serializeMemory?: boolean;
    noPathFinding?: boolean;
    visualizePathStyle?: PolyStyle;
    range?: number;
    ignoreCreeps?: boolean;
    ignoreDestructibleStructures?: boolean;
    ignoreRoads?: boolean;
    maxOps?: number;
    maxRooms?: number;
    plainCost?: number;
    swampCost?: number;
    flee?: boolean;
    roomCallback?: (roomName: string) => CostMatrix | boolean;
    maxPathDistance?: number;
    goalPos?: WorldPosition;
    priority?: number;
}

interface MoveMemory {
    path: string;
    lastPos: WorldPosition;
    lastMove: number;
    stuck: number;
    dest: WorldPosition;
    pathIndex: number;
}

function getEmptyMoveMemory(): MoveMemory {
    //@ts-ignore
    return {
        lastMove: 0,
        stuck: 0,
        pathIndex: 0,
    };
}

declare global {
    interface Creep {
        _moveTo(target: RoomPosition | { pos: RoomPosition }, opts?: MoveToOpts): CreepMoveReturnCode | ERR_NO_PATH | ERR_INVALID_TARGET | ERR_NOT_FOUND;
        _moveByPath(path: PathStep[] | RoomPosition[] | string): CreepMoveReturnCode | ERR_NOT_FOUND | ERR_INVALID_ARGS;
        _move(direction: DirectionConstant | Creep): CreepMoveReturnCode;
        setPath(dest: WorldPosition, path: WorldPosition[]): void;
        moveTo(target: WorldPosition | RoomPosition | { pos: RoomPosition }, opts?: CustomMoveToOpts): CreepMoveReturnCode | ERR_NO_PATH | ERR_INVALID_TARGET | ERR_NOT_FOUND;
        moveByPath(path: WorldPosition[] | string, opts?: CustomMoveToOpts): CreepMoveReturnCode | ERR_NOT_FOUND | ERR_INVALID_ARGS;
        move(direction: DirectionConstant | Creep, opts?: CustomMoveToOpts): CreepMoveReturnCode;

        _weight: number;
        getWeight(): number;
        getCost(terrainType: string): number;
        getColor(): string;
    }

    interface CreepMemory {
        _move?: MoveMemory;
    }
}

// Store original methods
Creep.prototype._moveTo = Creep.prototype.moveTo;
Creep.prototype._moveByPath = Creep.prototype.moveByPath;
Creep.prototype._move = Creep.prototype.move;

let colors = new Map<string, string>();
Creep.prototype.getColor = function () {
    if (!colors.has(this.name)) {
        colors.set(this.name, "#" + visual.rgbColor(Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), Math.floor(Math.random() * 256)).toString());
    }
    return colors.get(this.name)!;
}

//add new methods
/**
* Calculate the weight (fatness factor) of the creep
* @returns {number} The weight of the creep
*/
Creep.prototype.getWeight = function (): number {
    if (!this._weight) {
        const body = this.body;
        const carryParts = body.filter(part => part.type === CARRY);
        const otherParts = body.filter(part => part.type !== CARRY && part.type !== MOVE);

        // Calculate the weight of parts that generate fatigue
        const baseWeight = otherParts.length * 2; // Non-CARRY, non-MOVE parts cost 2 fatigue

        // Calculate the weight of CARRY parts based on their contents
        const carryWeight = (this.store.getUsedCapacity() / (carryParts.length || 1)) * 2; // Each unit of resource costs 1 fatigue, so multiply by 2 for the new scale

        // Calculate total weight
        const totalWeight = baseWeight + carryWeight;

        this._weight = totalWeight;
    }
    // this.say((this._weight).toFixed(2));
    return this._weight;
}

const terrainCosts = {
    "wall": Infinity,
    "swamp": 10,
    "plain": 2,
    "road": 1,
};

Creep.prototype.getCost = function (terrainType: keyof typeof terrainCosts): number {
    let cost = terrainCosts[terrainType] || 1;
    let totalWeight = this.getWeight();
    // Calculate the effective weight considering MOVE parts
    // Each MOVE part reduces the effect of weight by 2
    const moveParts = this.body.filter(part => part.type === MOVE);
    const effectiveWeight = Math.max(0, totalWeight * cost - (moveParts.length * 2));

    // Normalize the weight
    const normalizedWeight = effectiveWeight / this.body.length;

    // Adjust the weight to fit the terrain multiplier scale
    // This will result in a value that, when multiplied by the terrain factor,
    // gives the number of ticks the creep will spend on that tile
    logger.log(this.name, "getCost", terrainType, effectiveWeight, totalWeight, cost, moveParts.length, normalizedWeight);
    return normalizedWeight;
}

Creep.prototype.setPath = function(dest: WorldPosition, path: WorldPosition[]): void {
    this.memory._move = {
        path: serializeWPath(path),
        lastPos: this.pos.toWorldPosition(),
        lastMove: Game.time,
        stuck: 0,
        dest: dest,
        pathIndex: 0
    };
};
//@ts-ignore I'm ignoring the moveTo override that takes x,y
Creep.prototype.moveTo = function(target: WorldPosition | RoomPosition | { pos: RoomPosition }, opts: CustomMoveToOpts = {}): CreepMoveReturnCode | ERR_NO_PATH | ERR_INVALID_TARGET | ERR_NOT_FOUND {
    logger.log(this.name, "moveTo", target);
    const dest = toWorldPosition(target);
    if (!opts.plainCost) opts.plainCost = this.getCost("plain");
    if (!opts.swampCost) opts.swampCost = this.getCost("swamp");
    if (opts.range == undefined) opts.range = 0;
    logger.log(this.name, "checking for path", this.memory._move?.dest, dest);
    // Check if we already have a path and it's still valid
    if (this.memory._move && this.memory._move.dest && dest.isEqualTo(this.memory._move.dest)) {
        logger.log(this.name, "using cached path");
        //@ts-ignore return codes are different
        return this.moveByPath(this.memory._move.path, opts);
    }
    logger.log(this.name, "finding new path");
    // Find a new path
    opts.roomCallback = (roomName: string) => {
        let intel = getRoomIntel(roomName);
        let costMatrix = new PathFinder.CostMatrix;
        let allStructs = [
            ...intel.buildings[PlayerStatus.MINE].getAll(),
            ...intel.buildings[PlayerStatus.ENEMY].getAll(),
            ...intel.buildings[PlayerStatus.FRIENDLY].getAll(),
            ...intel.buildings[PlayerStatus.NEUTRAL].getAll(),

        ];

        let allCreeps = [
            ...intel.creeps[PlayerStatus.MINE].getAll(),
            ...intel.creeps[PlayerStatus.ENEMY].getAll(),
            ...intel.creeps[PlayerStatus.FRIENDLY].getAll(),
            ...intel.creeps[PlayerStatus.NEUTRAL].getAll(),
        ];

        for (const struct of allStructs) {
            let structPos = struct.wpos.toRoomPosition();
            costMatrix.set(structPos.x, structPos.y, 255);
        }
        // if (!opts.ignoreCreeps) {
            for (const creep of allCreeps) {
                let creepPos = creep.wpos.toRoomPosition();
                costMatrix.set(creepPos.x, creepPos.y, 255);
            }
        // }


        return costMatrix;
    };
    const result = PathFinder.search(this.pos, { pos: dest.toRoomPosition(), range: opts.range }, opts);

    if (result.incomplete) {
        return ERR_NO_PATH;
    }

    // Visualize the path if requested
    if (opts.visualizePathStyle) {
        visual.drawPath(result.path, this.getColor(), opts.visualizePathStyle);
    }

    // Convert RoomPositions to WorldPositions
    const worldPath = result.path.map(pos => WorldPosition.fromRoomPosition(pos));

    // Save the new path
    this.setPath(dest, worldPath);

    // Move along the path
    //@ts-ignore return codes are different
    return this.moveByPath(worldPath, opts);
};

//@ts-ignore just screwin up the api all over the place
Creep.prototype.moveByPath = function(path: WorldPosition[] | string, opts: CustomMoveToOpts = {}): CreepMoveReturnCode | ERR_NOT_FOUND | ERR_INVALID_ARGS {
    logger.log(this.name, "moveByPath", path);
    const creepPos = toWorldPosition(this.pos);
    if (this.memory._move?.dest && creepPos.inRangeTo(this.memory._move.dest, opts.range || 0)) {
        //we've reached the destination
        logger.log(this.name, "moveByPath", "reached destination");
        delete this.memory._move;
        return OK;
    }
    let deserializedPath: WorldPosition[];
    if (typeof path === 'string') {
        deserializedPath = deserializeWPath(path);
    } else {
        deserializedPath = path;
    }

    // Get the current path index from memory, or start at 0
    const startIndex = this.memory._move?.pathIndex || 0;

    const { currentPos, nextPos, lookaheadPos, currentIndex } = findPathPositions(creepPos, deserializedPath, 3, startIndex);

    // Store the new current index in memory
    if (!this.memory._move) this.memory._move = getEmptyMoveMemory();
    this.memory._move.pathIndex = currentIndex;

    if (creepPos.isEqualTo(lookaheadPos)) {
        logger.log(this.name, "moveByPath", "reached end of path");
        // We've reached the end of the path
        delete this.memory._move;
        return OK;
    }



    // Move to the next position
    movementManager.registerMovement({
        creep: this,
        currentPathPos: currentPos,
        nextPathPos: nextPos,
        goalPos: lookaheadPos,
        goalRange: opts.range || 0,
        priority: opts.priority || 1, // Use the provided priority or default to 1
        pathRange: Math.min(opts.maxPathDistance || 1, deserializedPath.length - startIndex),
    });
    return OK;
};

//@ts-ignore just screwin up the api all over the place
Creep.prototype.move = function(direction: DirectionConstant | Creep, opts: CustomMoveToOpts = {}): CreepMoveReturnCode {
    logger.log(this.name, "move", direction);
    if (direction instanceof Creep) {
        return this._move(direction);
    }
    const currentPos = toWorldPosition(this.pos);
    const targetPos = currentPos.moveInDir(direction);

    movementManager.registerMovement({
        creep: this,
        currentPathPos: currentPos,
        nextPathPos: targetPos,
        goalPos: opts.goalPos || targetPos,
        goalRange: opts.range || 0,
        priority: opts.priority || 1, // Use the provided priority or default to 1
        pathRange: opts.maxPathDistance || 1,
    });

    return OK;
};
