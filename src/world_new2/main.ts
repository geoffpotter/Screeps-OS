// import "core-js";

import {
  ErrorMapper
} from "shared/utils/errors/ErrorMapper";

//@ts-ignore
// delete global.PromisePoly;
import {
  startTick,
  endTick,
  setInterval,
  clearInterval,
  setTimeout,
  clearTimeout,
  //@ts-ignore
  PromisePoly,
  sleep,
} from "polyfills"

import "shared/prototypes/roomPosition";
import "shared/utils/map/WorldPosition";

import { profiler, profile } from "shared/utils/profiling/profiler";
import wasteCpu from "shared/utils/profiling/wasteCPU";
import nodeNetwork from "shared/subsystems/NodeNetwork/nodeNetwork";
import nodeTypes from "shared/subsystems/NodeNetwork/nodeTypes";
import { Edge, Node } from "shared/subsystems/NodeNetwork";
import Logger from "shared/utils/logger";
import { movementManager } from "shared/subsystems/NodeNetwork/MovementManager";
import visual from "shared/utils/visual";
let logger = new Logger("world_new2");
profiler.clear();
profiler.start();
profiler.startCall("main:init");
console.log("---------------------------------TOP OF MAIN----------------------")


nodeNetwork.addRoomToAdditionQueue("W7N3");
let baseFlag = Game.flags["Flag1"];
let basePos = baseFlag.pos;
// let baseNode = nodeNetwork.addNode(basePos.toWorldPosition(), nodeTypes.BASE, false);
// nodeNetwork.addRoomsToNetwork(2);
let room = nodeNetwork.getRoom("W7N3");
if (room) {
    room.exitsAdded = true;
}
    // nodeNetwork.refineRooms();


nodeNetwork.maxEdgeUpdatesPerTick = 1;



nodeNetwork.refineEdges();
// edges.forEach(edge=>edge.refineEdge());
nodeNetwork.logNetwork();
// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
// export const loop = ErrorMapper.wrapLoop(async () => {

declare global {
    interface CreepMemory {
        targetFlag: string | null;
        lastFlag: string | null;
        //role: ROLES;
        targetId: Id<any> | null;
    }
}


enum ROLES {
    MINER = "miner",
    HAULER = "hauler",
    UPGRADER = "upgrader",
    WALKER = "walker",
}


