import WorldPosition from "shared/utils/map/WorldPosition";
import Logger from "shared/utils/logger";

let logger = new Logger("CreepRequest");
logger.color = COLOR_GREEN


export interface CanSpawnCreeps {

  projectedSpawnTime(creepRequest: CreepRequest): number;
  maxSpawnableLevel(creepRequest: CreepRequest): number;
  spawnCreep(creepRequest: CreepRequest): Promise<string | false>;
  cancelCreep(creepRequest: CreepRequest): void;
}


export interface CreepRequestOptions {
  name: string;
  memory?: { [key: string]: any };
  primaryPart: BodyPartConstant;
  secondaryPart: BodyPartConstant | false;
  secondaryPerPrimary: number;
  fatness: number;
  toughness: number;
  maxLevel?: number;
  minLevel?: number;
  priority?: number;
}

export interface BodyAndLevel {
  body: BodyPartConstant[];
  level: number;
}

let defaultOptions:CreepRequestOptions = {
  name: "default",
  primaryPart: MOVE,
  secondaryPart: false,
  secondaryPerPrimary: 1,
  fatness: 1,
  toughness: 0,
}

function zipParts(...args: BodyPartConstant[][]): BodyPartConstant[] {
  let result: BodyPartConstant[] = [];
  let maxLength = Math.max(...args.map(arr => arr.length));
  for (let i = 0; i < maxLength; i++) {
    for (let arr of args) {
      if (arr[i]) {
        result.push(arr[i]);
      }
    }
  }
  return result;
}

export class CreepRequest {
  options: CreepRequestOptions;
  pos: WorldPosition;

  constructor(pos: WorldPosition, options: CreepRequestOptions) {
    this.pos = pos;
    this.options = _.extend(defaultOptions, options);
  }


    // 0=can't move  0-1=moves fast in swamps(extra moves)  1=normal(1to1moves)  1+ = slow on plains(less moves)
    // 0=no tough  0-1=less tough than primary  1=same tough as primary  1+=more tough than primary

  designBody(energyAvail: number): BodyAndLevel {
    let level = 0;
    let body: BodyPartConstant[] = [];
    let cost = 0;

    while (true) {
      level++;
      let newBody = this.getBodyAtLevel(level);
      let newCost = newBody.reduce((sum, part) => sum + BODYPART_COST[part], 0);
      logger.log("checking level", level, this.options.name, newCost, energyAvail, newBody, newCost > energyAvail, level > (this.options.maxLevel || 255), newCost > energyAvail || level >= (this.options.maxLevel || 255));
      if (newCost > energyAvail || level > (this.options.maxLevel || 255)) {
        // If the new body exceeds available energy or max level, revert to previous level
        logger.log("reverting to previous level", level, this.options.name, newCost, energyAvail, newBody);
        level--;
        break;
      }

      body = newBody;
      cost = newCost;
    }
    if (level == 0) {
      logger.log("level is 0", this.options.name, level, body);
      return { body: [], level: 0 };
    }
    level = Math.max(level, this.options.minLevel || 0);
    body = this.getBodyAtLevel(level);  // Ensure we're using the correct body for the final level
    // double check that the body cost is less than the energy available
    let bodyCost = body.reduce((sum, part) => sum + BODYPART_COST[part], 0);
    if (bodyCost > energyAvail) {
      logger.log("bodyCost > energyAvail", this.options.name, level, body, bodyCost, energyAvail);
      return { body: [], level: 0 };
    }
    logger.log("designBody", this.options.name, level, body);
    return { body, level };
  }

  getBodyAtLevel(level: number): BodyPartConstant[] {
    let primary_parts: BodyPartConstant[] = [];
    let secondary_parts: BodyPartConstant[] = [];
    let tough_parts: BodyPartConstant[] = [];
    let move_parts: BodyPartConstant[] = [];
    let numPrimary = level;
    let numSecondary = 0;
    let numTough = 0;
    let numMove = 0;
    for (let i = 0; i < numPrimary; i++) {
      primary_parts.push(this.options.primaryPart);
    }
    if (this.options.secondaryPart) {
      numSecondary = Math.ceil(level * this.options.secondaryPerPrimary);
      // if (numSecondary == 0) {
      //   numSecondary = 1;
      // }
      for (let i = 0; i < numSecondary; i++) {
        secondary_parts.push(this.options.secondaryPart);
      }
    }
    if (this.options.toughness > 0) {
      let numOtherPerLevel = (this.options.secondaryPerPrimary || 0) + 1;
      numTough = Math.ceil(this.options.toughness * (numPrimary + numSecondary));
      // if (numTough == 0) {
      //   numTough = 1;
      // }
      for (let i = 0; i < numTough; i++) {
        tough_parts.push(TOUGH);
      }
    }
    if (this.options.fatness > 0) {
      let numOtherPerLevel = 1 + (this.options.secondaryPerPrimary || 0) + (this.options.toughness || 0);
      numMove = Math.ceil((1/this.options.fatness) * (numPrimary + numSecondary + numTough));
      // if (numMove == 0) {
      //   numMove = 1;
      // }
      for (let i = 0; i < numMove; i++) {
        move_parts.push(MOVE);
      }
    }
    return [...tough_parts, ...move_parts, ...zipParts(primary_parts, secondary_parts)];
  }

}
