import Logger from "shared/utils/logger";

const logger = new Logger("main");

// import "core-js";
console.log("----------------------------------------------- top of main ----------------------------------------------");
import "shared/polyfills"
import console from "shared/prototypes/console";
import "shared/prototypes/roomPosition";
import "shared/utils/map/WorldPosition";
// import "shared/prototypes/CreepMovement";
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
    sleep
} from "shared/polyfills"
import { profiler, profile } from "shared/utils/profiling/profiler";
import benchmark, { benchmarkAsync } from "shared/utils/profiling/benchmark";
import { asyncMainLoop } from "shared/utils/profiling/asyncLoop";
import { queueTask } from "shared/polyfills/tasks";
import { process_start_tick, process_end_tick } from "shared/utils/profiling/profiler";
// profiler.clear();
// profiler.start();
// profiler.startCall("main.init");


import { tickPhases, getQueueManager } from "shared/polyfills/tasks";
import { TaskQueue, TaskPriorities } from "shared/polyfills/tasks";

import queues from "./queues";

import "./wrappers";
import "./Colonies";
import "./Empire";
import "./Colony";

setInterval(() => {
    //remove dead creeps from memory
    for (let creepName in Memory.creeps) {
        if (!(creepName in Game.creeps)) {
            delete Memory.creeps[creepName];
        }
    }
}, 1500);



import speedrun from "./speedrun";
import { CreepRequest } from "./wrappers/creep/CreepRequest";
import WorldPosition from "shared/utils/map/WorldPosition";
import { getRoomWrapper } from "./wrappers/room/RoomWrappers";
import { getColony } from "./Colonies";
import { getOrMakeRoomWrapper, RoomMode } from "./wrappers/room";
import { getOrMakeColony } from "./Colony";
import { priority } from "shared/utils/priority";
import nodeNetwork from "shared/subsystems/NodeNetwork/nodeNetwork";
import nodeTypes from "shared/subsystems/NodeNetwork/nodeTypes";
import { Edge, makeEdgeId } from "shared/subsystems/NodeNetwork";



let mainRoomName = "W7N3";
let remoteNames = ["W7N4", "W8N3", "W6N3"];
if (Game.rooms.sim) {
    mainRoomName = "sim";
    remoteNames = [];
}

let mainRoom = getOrMakeRoomWrapper(mainRoomName);
// let remoteNames = ["W7N4"];
// let remoteNames: string[] = [];
let remoteRooms = remoteNames.map(name=>getOrMakeRoomWrapper(name));
remoteRooms.forEach(room=>room.addedSurroundingRooms = true);
let colony = getOrMakeColony(mainRoom.id);
remoteRooms.forEach(room=>colony.addRoom(room, RoomMode.REMOTE_UNOWNED));



// nodeNetwork.addRoomToAdditionQueue("W7N3");
// let basePos = new RoomPosition(42, 8, "W7N3");
// let baseNode = nodeNetwork.addNode(basePos.toWorldPosition(), nodeTypes.BASE, false);
// nodeNetwork.addRoomsToNetwork(2);
// let room = nodeNetwork.getRoom("W7N3");
// if (room) {
//     room.exitsAdded = true;
// }
//     // nodeNetwork.refineRooms();

// let edges: Edge[] = [];
// for (let f in Game.flags) {
//     let flag = Game.flags[f]

//     if (!nodeNetwork.hasNode(flag.pos.toWorldPosition())) {
//         logger.log("adding node", flag.pos.toWorldPosition(), nodeTypes.BUILDING);
//         if (!nodeNetwork.hasRoom(flag.pos.roomName)) {
//             nodeNetwork.addRoomToAdditionQueue(flag.pos.roomName);
//             nodeNetwork.addRoomsToNetwork(1);
//         }
//         let newNode = nodeNetwork.addNode(flag.pos.toWorldPosition(), nodeTypes.BUILDING, false);
//         let edge = nodeNetwork.addEdge(baseNode, newNode);
//         edges.push(edge);
//     }
// }
nodeNetwork.maxEdgeUpdatesPerTick = 25;
// nodeNetwork.refineEdges();


// let pos1 = new RoomPosition(40, 13, "W7N3").toWorldPosition();
// let pos2 = new RoomPosition(40, 11, "W7N3").toWorldPosition();
// let node1 = nodeNetwork.addNode(pos1, nodeTypes.BASE, false);
// let node2 = nodeNetwork.addNode(pos2, nodeTypes.BASE, false);
// logger.log(makeEdgeId(node1.id, node2.id), makeEdgeId(node2.id, node1.id));


async function asyncMain() {
    console.log("-------------- start main loop --------------");

    speedrun.run({ position: { x: 1, y: 25 }, avgDuration: 250 })




    // nodeNetwork.refineEdges();
    // let edgesNeedingRefinement = nodeNetwork.getEdgeRefineQueue();
    // let edge = edgesNeedingRefinement.shift();
    // if (edge) {
    //     edge.refineEdge();
    // }

    // edgesNeedingRefinement.forEach(edge=>edge.refineEdge());
    // edges.forEach(edge=>edge.refineEdge());

    // nodeNetwork.displayRooms();
    // nodeNetwork.displayNodes();

    // nodeNetwork.displayPosMap();
    // nodeNetwork.edges.getAll().forEach(edge=>logger.log(edge.path.path));
    // nodeNetwork.logNetwork();

    // let creepRequest = new CreepRequest(new WorldPosition(25, 25), {
    //     name: "scout",
    //     fatness: 0,
    //     toughness: 0,
    //     priority: priority.BOTTOM,
    //     primaryPart: MOVE,
    //     secondaryPart: false,
    //     secondaryPerPrimary: 0,
    //     maxLevel: 1
    // });
    // logger.log(creepRequest.designBody(300));
    // logger.log(creepRequest.designBody(450));
    // logger.log(creepRequest.designBody(700));
    // logger.log(creepRequest.designBody(1500));

    // logger.log("fatness 1");
    // logger.log(creepRequest.getBodyAtLevel(1));
    // logger.log(creepRequest.getBodyAtLevel(2));
    // logger.log(creepRequest.getBodyAtLevel(3));
    // logger.log(creepRequest.getBodyAtLevel(4));

    // logger.log("fatness 0.5");
    // creepRequest.options.fatness = 0.5;
    // logger.log(creepRequest.getBodyAtLevel(1));
    // logger.log(creepRequest.getBodyAtLevel(2));
    // logger.log(creepRequest.getBodyAtLevel(3));
    // logger.log(creepRequest.getBodyAtLevel(4));

    // logger.log("fatness 2");
    // creepRequest.options.fatness = 2;
    // logger.log(creepRequest.getBodyAtLevel(1));
    // logger.log(creepRequest.getBodyAtLevel(2));
    // logger.log(creepRequest.getBodyAtLevel(3));
    // logger.log(creepRequest.getBodyAtLevel(4));

    console.log("-------------- end main loop --------------");
}

export const loop = asyncMainLoop(asyncMain);

console.log("-------------- end main --------------");