visual.circle(Game.spawns["Spawn1"].pos, '#000000', 1, 1);
let firstTick = true;
export const loop = () => {
    logger.log("--------------------    loop    --------------------");
    if (!firstTick) {
        visual.circle(Game.spawns["Spawn1"].pos, '#ffffff', 1, 1);
    } else {
        firstTick = false;
    }
    startTick();
    let flags: Flag[] = Object.values(Game.flags);

    if (Game.time % 20 === 0) {
        let edges: Edge[] = [];
        // let nodes: Node[] = [baseNode];
        for (let f in Game.flags) {
            let flag = Game.flags[f]
            if (flag.name == "Flag1") {
                continue;
            }

            // if (!nodeNetwork.hasNode(flag.pos.toWorldPosition())) {
            //     logger.log("adding node", flag.pos.toWorldPosition(), nodeTypes.BUILDING);
            //     if (!nodeNetwork.hasRoom(flag.pos.roomName)) {
            //         nodeNetwork.addRoomToAdditionQueue(flag.pos.roomName);
            //         nodeNetwork.addRoomsToNetwork(1);
            //     }
            //     let newNode = nodeNetwork.addNode(flag.pos.toWorldPosition(), nodeTypes.BUILDING, false);
            //     nodes.push(newNode);
            //     // let edge = nodeNetwork.addEdge(baseNode, newNode);
            //     // edges.push(edge);
            // }
        }
        // nodeNetwork.connectNodes(nodes, nodes);
    }
    // let edge = nodeNetwork.getEdgeRefineQueue().shift();
    // if (edge) {
    //     edge.refineEdge();
    // }
    // nodeNetwork.edges.getAll().forEach(edge=>edge.refineEdge());
    // // nodeNetwork.refineEdges();
    // nodeNetwork.logNetwork();

    // Spawn and manage multiple creeps
    const MAX_CREEPS = {
        [ROLES.WALKER]: 1,
        [ROLES.MINER]: 0,
        [ROLES.UPGRADER]: 0,
        [ROLES.HAULER]: 0
    };
    const BODY_PARTS = {
        [ROLES.WALKER]: [MOVE],
        [ROLES.MINER]: [MOVE, WORK, WORK],
        [ROLES.UPGRADER]: [MOVE, CARRY, WORK, WORK],
        [ROLES.HAULER]: [MOVE, CARRY]
    };
    const spawn = Game.spawns["Spawn1"];

    if (spawn) {
        // Count creeps by role
        const creepCounts = _.countBy(Game.creeps, (creep) => creep.memory.role);
        logger.log("creepCounts", creepCounts);
        // Spawn creeps if needed
        for (const role of Object.values(ROLES)) {
            logger.log(`Checking if we should spawn a ${role} creep`, creepCounts[role] || 0, MAX_CREEPS[role as ROLES], !spawn.spawning);
            if ((creepCounts[role] || 0) < MAX_CREEPS[role as ROLES] && !spawn.spawning) {
                const newName = role + Game.time;
                let body = BODY_PARTS[role as ROLES];
                if (role === ROLES.WALKER && Math.random() < 0.5) {
                    //add random tough parts
                    let numToughParts = Math.floor(Math.random() * 3) + 1;
                    for (let i = 0; i < numToughParts; i++) {
                        //@ts-ignore
                        body.push(TOUGH);
                    }
                }
                //@ts-ignore
                const result = spawn.spawnCreep(body, newName, { memory: { role: role as ROLES } });
                if (result === OK) {
                    logger.log(`Spawning new ${role}: ${newName}`);
                }
                break;
            }
        }

    }
    // Manage all creeps
    for (let name in Game.creeps) {
        let creep = Game.creeps[name];
        logger.log(`Managing creep ${name} with role ${creep.memory.role}`);
        switch (creep.memory.role) {
            case ROLES.MINER:
                manageMiner(creep);
                break;
            case ROLES.UPGRADER:
                manageUpgrader(creep);
                break;
            case ROLES.HAULER:
                manageHauler(creep);
                break;
            case ROLES.WALKER:
                manageWalker(creep, flags);
                break;
            default:
                logger.log(`Unknown role: ${creep.memory.role}`);
                creep.memory.role = ROLES.WALKER;
                manageWalker(creep, flags);
                break;
        }
    }


    // let edgesNeedingRefinement = nodeNetwork.getEdgeRefineQueue();
    // let edge = edgesNeedingRefinement.shift();
    // if (edge) {
    //     edge.refineEdge();
    // }

    // edgesNeedingRefinement.forEach(edge=>edge.refineEdge());
    // edges.forEach(edge=>edge.refineEdge());
    movementManager.resolveMovements();
    endTick();
    nodeNetwork.displayRooms();
    nodeNetwork.displayNodes();

    // nodeNetwork.displayPosMap();
    // nodeNetwork.edges.getAll().forEach(edge=>logger.log(edge.id, edge.path.path && edge.path.path.map(pos=>pos.serialize())));
    // nodeNetwork.logNetwork();


};

function manageWalker(creep: Creep, flags: Flag[]) {
    let flagName = creep.memory.targetFlag;
    let flag;
    let moved: false | number = false;
    if (!flagName) {
        flag = flags[Math.floor(Math.random() * flags.length)];
        if (flag.name === creep.memory.lastFlag) {
            creep.say("🚬");
            movementManager.registerMovement({
                creep: creep,
                goalPos: creep.pos.toWorldPosition(),
                goalRange: 1,
                priority: 0,
            });
            return;
        }
        creep.memory.targetFlag = flag.name;
    } else {
        flag = flags.find(f => f.name === flagName);
        if (!flag) {
            logger.log("flag not found", flagName);
            creep.memory.lastFlag = creep.memory.targetFlag;
            creep.memory.targetFlag = null;
            //@ts-ignore
            creep.memory._cachedPath = null;
            movementManager.registerMovement({
                creep: creep,
                goalPos: creep.pos.toWorldPosition(),
                goalRange: 1,
                priority: 0,
            });
            return;
        }
    }

    if (creep.pos.isNearTo(flag.pos)) {
        creep.memory.lastFlag = creep.memory.targetFlag;
        creep.memory.targetFlag = null;
        creep.say("🏁");
    } else {
        // nodeNetwork.moveTo(creep, {
        //     pos: flag.pos.toWorldPosition(),
        //     range: 1
        // });
        creep.moveTo(flag.pos, {range: 0, visualizePathStyle: {stroke: '#00ff00'}, ignoreCreeps: true, heuristicWeight: 1, reusePath: 100});
        moved = 1;
    }
    if (!moved) {
        //we didn't move, register that non movement to the manager
        movementManager.registerMovement({
            creep: creep,
            goalPos: flag.pos.toWorldPosition(),
            goalRange: 1,
            priority: 0,
        });
    }
}

