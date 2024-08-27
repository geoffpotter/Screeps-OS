
// copying this format
// let pathInfo = creep.memory._cachedPath || {
//     stuck: 0,
//     s: false,
//     lp: creep.pos,
//     lpp: creep.pos,
//     idx: 0,
//     done: false,
//     onPath: false,
//     closeToPath: false,
//     dest: destNode.id,
// };


class PathInfo {
    stuck: number = 0;
    s: RoomPosition|false = false;
    lp: RoomPosition = new RoomPosition(0,0,"");
    lpp: RoomPosition = new RoomPosition(0,0,"");
    idx: number = 0;
    done: boolean|undefined = false;
    onPath: boolean = false;
    closeToPath: boolean = false;
    dest: string = "";
}
