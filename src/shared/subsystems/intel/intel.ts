import { getSettings } from "shared/utils/settings";
import {Creep, OwnedStructure, Structure} from "game/prototypes"
import { CreepWrapper } from "shared/subsystems/wrappers";
import { CachedValue } from "shared/utils/caching/CachedValue";
import { CreepClass } from "shared/subsystems/wrappers/CreepWrapper";
import { setInterval, clearInterval } from "shared/polyfills";
import { CreepSquad } from "shared/subsystems/CreepSquad";
import { StructureWrapper } from "shared/subsystems/wrappers/StructureWrapper";
import { ArenaFlagWrapper } from "shared/subsystems/wrappers/ArenaFlagWrapper";
//import { Flag } from "arena/prototypes";
import { getObjectsByPrototype } from "game/utils";

function updateStructures(intel: Intel, roomIntel: RoomIntel) {
    let allBuildings = getObjectsByPrototype(Structure);
    allBuildings.forEach((building) => {
        //console.log("intel inspecting", building.id)
        //@ts-ignore
        if(!building.getWrapper) return;
        //@ts-ignore
        let wrapper = building.getWrapper();

        //console.log("intel inspecting wrapper", wrapper.id)
        if (building instanceof OwnedStructure) {
            if (building.my) {
                intel.myBuildings.set(wrapper.id, wrapper);
                roomIntel.myBuildings.set(wrapper.id, wrapper);
            } else if(building.my === false) {
                intel.enemyBuildings.set(wrapper.id, wrapper);
                roomIntel.enemyBuildings.set(wrapper.id, wrapper);
            } else {
                intel.neutralBuildings.set(wrapper.id, wrapper);
                roomIntel.neutralBuildings.set(wrapper.id, wrapper);
            }
        }
    });
}

function updateCreeps(intel: Intel, roomIntel: RoomIntel) {
    let allCreeps = getObjectsByPrototype(Creep);
    allCreeps.forEach((creep) => {
        if(creep.spawning) {
            console.log("intel skipping spawnin creep")
            return;
        }
        let wrapper = creep.getWrapper();
        if (creep.my) {
            intel.myCreeps.set(wrapper.id, wrapper);
            roomIntel?.myCreeps.set(wrapper.id, wrapper);
        } else {
            intel.enemyCreeps.set(wrapper.id, wrapper);
            roomIntel?.enemyCreeps.set(wrapper.id, wrapper);
        }
    });
}

// function updateFlags(intel:Intel, roomIntel:RoomIntel) {
//     let allFlags = getObjectsByPrototype(Flag);
//     allFlags.forEach((flag)=>{
//         let wrapper = flag.getWrapper();
//         if(wrapper.my) {
//             roomIntel.myFlags.set(flag.id, wrapper);
//         } else if(wrapper.enemy) {
//             roomIntel.enemyFlags.set(flag.id, wrapper);
//         } else {
//             roomIntel.neutralFlags.set(flag.id, wrapper);
//         }
//     })
// }

function updateRoomIntel(roomName:string, intel:Intel, allRooms:Map<string, RoomIntel>) {
    let roomIntel = intel.getRoomIntel(roomName);
    if(!roomIntel) return;

    updateCreeps(intel, roomIntel);

    updateStructures(intel, roomIntel);

    //updateFlags(intel, roomIntel);
}


class Intel {
    private rooms:Map<string, RoomIntel> = new Map();

    getRoomIntel(roomName="arena"):RoomIntel {
        if(!this.rooms.has(roomName)) {
            let roomIntel = new RoomIntel(roomName);
            this.rooms.set(roomName, roomIntel);
            return roomIntel;
        }
        //@ts-ignore can't be undefined, calm down.
        return this.rooms.get(roomName);
    }
    myCreeps:Map<string, CreepWrapper> = new Map();
    mySquads:Map<string, CreepSquad> = new Map();
    myBuildings:Map<string, StructureWrapper> = new Map();

    enemyCreeps:Map<string, CreepWrapper> = new Map();
    enemySquads:Map<string, CreepSquad> = new Map();
    enemyBuildings:Map<string, StructureWrapper> = new Map();

    neutralBuildings:Map<string, StructureWrapper> = new Map();

    constructor() {

    }

    updateIntel() {
        this.rooms.forEach((roomIntel, roomName)=>{
            //check if it's time to update this room, and if so, do it.
            let nextUpdateTick = (roomIntel.updateLastTick+roomIntel.updateFrequency);
            let currentTick = getSettings().getTick();
            //console.log("update intel?", nextUpdateTick, currentTick)
            if(nextUpdateTick<=currentTick) {
                updateRoomIntel(roomName, this, this.rooms);
                roomIntel.updateLastTick = currentTick;
            }

        })
    }
}

class RoomIntel {
    name:string;
    updateFrequency:number;
    updateLastTick:number=-1;

    // myFlags:Map<string, ArenaFlagWrapper> = new Map();
    // enemyFlags:Map<string, ArenaFlagWrapper> = new Map();
    // neutralFlags:Map<string, ArenaFlagWrapper> = new Map();


    myCreeps:Map<string, CreepWrapper> = new Map();
    mySquads:Map<string, CreepSquad> = new Map();
    myBuildings:Map<string, StructureWrapper> = new Map();

    enemyCreeps:Map<string, CreepWrapper> = new Map();
    enemySquads:Map<string, CreepSquad> = new Map();
    enemyBuildings:Map<string, StructureWrapper> = new Map();


    neutralBuildings:Map<string, StructureWrapper> = new Map();

    constructor(name:string, updateFrequency:number=getSettings().intelUpdateFrequency) {
        this.name = name;
        this.updateFrequency = updateFrequency;
    }

}

let intel = new Intel();
export default intel;





