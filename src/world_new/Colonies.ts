import MemoryManager from "shared/utils/memory/MemoryManager";
import MemoryMap from "shared/utils/memory/MemoryMap";
import type { Colony } from "./Colony";
import Logger from "shared/utils/logger";
import queues from "./queues";
let logger = new Logger("Colonies");
import { setInterval } from "shared/polyfills";
import { builtInQueues } from "shared/polyfills/tasks";
let colonies = MemoryManager.loadOrCreateObject(MemoryMap, "empire_colonies", false) as MemoryMap<Colony>;


export function getColony(mainRoomName: string) {
    let colony = colonies.get(mainRoomName);
    if (!colony) {
        return false;
    }
    return colony;
}
export function removeColony(mainRoomName: string) {
    colonies.delete(mainRoomName);
}
export function addColony(colony: Colony) {
    logger.log("adding colony", colony.id);
    colonies.set(colony.id, colony);
}
export function hasColony(mainRoomName: string) {
    return colonies.has(mainRoomName);
}
export function getAllColonies() {
    // logger.log("getAllColonies", colonies, colonies.values());
    return colonies.values();
}

setInterval(() => colonies.forEach((colony) => colony.init()), 1, builtInQueues.START_TICK, true);
setInterval(() => colonies.forEach((colony) => colony.postInit()), 1, queues.POST_INIT, true);
setInterval(() => colonies.forEach((colony) => colony.update()), 1, queues.UPDATE, true);
setInterval(() => colonies.forEach((colony) => colony.act()), 1, queues.ACTIONS, true);
