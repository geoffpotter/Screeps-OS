import WorldPosition, { WorldPositionData } from "shared/utils/map/WorldPosition";
import MemoryManager, { StorableClass } from "shared/utils/memory/MemoryManager";
import { baseStorable, StorableCreatableClass } from "shared/utils/memory";
import { constructorTypeOf, ConstructorWrappingFunction } from "shared/utils/types";
import { getPlayerIntel, playerName, PlayerStatus } from "shared/subsystems/intel";
import visual from "shared/utils/visual";
import Logger from "shared/utils/logger";
import { addRoomWrapper, getRoomWrapper } from "../room/RoomWrappers";
import type { RoomWrapper } from "../room/RoomWrapper";
import { Job } from "world_new/jobs/Job";
import { Colony } from "world_new/Colony";
import { removeGameObjectWrapperById, addGameObjectWrapper, hasGameObjectWrapper, getGameObjectWrapperById, getObjectWrapperClass, GameObjectClass } from "./AllGameObjects";
import Node from "shared/subsystems/NodeNetwork/node";
import nodeNetwork, { NodeNetwork } from "shared/subsystems/NodeNetwork/nodeNetwork";
import nodeTypes from "shared/subsystems/NodeNetwork/nodeTypes";

const logger = new Logger("GameObjectWrapper");
logger.enabled = false;

export type GameObject = RoomObject & _HasId;

export type AnyGameObjectWrapper = GameObjectWrapper<GameObject>;

declare global {
    interface RoomObject {
        makeFakeWrapper(): GameObjectWrapper<any>;
    }
}

RoomObject.prototype.makeFakeWrapper = function() {
    logger.error("making fake wrapper!!", this.id, this.constructor.name, new Error().stack);
    return new GameObjectWrapper(this.id as Id<GameObject>);
}

export interface GameObjectWrapperData {
    id: string;
    exists: boolean;
    owner: string;
    wpos: WorldPositionData;
    lastSeen: number;
    timeout: number;
}
export class GameObjectWrapper<T extends GameObject> extends baseStorable implements StorableClass<GameObjectWrapper<T>, typeof GameObjectWrapper, GameObjectWrapperData> {
    static fromJSON(json: GameObjectWrapperData, wrapper?: GameObjectWrapper<any>): GameObjectWrapper<any> {
        if(!wrapper) {
            throw new Error("No wrapper provided");
        }
        wrapper._exists = json.exists;
        wrapper.lastSeen = json.lastSeen;
        wrapper.timeout = json.timeout;
        wrapper.wpos = WorldPosition.fromJSON(json.wpos);
        wrapper.owner = json.owner;
        return wrapper;
    }
    toJSON(): GameObjectWrapperData {
        return {
            id: this.id,
            exists: this.exists,
            owner: this.owner,
            wpos: this.wpos,
            lastSeen: this.lastSeen,
            timeout: this.timeout,
        }
    }
    lastSeen: number = Game.time;
    timeout: number = 500;
    protected _exists: boolean = true;
    wpos: WorldPosition;
    owner: string = "Screeps";
    private _actionsRegistered: boolean = false;
    private _nodes: Node[] | null = null;

    get wrapperType(): string {
        return this.constructor.name;
    }
    get roomWrapper(): RoomWrapper {

        let roomWrapper:RoomWrapper|false = getRoomWrapper(this.wpos.roomName);
        if(!roomWrapper) {
            throw new Error("No room wrapper found for " + this.wpos.roomName);
        }
        return roomWrapper as RoomWrapper;
    }
    get colony(): Colony | false {
        if(!this.roomWrapper) return false;
        if(!this.roomWrapper.colony) return false;
        return this.roomWrapper.colony;
    }
    get my() {
        return this.owner === playerName;
    }
    get  enemy() {
        let playerIntel = getPlayerIntel(this.owner);
        return playerIntel.status === PlayerStatus.ENEMY;
    }
    get neutral() {
        let playerIntel = getPlayerIntel(this.owner);
        return playerIntel.status === PlayerStatus.NEUTRAL;
    }
    get friendly() {
        let playerIntel = getPlayerIntel(this.owner);
        return playerIntel.status === PlayerStatus.FRIENDLY;
    }
    get exists(): boolean {
        return this._exists;
    }
    public constructor(id: Id<T>) {
        super(id);
        this.wpos = new WorldPosition(0,0);
        this.owner = "neutral";
        this.getObject();
        MemoryManager.registerObject(this);
        addGameObjectWrapper(this);
    }
    getObject() {
        let obj = Game.getObjectById(this.id as Id<T>);
        if (obj) {
            this.onSeen(obj);
        }
        return obj;
    }

