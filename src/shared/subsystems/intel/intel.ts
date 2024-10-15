
import { FlagsCollection } from "shared/utils/flags";
import { setInterval } from "shared/polyfills/setInterval";
import { builtInQueues } from "shared/polyfills/tasks";
import MemoryGroupedCollection, { getGroupedCollection } from "shared/utils/memory/MemoryGroupedCollection";
import { baseStorable, StorableCreatableClass } from "shared/utils/memory/MemoryManager";

import { SourceWrapper } from "../../../world_new/wrappers/source";
import CreepWrapper from "../../../world_new/wrappers/creep/CreepWrapper";
import { StructureWrapper } from "../../../world_new/wrappers/base/HasStorageWrapper";
import { ResourceWrapper } from "../../../world_new/wrappers/ResourceWrapper";
import { ConstructionSiteWrapper } from "../../../world_new/wrappers/ConstructionSiteWrapper";
import { MineralWrapper } from "../../../world_new/wrappers/MineralWrapper";
import { NukeWrapper } from "../../../world_new/wrappers/NukeWrapper";
import { TombstoneWrapper } from "../../../world_new/wrappers/TombstoneWrapper";
import { RuinWrapper } from "../../../world_new/wrappers/RuinWrapper";
import { ControllerWrapper, DepositWrapper, InvaderCoreWrapper, PortalWrapper, PowerBankWrapper, PowerCreepWrapper, RoomWrapper, StructureKeeperLairWrapper, StructurePortalWrapper } from "world_new/wrappers";
import { isCenterRoom, isHighwayRoom, isSKRoom } from "shared/utils/map";
import Logger from "shared/utils/logger";

let logger = new Logger("intel");


export enum PlayerStatus {
    MINE,
    FRIENDLY,
    NEUTRAL,
    ENEMY
}

export interface PlayerIntel {
    username:string;
    status:PlayerStatus;
    rating:number;
    lastSeen:number;
}
declare global {
    interface Memory {
        playerIntel:Record<string, PlayerIntel>;

    }
    interface RoomMemory {
        roomIntel:RoomIntelJSON;
    }
}
export function getPlayerIntel(username:string):PlayerIntel {
    if (!Memory.playerIntel) {
        Memory.playerIntel = {};
    }
    if (!Memory.playerIntel[username]) {
        let newIntel:PlayerIntel = {username:username, status:PlayerStatus.NEUTRAL, rating:0, lastSeen:0};
        Memory.playerIntel[username] = newIntel;
    }
    return Memory.playerIntel[username];
}

//@ts-ignore
export let playerName = _.find(Game.structures).owner.username
export let myPlayerIntel = getPlayerIntel(playerName);
myPlayerIntel.status = PlayerStatus.MINE;


export enum RoomStatus {
    OWNED,
    RESERVED,
    NEUTRAL,
    SK,
    CENTER,
    HIGHWAY
}

export interface RoomIntelJSON {
    roomName:string;
    roomOwner:PlayerIntel|false;
    roomOwnership:PlayerStatus;
    roomStatus:RoomStatus;
    updateFrequency:number;
    updateLastTick:number;
}
export class RoomIntel extends baseStorable implements StorableCreatableClass<RoomIntel, typeof RoomIntel, RoomIntelJSON> {
    static fromJSON(json:RoomIntelJSON):RoomIntel {
        let intel = new RoomIntel(json.roomName);
        intel.roomOwner = json.roomOwner;
        intel.roomOwnership = json.roomOwnership;
        intel.roomStatus = json.roomStatus;
        intel.updateFrequency = json.updateFrequency;
        intel.updateLastTick = json.updateLastTick;
        return intel;
    }
    roomName:string;
    roomOwner:PlayerIntel|false;
    roomOwnership:PlayerStatus;
    roomStatus:RoomStatus;
    updateFrequency:number;
    updateLastTick:number;


    flags:FlagsCollection;


    creeps:Record<PlayerStatus, MemoryGroupedCollection<CreepWrapper>>;
    powerCreeps:MemoryGroupedCollection<PowerCreepWrapper>;

    buildings:Record<PlayerStatus, MemoryGroupedCollection<StructureWrapper>>;
    constructionSites:Record<PlayerStatus, MemoryGroupedCollection<ConstructionSiteWrapper>>;