function manageMiner(creep: Creep) {
    if (!creep.memory.targetId) {
        const sources = creep.room.find(FIND_SOURCES);
        if (sources.length > 0) {
            let closestSource = creep.pos.findClosestByPath(sources, {

            });
            if (closestSource) {
                creep.memory.targetId = closestSource.id;
            }
        }
    }

    const source = Game.getObjectById(creep.memory.targetId as Id<Source>);
    if (source) {
        if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
            creep.moveTo(source, {visualizePathStyle: {stroke: '#ffaa00'}, ignoreCreeps: false, heuristicWeight: 1, reusePath: 100});
        } else {
            movementManager.registerMovement({
                creep: creep,
                goalPos: creep.pos.toWorldPosition(),
                goalRange: 1,
                priority: 0,
            });
        }
    }
}

function manageUpgrader(creep: Creep) {
    if (creep.store.getUsedCapacity() == 0) {
        if (!creep.memory.targetId) {
            const droppedEnergy = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {
                filter: resource => resource.resourceType == RESOURCE_ENERGY
            });
            if (droppedEnergy) {
                creep.memory.targetId = droppedEnergy.id;
            }
        }

        const target = Game.getObjectById(creep.memory.targetId as Id<Resource>);
        if (target) {
            if (creep.pos.getRangeTo(target) > 1) {
                creep.moveTo(target, {range: 1, visualizePathStyle: {stroke: '#ffffff'}, ignoreCreeps: true, heuristicWeight: 1, reusePath: 100});
            }
            let result = creep.pickup(target);
            if (result == OK) {
                creep.memory.targetId = null;
            }
        } else {
            creep.memory.targetId = null;
        }
    } else {
        if (creep.room.controller) {
            creep.moveTo(creep.room.controller, {range: 3, visualizePathStyle: {stroke: '#ffffff'}, ignoreCreeps: true, heuristicWeight: 1, reusePath: 100});
            creep.upgradeController(creep.room.controller);
        }
    }
}

function manageHauler(creep: Creep) {
    let moved: false | number = false;

    if (creep.store.getFreeCapacity() > 0) {
        if (!creep.memory.targetId) {
            const droppedEnergy = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {
                filter: resource => resource.resourceType == RESOURCE_ENERGY && (!resource.room?.controller || resource.pos.getRangeTo(resource.room!.controller!.pos) > 3)
            });
            if (droppedEnergy) {
                creep.memory.targetId = droppedEnergy.id;
            }
        }

        const target = Game.getObjectById(creep.memory.targetId as Id<Resource>);
        if (target) {
            if (creep.pickup(target) == ERR_NOT_IN_RANGE) {
                creep.moveTo(target, {visualizePathStyle: {stroke: '#ffaa00'}, ignoreCreeps: true, heuristicWeight: 1, reusePath: 100});
                moved = 1;
            } else {
                creep.memory.targetId = null;
            }
        } else {
            creep.memory.targetId = null;
        }
    } else {
        if (!creep.memory.targetId) {
            const targets = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return (structure.structureType == STRUCTURE_EXTENSION ||
                            structure.structureType == STRUCTURE_SPAWN) &&
                        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                }
            });
            if (targets.length > 0) {
                creep.memory.targetId = targets[0].id;
            }
        }

        const target = Game.getObjectById(creep.memory.targetId as Id<StructureExtension | StructureSpawn>);
        if (target) {
            if (creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(target, {visualizePathStyle: {stroke: '#ffffff'}, ignoreCreeps: true, heuristicWeight: 1, reusePath: 100});
                moved = 1;
            } else {
                creep.memory.targetId = null;
            }
        } else {
            // Drop energy near the controller for upgraders
            const controller = creep.room.controller;
            if (controller && creep.pos.getRangeTo(controller) > 3) {
                creep.moveTo(controller, {range: 3, visualizePathStyle: {stroke: '#ffffff'}, ignoreCreeps: true, heuristicWeight: 1, reusePath: 100});
                moved = 3;
            } else {
                creep.drop(RESOURCE_ENERGY);
            }
        }
    }

    if (!moved) {
        movementManager.registerMovement({
            creep: creep,
            goalPos: creep.pos.toWorldPosition(),
            goalRange: 1,
            priority: 0,
        });
    }
}
