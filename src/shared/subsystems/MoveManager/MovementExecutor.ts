import WorldPosition from "shared/utils/map/WorldPosition";
import Logger from "shared/utils/logger";

const logger = new Logger("MoveManager");

export function executeMove(creep: Creep, targetPos: WorldPosition): ScreepsReturnCode {
    logger.log(`Executing move for ${creep.name} to ${targetPos}`);

    if (creep.fatigue > 0) {
        logger.log(`${creep.name} is fatigued`);
        creep.say("💤");
        return ERR_TIRED;
    }

    const direction = creep.pos.getDirectionTo(targetPos.toRoomPosition());
    logger.log(`Direction for ${creep.name}: ${direction}`);

    const result = creep.move(direction);
    logger.log(`Move result for ${creep.name}: ${result}`);
    return result;
}
