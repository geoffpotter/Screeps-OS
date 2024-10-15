import { AnyAction } from "../../actions/base/BaseAction";

import MemoryManager, { baseStorable, StorableCreatableClass } from "shared/utils/memory/MemoryManager";
import MemoryGroupedCollection, { MemoryGroupedCollectionJSON } from "shared/utils/memory/MemoryGroupedCollection";
import { setInterval } from "shared/polyfills/setInterval";
import { PlayerStatus, RoomStatus, updateRoomIntel } from "shared/subsystems/intel/intel";
import WorldPosition, { WorldPositionData } from "shared/utils/map/WorldPosition";
import { setTimeout } from "shared/polyfills/setTimeout";
import { builtInQueues, queueMicroTask } from "shared/polyfills/tasks";
import Logger from "shared/utils/logger";
import { JobMemory } from "world_new/jobs/Job";
import { ScoutAction, ScoutActionMemory } from "world_new/actions/economy/ScoutAction";
import Empire from "world_new/Empire";
import { Colony } from "world_new/Colony";
import { RoomMode } from "./RoomMode";
import { getRoomWrapper, addRoomWrapper } from "./RoomWrappers";
import nodeNetwork from "shared/subsystems/NodeNetwork/nodeNetwork";
let logger = new Logger("RoomWrapper");


declare global {
    interface RoomMemory {
        wrapper: RoomWrapperData;
    }
}

interface RoomWrapperData {
    id: string;
    wpos: WorldPositionData;
    lastSeen: number;
    refreshEvery: number;
    scoutAction: ScoutActionMemory;
    roomMode: RoomMode;
    addedSurroundingRooms: boolean;
}


// just a dummy class to satisfy typescript
class GameRoom extends RoomObject {
    public id: Id<GameRoom> = "room" as Id<GameRoom>;
}




export class RoomWrapper /* extends GameObjectWrapper<GameRoom>*/ implements StorableCreatableClass<RoomWrapper, typeof RoomWrapper, RoomWrapperData> {
    static fromJSON(data: RoomWrapperData): RoomWrapper {
        let wrapper = new RoomWrapper(data.id);

        wrapper.lastSeen = data.lastSeen;
        wrapper.refreshEvery = data.refreshEvery;
        wrapper.scoutAction = ScoutAction.fromJSON(data.scoutAction);
        wrapper.roomMode = data.roomMode;
        wrapper.addedSurroundingRooms = data.addedSurroundingRooms;
        return wrapper;
    }
    toJSON(): RoomWrapperData {
        return {
            id: this.id,
            wpos: this.wpos,
            lastSeen: this.lastSeen,
            refreshEvery: this.refreshEvery,
            scoutAction: this.scoutAction as unknown as ScoutActionMemory,
            roomMode: this.roomMode,
            addedSurroundingRooms: this.addedSurroundingRooms,
        };
    }

    getObject(): GameRoom | null {
        return null;
    }
    id: string;
    get fullId(): string {
        return "Room:" + this.id;
    }
    wpos: WorldPosition;
    lastSeen: number = 0;
    wrapperType = "RoomWrapper";
    refreshEvery = 100;
    addedSurroundingRooms = false;
    scoutAction: ScoutAction;
    roomMode: RoomMode = RoomMode.UNUSED;
    colony: Colony | false = false;
    readonly exists: boolean = true;

    private actionsRegistered = false;

    constructor(roomName: string) {
        this.id = roomName;
        this.wpos = (new RoomPosition(25, 25, roomName)).toWorldPosition();
        this.scoutAction = new ScoutAction(this);
        this.scoutAction.maxAssignments = 1;
        if (!Memory.rooms) {
            Memory.rooms = {};
        }
        if (!Memory.rooms[this.id]) {
            //@ts-ignore
            Memory.rooms[this.id] = {};
        }
        Memory.rooms[this.id].wrapper = this as unknown as RoomWrapperData;

    }
    registerActions(): void {
        if (this.actionsRegistered) {
            return;
        }
        if (this.colony) {
            // logger.log("Registering actions for room", this.id, this.scoutAction);
            Empire.registerAction(this.scoutAction);
            this.actionsRegistered = true;
        }
        //@ts-ignore
        // logger.log("Registered actions", Empire.registeredActions.size, Empire.registeredActions.getAll());
    }
    public get room(): Room | false {
        if (Game.rooms[this.id]) {
            this.lastSeen = Game.time;
            return Game.rooms[this.id];
        }
        return false;
    }

