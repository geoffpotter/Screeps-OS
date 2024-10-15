import MemoryManager from "shared/utils/memory/MemoryManager";
import type { RoomWrapper } from "./RoomWrapper";
import { builtInQueues } from "shared/polyfills/tasks";
import { setInterval } from "shared/polyfills/setInterval";

let roomWrappers: Map<string, RoomWrapper> = new Map();

export function getAllRoomWrappers() {
    return roomWrappers.values();
}

export function getRoomWrapper(roomName: string): RoomWrapper | false {
    if (roomName.startsWith("Room:")) {
        roomName = roomName.slice(5);
    }
    try {
        let pos = new RoomPosition(25, 25, roomName);
    } catch(e) {
        throw new Error("Invalid room name: " + roomName);
    }
    // console.log("getting room wrapper", roomName, roomWrappers.has(roomName), roomWrappers.size);
    if (!roomWrappers.has(roomName)) {
        let storedWrapper = MemoryManager.getObjectByTypeAndId("RoomWrapper", roomName) as RoomWrapper;
        if (storedWrapper) {
            roomWrappers.set(roomName, storedWrapper);
        } else {
            return false;
        }
    }
    return roomWrappers.get(roomName)!;
}
export function addRoomWrapper(wrapper: RoomWrapper) {
    roomWrappers.set(wrapper.id, wrapper);
}



let start = Game.time;
let runWrappers = () => {
    // logger.log("Running wrappers", roomWrappers.size);
    for (let wrapper of getAllRoomWrappers()) {
        wrapper.init();
    }
}
setInterval(runWrappers, 1, builtInQueues.START_TICK, true);



let runUpdate = () => {
    // logger.log("Running update", roomWrappers.size);
    for (let wrapper of getAllRoomWrappers()) {
        wrapper.update();
    }
}
setInterval(runUpdate, 1, builtInQueues.START_TICK, true);