    delete() {
        logger.log("deleting wrapper", this.id)
        removeGameObjectWrapperById(this.id);
        this._exists = false;
        MemoryManager.unregisterObject(this);
        this.removeNodesFromNetwork();
    }
    registerActions() {
        if(this._actionsRegistered) {
            return;
        }
        this._actionsRegistered = true;
    }

    display() {
        visual.drawText(this.id, this.wpos.toRoomPosition(), "white");
    }
    init() {
        if (!this._actionsRegistered) {
            this.registerActions();
        }
        // logger.log("init", this.id, this.exists, this.owner, this.wpos)
        // this.display();
        if ((this.lastSeen + this.timeout) < Game.time) {
            logger.log("deleting wrapper because timeout", this.id, this.lastSeen, Game.time, this.timeout)
            this.delete();
            return;
        }

        if (this.owner === playerName) {
            //if I own it and it's not visible, it's dead.
            let obj = this.getObject();
            if(!obj) {
                logger.log("deleting wrapper because we own it but it's not visible", this.id, this.lastSeen, Game.time, this.timeout)
                this.delete();
                return;
            }
        }
        //do nothing, override this in more specfic wrappers
    }
    update() {
        let obj = this.getObject();
        if (obj) {
            this.onSeen(obj);
        }
    }

    onSeen(gameObject: GameObject) {
        this.wpos = gameObject.pos.toWorldPosition();
        this.lastSeen = Game.time;
        this._exists = true;
        //@ts-ignore
        this.owner = gameObject.owner?.username || "Screeps";
    }

    createAndAddNodes(range: number, type: string = nodeTypes.BUILDING, autoAddEdges: boolean = true): Node[] {
        // if (this.wpos.roomName == "W7N3") {
        //     logger.enabled = true;
        // } else {
        //     logger.enabled = false;
        // }
        logger.log("creating nodes", this.id, this.wpos.roomName, range);
        if (this._nodes && this._nodes.length > 0) {
            logger.log("returning cached nodes", this.id);
            return this._nodes;
        }

        const nodes: Node[] = [];
        const room = Game.rooms[this.wpos.roomName];
        if (!room) {
            logger.log("no room", this.wpos.roomName);
            return nodes;
        }
        let pos = this.wpos.toRoomPosition();
        const startX = Math.max(0, pos.x - range);
        const startY = Math.max(0, pos.y - range);
        const endX = Math.min(49, pos.x + range);
        const endY = Math.min(49, pos.y + range);
        logger.log("creating nodes within", range, "of", this.id, startX, startY, endX, endY);
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                if (x === pos.x && y === pos.y) continue; // Skip the object's own position

                const newPos = new RoomPosition(x, y, this.wpos.roomName);
                if (newPos.isClearSpace()) {
                    const worldPos = newPos.toWorldPosition();
                    let node = nodeNetwork.addNode(worldPos, type, autoAddEdges);
                    nodes.push(node);
                } else {
                    logger.log("node not clear", newPos);
                }
            }
        }

        this._nodes = nodes;
        return nodes;
    }

    removeNodesFromNetwork() {
        if (this._nodes) {
            for (const node of this._nodes) {
                nodeNetwork.removeNode(node);
            }
            this._nodes = null;
        }
    }

}

//@ts-ignore
RoomObject.prototype.getWrapper = function<T extends GameObjectWrapper<any>>() {
    // logger.enabled = this instanceof Tombstone;
    // logger.log("get wrapper", this.id, this.constructor.name, this instanceof Tombstone);
    if (hasGameObjectWrapper(this.id)) {
        // logger.log("has wrapper", this.id);
        let wrapper = getGameObjectWrapperById(this.id);
        if (wrapper)
            return wrapper;
    }
    // logger.log("no wrapper", this.id);
    let wrapperFunc = getObjectWrapperClass(this.constructor as GameObjectClass);
    if(!wrapperFunc) {
        throw new Error("No wrapper registered for " + this);
        // logger.error("No wrapper registered for " + this);
        // let fakeWrapper = new;
        // addGameObjectWrapper(fakeWrapper);
        // return fakeWrapper as T;
    }
    let wrapper = new wrapperFunc(this.id as Id<GameObject>);
    // logger.log("get wrapper", wrapper.fullId, wrapper.id, this.id, new Error().stack)
    addGameObjectWrapper(wrapper);
    return wrapper as T;
}