    init() {
        this.registerActions();
        if (!this.room) {
            return;
        }
        if (!nodeNetwork.hasRoom(this.id)) {
            nodeNetwork.addRoomToAdditionQueue(this.id);
        }
        if (!this.addedSurroundingRooms) {
            this.addSurroundingRooms();
            this.addedSurroundingRooms = true;
        }
        let roomIntel = updateRoomIntel(this.room, this);
        let roomMode = this.roomMode;
        if (roomMode == RoomMode.UNUSED) {
            switch(roomIntel.roomOwnership) {
                case PlayerStatus.NEUTRAL:
                    if (roomIntel.roomStatus == RoomStatus.RESERVED) {
                        roomMode = RoomMode.NEUTRAL_RESERVED;
                    } else if (roomIntel.roomStatus == RoomStatus.OWNED) {
                        roomMode = RoomMode.NEUTRAL_OWNED;
                    }
                    break;
                case PlayerStatus.MINE:
                    if (roomMode == RoomMode.UNUSED) {
                        if (roomIntel.roomStatus == RoomStatus.RESERVED) {
                            roomMode = RoomMode.REMOTE_RESERVED;
                        } else if (roomIntel.roomStatus == RoomStatus.OWNED) {
                            roomMode = RoomMode.REMOTE_OWNED;
                        }
                    }
                    break;
                case PlayerStatus.ENEMY:
                    if (roomIntel.roomStatus == RoomStatus.RESERVED) {
                        roomMode = RoomMode.ENEMY_RESERVED;
                    } else if (roomIntel.roomStatus == RoomStatus.OWNED) {
                        roomMode = RoomMode.ENEMY_OWNED;
                    }
                    break;
                default:
                    if (roomMode == RoomMode.UNUSED) {
                        // room isn't owned, so have to go on intel
                        if (roomIntel.creeps[PlayerStatus.FRIENDLY].size > 0) {
                            roomMode = RoomMode.FRIENDLY_ACTIVITY;
                        } else if (roomIntel.creeps[PlayerStatus.ENEMY].size > 0) {
                            roomMode = RoomMode.ENEMY_ACTIVITY;
                        } else if (roomIntel.creeps[PlayerStatus.NEUTRAL].size > 0) {
                            roomMode = RoomMode.NEUTRAL_ACTIVITY;
                        } else {
                            roomMode = RoomMode.UNUSED;
                        }
                    }
                    break;
            }
            this.roomMode = roomMode;
        }
    }
    update() {
        // logger.log("Updating room wrapper", this.id, this.roomMode, this.needsScouting(), this.lastSeen, this.refreshEvery);
        this.scoutAction.currentDemand = this.needsScouting() ? {move:1} : {};
        if (this.colony) {
            this.scoutAction.display();
        }
    }
    needsScouting(): boolean {
        return Game.time > this.lastSeen + this.refreshEvery;
    }
    addSurroundingRooms() {
        let exits = Game.map.describeExits(this.id);
        for (let e in exits) {
            let exitRoomName = exits[e as ExitKey];
            if (exitRoomName) {
                //@ts-ignore
                let exitRoom:RoomWrapper = getRoomWrapper(exitRoomName);
                if (!exitRoom) {
                    exitRoom = new RoomWrapper(exitRoomName);
                    addRoomWrapper(exitRoom);
                }
                setTimeout(()=>{
                    exitRoom.init();
                }, 0);
                // logger.log("Adding room " + exitRoomName);
            }
        }
    }
}

export function getOrMakeRoomWrapper(roomName: string): RoomWrapper {
    let wrapper = getRoomWrapper(roomName);
    if (!wrapper) {
        wrapper = new RoomWrapper(roomName);
        addRoomWrapper(wrapper);
    }
    return wrapper;
}

//ensure we have a room wrapper for every room we can see on init
for (let roomName in Game.rooms) {
    //@ts-ignore
    let wrapper:RoomWrapper = getOrMakeRoomWrapper(roomName);
    let room = wrapper.room;
    if (!room) {
        throw new Error("This shouldn't happen:Room " + roomName + " not found");
    }
}

setInterval(()=>{
    for(let roomName in Game.rooms) {
        let wrapper = getRoomWrapper(roomName);
        if(!wrapper) {
            wrapper = new RoomWrapper(roomName);
            addRoomWrapper(wrapper);
        }
    }
}, 1, builtInQueues.START_TICK, true);
