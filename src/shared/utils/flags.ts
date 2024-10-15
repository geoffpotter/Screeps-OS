import IndexingCollection from "./queues/indexingCollection";

export function flagCount(flags: Flag[], color: ColorConstant, secondaryColor: ColorConstant): number {
    let num = 0;
    for(let flag of flags) {
        if (flag.color == color && flag.secondaryColor == secondaryColor) {
            num++;
        }
    }
    return num;
}

export function flagsByColor(flags: Flag[] | false = false, color: ColorConstant, secondaryColor: ColorConstant | false = false, roomName: string | false = false): Flag[] {
    let retFlags: Flag[] = [];
    if (!flags) return retFlags;
    for(let flag of flags) {
        if (flag.color == color && (secondaryColor === false || flag.secondaryColor == secondaryColor) && (roomName === false || flag.pos.roomName == roomName)) {
            retFlags.push(flag);
        }
    }
    return retFlags;
}

export function allFlagsByColor(color: ColorConstant, secondaryColor: ColorConstant | false = false, roomName: string | false = false): Flag[] {
    let flags = Game.flags;
    let retFlags: Flag[] = [];
    for(let flagName in flags) {
        let flag = flags[flagName];
        if (flag.color == color && (secondaryColor === false || flag.secondaryColor == secondaryColor) && (roomName === false || flag.pos.roomName == roomName)) {
            retFlags.push(flag);
        }
    }
    return retFlags;
}

export function flagsAtPos(flags: Flag[], pos: RoomPosition): Flag[] {
    let retFlags: Flag[] = [];
    for(let flag of flags) {
        if (flag.pos.isEqualTo(pos)) {
            retFlags.push(flag);
        }
    }
    return retFlags;
}


export class FlagsCollection {
    flags: IndexingCollection<Flag>;

    constructor() {
        this.flags = new IndexingCollection<Flag>("name", ["color"]);
    }

    clear() {
        this.flags = new IndexingCollection<Flag>("name", ["color"]);
    }

    exists(flag: Flag) {
        return Game.flags[flag.name] !== undefined;
    }

    addFlag(flag: Flag) {
        this.flags.add(flag);
    }

    removeFlag(flag: Flag) {
        this.flags.remove(flag);
    }

    getFlagsByColor(color: ColorConstant, secondaryColor: ColorConstant | false = false): Flag[] {
        let matchingPrimaryColorFlagIds = this.flags.getGroup("color")[color];
        let retFlags: Flag[] = [];
        for(let flagId of matchingPrimaryColorFlagIds) {
            let flag = Game.flags[flagId];
            if (secondaryColor === false || flag.secondaryColor == secondaryColor) {
                retFlags.push(flag);
            }
        }
        return retFlags;
    }
    getFlagsAtPos(pos: RoomPosition, color: ColorConstant | false = false, secondaryColor: ColorConstant | false = false): Flag[] {
        let retFlags: Flag[] = [];
        for(let flag of this.flags.getAll()) {
            if (flag.pos.isEqualTo(pos) && (color === false || flag.color == color) && (secondaryColor === false || flag.secondaryColor == secondaryColor)) {
                retFlags.push(flag);
            }
        }
        return retFlags;
    }



}
