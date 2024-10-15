import { MemoryMap,  MemoryManager} from "shared/utils/memory";
import type { AnyGameObjectWrapper, GameObjectWrapper } from "./GameObjectWrapper";
import queues from "world_new/queues";
import { constructorTypeOf } from "shared/utils/types";
import Logger from "shared/utils/logger";
import { setInterval } from "shared/polyfills/setInterval";

const logger = new Logger("AllGameObjects");


let gameObjectWrappers: MemoryMap<GameObjectWrapper<any>> = MemoryManager.loadOrCreateObject(MemoryMap, "gameObjectWrappers") as MemoryMap<GameObjectWrapper<any>>;

export type GameObject = RoomObject & _HasId;



export function getGameObjectWrapperById(id:string):GameObjectWrapper<any> | undefined {
    return gameObjectWrappers.get(id);
}
export function removeGameObjectWrapperById(id:string) {
    gameObjectWrappers.delete(id);
}
export function addGameObjectWrapper(wrapper:GameObjectWrapper<any>) {
    gameObjectWrappers.set(wrapper.id, wrapper);
}
export function hasGameObjectWrapper(id:string):boolean {
    return gameObjectWrappers.has(id);
}


//run all game objects every tick
setInterval(() => {
    gameObjectWrappers.forEach(wrapper => {
        if (!wrapper.exists) {
            // logger.log("deleting wrapper", wrapper.id)
            gameObjectWrappers.delete(wrapper.id);
            return;
        }
        //console.log("running wrapper", wrapper.id)
        wrapper.init();
    })
}, 1, queues.TICK_INIT, true)

setInterval(() => {
    gameObjectWrappers.forEach(wrapper => {
        if (!wrapper.exists) {
            // logger.log("deleting wrapper", wrapper.id)
            gameObjectWrappers.delete(wrapper.id);
            return;
        }
        wrapper.update();
    })
}, 1, queues.UPDATE, true)


declare global {
    interface RoomObject {
        get id(): string;
        getWrapper<T extends GameObjectWrapper<any>>(): T;
    }
}

export type GameObjectClass = constructorTypeOf<GameObject>;
let objectWrapperRegistry = new Map<GameObjectClass, constructorTypeOf<AnyGameObjectWrapper>>();
export function registerObjectWrapper(gameObject:GameObjectClass, wrapperClass: constructorTypeOf<AnyGameObjectWrapper>) {
    // logger.log("registerObjectWrapper", gameObject, wrapperClass);
    objectWrapperRegistry.set(gameObject, wrapperClass);
}
export function getObjectWrapperClass(gameObject:GameObjectClass):constructorTypeOf<AnyGameObjectWrapper> | undefined {
    return objectWrapperRegistry.get(gameObject);
}



// //@ts-ignore
// RoomObject.prototype.__defineGetter__("id", function() {
//     //@ts-ignore
//     let wpos = this.pos.toWorldPosition();
//     return wpos.x + "-" + wpos.y;
// })



