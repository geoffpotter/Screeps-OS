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
import { HasStorageWrapper } from "../base/HasStorageWrapper";
import { ResourceInfoCollection } from "shared/utils/Collections/ResourceInfoCollection";

let logger = new Logger("RoomPositionWrapper");




interface RoomPositionWrapperData {
    id: string;
    wpos: WorldPositionData;
    lastSeen: number;
}


// just a dummy class to satisfy typescript
class fakeWorldPosition extends RoomObject {
    public id: Id<fakeWorldPosition> = "room" as Id<fakeWorldPosition>;
    //@ts-ignore
    public store: Store<RESOURCE_ENERGY, false>;
    public hits: number = 0;
    public hitsMax: number = 0;
}




export class RoomPositionWrapper extends HasStorageWrapper<any> implements StorableCreatableClass<RoomPositionWrapper, typeof RoomPositionWrapper, RoomPositionWrapperData> {
    static fromJSON(data: RoomPositionWrapperData): RoomPositionWrapper {
        let wrapper = new RoomPositionWrapper(data.id, WorldPosition.fromJSON(data.wpos));

        wrapper.lastSeen = data.lastSeen;
        return wrapper;
    }

    toJSON(): any {
        return {
            id: this.id,
            wpos: this.wpos,
            lastSeen: this.lastSeen
        };
    }

    getObject(): fakeWorldPosition {
        return this.wpos as any;
    }
    // id: string;
    // get fullId(): string {
    //     return "Room:" + this.id;
    // }
    // wpos: WorldPosition;
    // lastSeen: number = 0;
    // wrapperType = "RoomPositionWrapper";

    // colony: Colony | false = false;
    // readonly exists: boolean = true;

    store: ResourceInfoCollection = new ResourceInfoCollection();

    constructor(roomName: string, pos: WorldPosition) {
        super(roomName as any);
        // this.id = roomName;
        this.wpos = pos;


    }
    public get room(): Room | false {
        if (Game.rooms[this.id]) {
            this.lastSeen = Game.time;
            return Game.rooms[this.id];
        }
        return false;
    }

    init() {

        if (!this.room) {
            return;
        }
    }
    update() {

    }
}