    controller:ControllerWrapper|false;
    sources:MemoryGroupedCollection<SourceWrapper>;
    droppedResources:MemoryGroupedCollection<ResourceWrapper>;
    minerals:MemoryGroupedCollection<MineralWrapper>;
    nukes:MemoryGroupedCollection<NukeWrapper>;
    tombstones:MemoryGroupedCollection<TombstoneWrapper>;
    ruins:MemoryGroupedCollection<RuinWrapper>;
    portals:MemoryGroupedCollection<StructurePortalWrapper>;
    keeperLairs:MemoryGroupedCollection<StructureKeeperLairWrapper>;
    invaderCores:MemoryGroupedCollection<InvaderCoreWrapper>;
    powerBanks:MemoryGroupedCollection<PowerBankWrapper>;
    deposits:MemoryGroupedCollection<DepositWrapper>;



    constructor(roomName:string) {
        super(roomName);
        this.roomName = roomName;
        this.roomOwner = false;
        this.roomOwnership = PlayerStatus.NEUTRAL;
        this.roomStatus = RoomStatus.NEUTRAL;
        this.updateFrequency = 0;
        this.updateLastTick = 0;

        this.flags = new FlagsCollection();

        this.controller = false;
        this.sources = new MemoryGroupedCollection<SourceWrapper>(roomName, "id");
        this.droppedResources = new MemoryGroupedCollection<ResourceWrapper>(roomName, "id", ["resourceType"]);
        this.minerals = new MemoryGroupedCollection<MineralWrapper>(roomName, "id");
        this.nukes = new MemoryGroupedCollection<NukeWrapper>(roomName, "id");
        this.tombstones = new MemoryGroupedCollection<TombstoneWrapper>(roomName, "id");
        this.ruins = new MemoryGroupedCollection<RuinWrapper>(roomName, "id");
        this.powerCreeps = new MemoryGroupedCollection<PowerCreepWrapper>(roomName, "id");
        this.portals = new MemoryGroupedCollection<StructurePortalWrapper>(roomName, "id");
        this.keeperLairs = new MemoryGroupedCollection<StructureKeeperLairWrapper>(roomName, "id");
        this.invaderCores = new MemoryGroupedCollection<InvaderCoreWrapper>(roomName, "id");
        this.powerBanks = new MemoryGroupedCollection<PowerBankWrapper>(roomName, "id");
        this.deposits = new MemoryGroupedCollection<DepositWrapper>(roomName, "id");

        this.constructionSites = {
            [PlayerStatus.MINE]: new MemoryGroupedCollection<ConstructionSiteWrapper>(roomName, "id", ["structureType"]),
            [PlayerStatus.FRIENDLY]: new MemoryGroupedCollection<ConstructionSiteWrapper>(roomName, "id", ["structureType"]),
            [PlayerStatus.NEUTRAL]: new MemoryGroupedCollection<ConstructionSiteWrapper>(roomName, "id", ["structureType"]),
            [PlayerStatus.ENEMY]: new MemoryGroupedCollection<ConstructionSiteWrapper>(roomName, "id", ["structureType"]),
        };
        this.creeps = {
            [PlayerStatus.MINE]: new MemoryGroupedCollection<CreepWrapper>(roomName, "id", ["creepClass"]),
            [PlayerStatus.FRIENDLY]: new MemoryGroupedCollection<CreepWrapper>(roomName, "id", ["creepClass"]),
            [PlayerStatus.NEUTRAL]: new MemoryGroupedCollection<CreepWrapper>(roomName, "id", ["creepClass"]),
            [PlayerStatus.ENEMY]: new MemoryGroupedCollection<CreepWrapper>(roomName, "id", ["creepClass"]),
        };
        this.buildings = {
            [PlayerStatus.MINE]: new MemoryGroupedCollection<StructureWrapper>(roomName, "id", ["wrapperType"]),
            [PlayerStatus.FRIENDLY]: new MemoryGroupedCollection<StructureWrapper>(roomName, "id", ["wrapperType"]),
            [PlayerStatus.NEUTRAL]: new MemoryGroupedCollection<StructureWrapper>(roomName, "id", ["wrapperType"]),
            [PlayerStatus.ENEMY]: new MemoryGroupedCollection<StructureWrapper>(roomName, "id", ["wrapperType"]),
        };
        if (!Memory.rooms) {
            Memory.rooms = {};
        }
        if (!Memory.rooms[roomName]) {
            //@ts-ignore
            Memory.rooms[roomName] = {roomIntel:this};
        } else {
            Memory.rooms[roomName].roomIntel = this;
        }
    }
    clear():void {
        this.flags = new FlagsCollection();
        this.creeps[PlayerStatus.MINE].clear();
        this.creeps[PlayerStatus.FRIENDLY].clear();
        this.creeps[PlayerStatus.NEUTRAL].clear();
        this.creeps[PlayerStatus.ENEMY].clear();
        this.buildings[PlayerStatus.MINE].clear();
        this.buildings[PlayerStatus.FRIENDLY].clear();
        this.buildings[PlayerStatus.NEUTRAL].clear();
        this.buildings[PlayerStatus.ENEMY].clear();
        this.constructionSites[PlayerStatus.MINE].clear();
        this.constructionSites[PlayerStatus.FRIENDLY].clear();
        this.constructionSites[PlayerStatus.NEUTRAL].clear();
        this.constructionSites[PlayerStatus.ENEMY].clear();
        this.droppedResources.clear();
        // this.minerals.clear(); // these won't change, so no point in clearing
        // this.sources.clear();
        this.nukes.clear();
        this.tombstones.clear();
        this.ruins.clear();
        this.portals.clear();
        this.keeperLairs.clear();
        this.invaderCores.clear();
        this.powerBanks.clear();
        this.deposits.clear();
    }
    toJSON():RoomIntelJSON {
        return {
            roomName:this.roomName,
            roomOwner:this.roomOwner,
            roomOwnership:this.roomOwnership,
            roomStatus:this.roomStatus,
            updateFrequency:this.updateFrequency,
            updateLastTick:this.updateLastTick,
        }
    }
}


let roomIntelCache:Record<string, RoomIntel> = {};
//load roomIntelCache from memory
for (let roomName in Memory.rooms) {
    if (Memory.rooms[roomName].roomIntel) {
        let storedData = Memory.rooms[roomName].roomIntel;
        let roomIntel = RoomIntel.fromJSON(storedData);
        roomIntelCache[roomName] = roomIntel;
    }
}


export function getRoomIntel(roomName:string):RoomIntel {
    if (!roomIntelCache[roomName]) {
        let newIntel = new RoomIntel(roomName);
        roomIntelCache[roomName] = newIntel;
    }
    return roomIntelCache[roomName];
}

export function updateRoomIntel(room:Room, roomWrapper:RoomWrapper):RoomIntel {
    let roomIntel = getRoomIntel(room.name);
    roomIntel.updateLastTick = Game.time;
    roomIntel.clear();

    //update roomStatus
    if(room.controller){
        roomIntel.controller = room.controller.getWrapper<ControllerWrapper>();

        if(room.controller.my){
            roomIntel.roomStatus = RoomStatus.OWNED;
            let roomOwnerName = room.controller.owner?.username;
            if(roomOwnerName){
                let playerIntel = getPlayerIntel(roomOwnerName);
                playerIntel.lastSeen = Game.time;
                roomIntel.roomOwner = playerIntel;
                roomIntel.roomOwnership = playerIntel.status
            }
        } else if(room.controller.reservation){
            roomIntel.roomStatus = RoomStatus.RESERVED;
            let roomOwnerName = room.controller.reservation?.username;
            if(roomOwnerName){
                let playerIntel = getPlayerIntel(roomOwnerName);
                playerIntel.lastSeen = Game.time;
                roomIntel.roomOwner = playerIntel;
                roomIntel.roomOwnership = playerIntel.status
            }
        } else {
            let roomOwnerName = room.controller.owner?.username;
            if(roomOwnerName){
                let playerIntel = getPlayerIntel(roomOwnerName);
                playerIntel.lastSeen = Game.time;
                roomIntel.roomOwner = playerIntel;
                roomIntel.roomOwnership = playerIntel.status
            } else {
                roomIntel.roomOwner = false;
                roomIntel.roomOwnership = PlayerStatus.NEUTRAL;
            }
        }
    } else {
        if (isHighwayRoom(room.name)) {
            roomIntel.roomStatus = RoomStatus.HIGHWAY;
        } else if (isSKRoom(room.name)) {
            roomIntel.roomStatus = RoomStatus.SK;
        } else if (isCenterRoom(room.name)) {
            roomIntel.roomStatus = RoomStatus.CENTER;
        }
    }

    room.find(FIND_CREEPS).forEach((creep) => {
        let wrapper = creep.getWrapper<CreepWrapper>();
        if (!wrapper) {
            logger.log("no wrapper for", creep.name);
            return;
        }
        if (creep.my) {
            roomIntel.creeps[PlayerStatus.MINE].add(wrapper);
        } else {
            let ownerName = creep.owner.username;
            let playerIntel = getPlayerIntel(ownerName);
            playerIntel.lastSeen = Game.time;
            switch (playerIntel.status) {
                case PlayerStatus.FRIENDLY:
                    roomIntel.creeps[PlayerStatus.FRIENDLY].add(wrapper);
                    break;
                case PlayerStatus.NEUTRAL:
                    roomIntel.creeps[PlayerStatus.NEUTRAL].add(wrapper);
                    break;
                case PlayerStatus.ENEMY:
                    roomIntel.creeps[PlayerStatus.ENEMY].add(wrapper);
                    break;
            }
        }
    });

    room.find(FIND_STRUCTURES).forEach((structure) => {
        let wrapper = structure.getWrapper<StructureWrapper>();
        if (structure instanceof OwnedStructure) {
            if (structure instanceof StructurePortal) {
                roomIntel.portals.add(wrapper as StructurePortalWrapper);
                return;
            }
            if (structure instanceof StructurePowerBank) {
                roomIntel.powerBanks.add(wrapper as PowerBankWrapper);
                return;
            }
            if (structure instanceof StructureKeeperLair) {
                roomIntel.keeperLairs.add(wrapper as StructureKeeperLairWrapper);
                return;
            }
            if (structure instanceof StructureInvaderCore) {
                roomIntel.invaderCores.add(wrapper as InvaderCoreWrapper);
                return;
            }
            if (structure instanceof Deposit) {
                roomIntel.deposits.add(wrapper as unknown as DepositWrapper);
                return;
            }
            if (structure.my) {
                roomIntel.buildings[PlayerStatus.MINE].add(wrapper);
            } else {
                let ownerName = "Invader";
                if (structure.owner) {
                    ownerName = structure.owner.username;
                }
                let playerIntel = getPlayerIntel(ownerName);
                playerIntel.lastSeen = Game.time;
                switch (playerIntel.status) {
                    case PlayerStatus.FRIENDLY:
                        roomIntel.buildings[PlayerStatus.FRIENDLY].add(wrapper);
                        break;
                    case PlayerStatus.NEUTRAL:
                        roomIntel.buildings[PlayerStatus.NEUTRAL].add(wrapper);
                        break;
                    case PlayerStatus.ENEMY:
                        roomIntel.buildings[PlayerStatus.ENEMY].add(wrapper);
                        break;
                }
            }
        } else {
            roomIntel.buildings[PlayerStatus.NEUTRAL].add(wrapper);
        }
    });

    room.find(FIND_CONSTRUCTION_SITES).forEach((site) => {
        let wrapper = site.getWrapper<ConstructionSiteWrapper>();
        if (wrapper.my) {
            roomIntel.constructionSites[PlayerStatus.MINE].add(wrapper);
        } else if (wrapper.enemy) {
            roomIntel.constructionSites[PlayerStatus.ENEMY].add(wrapper);
        } else if (wrapper.friendly) {
            roomIntel.constructionSites[PlayerStatus.FRIENDLY].add(wrapper);
        } else if (wrapper.neutral) {
            roomIntel.constructionSites[PlayerStatus.NEUTRAL].add(wrapper);
        }

    });

    room.find(FIND_FLAGS).forEach((flag) => {
        roomIntel.flags.addFlag(flag);
    });
    if (roomIntel.minerals.size === 0) {
        room.find(FIND_MINERALS).forEach((mineral) => {
            let wrapper = mineral.getWrapper<MineralWrapper>();
            roomIntel.minerals.add(wrapper);
        });
    }
    if (roomIntel.sources.size === 0) {
        room.find(FIND_SOURCES).forEach((source) => {
            let wrapper = source.getWrapper<SourceWrapper>();
            roomIntel.sources.add(wrapper);
        });
    }

    room.find(FIND_NUKES).forEach((nuke) => {
        let wrapper = nuke.getWrapper<NukeWrapper>();
        roomIntel.nukes.add(wrapper);
    });

    room.find(FIND_RUINS).forEach((ruin) => {
        let wrapper = ruin.getWrapper<RuinWrapper>();
        roomIntel.ruins.add(wrapper);
    });

    room.find(FIND_TOMBSTONES).forEach((tombstone) => {
        let wrapper = tombstone.getWrapper<TombstoneWrapper>();
        roomIntel.tombstones.add(wrapper);
    });

    room.find(FIND_DROPPED_RESOURCES).forEach((resource) => {
        let wrapper = resource.getWrapper<ResourceWrapper>();
        roomIntel.droppedResources.add(wrapper);
    });

    return roomIntel;
}
