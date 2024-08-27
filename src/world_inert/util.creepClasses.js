/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * import mod  from "util.creepClasses";
 * mod.thing == 'a thing'; // true
 */

import logger_import from "./screeps.logger";
let logger = new logger_import("util.creepClasses");
//logger.color = COLOR_YELLOW;
//logger.enabled = false;



class baseCreepClass {

  constructor() {
    this.name = "base"
    this.requiredBody = [];
    this.extendedBody = [];

    this.maxBodies = 50;
    this.minBodies = 0;

    this.orderWeights = {
      HEAL: -1,
      MOVE: 0,
      CLAIM: 1,
      CARRY: 2,
      WORK: 3,
      RANGED_ATTACK: 4,
      ATTACK: 5,
      TOUGH: 6
    };
  }

  getBody(maxEnergy) {
    var body = global.utils.buildCreepBody(this.requiredBody, this.extendedBody, maxEnergy, this.maxBodies, this.minBodies)
    body = this.sortBody(body);
    //logger.log(this.roomName, "====",JSON.stringify(body))
    return body.reverse();
  }

  sortBody(body) {
    //logger.log(this.roomName, "====", creepData.role,JSON.stringify(body))
    var req = this;
    body = _.sortBy(body, function(p) {
      //logger.log(req.orderWeights[p], p, JSON.stringify(req.orderWeights))
      return req.orderWeights[p.toUpperCase()];
    })
    return body;
  }
}


class workerClass extends baseCreepClass {
  constructor() {
    super();
    this.name = "worker";
    this.requiredBody = [WORK, CARRY, MOVE, MOVE];
    this.extendedBody = [WORK, CARRY, MOVE, MOVE];
  }
}

class minerClass extends baseCreepClass {
  constructor() {
    super();
    this.name = "miner";
    this.requiredBody = [WORK, WORK, CARRY, MOVE];
    this.extendedBody = [WORK, WORK, MOVE];

    this.maxBodies = 4;
  }
}
class remoteMinerClass extends baseCreepClass {
  constructor() {
    super();
    this.name = "remoteMiner";
    this.requiredBody = [WORK, WORK, CARRY, MOVE];
    this.extendedBody = [WORK, WORK, MOVE, MOVE];


    this.maxBodies = 4;
  }
}

class builderClass extends baseCreepClass {
  constructor() {
    super();
    this.name = "builder";
    // this.requiredBody = [WORK, WORK, CARRY, MOVE];
    // this.extendedBody = [WORK, WORK, CARRY, MOVE];

    this.requiredBody = [WORK, CARRY, MOVE];
    this.extendedBody = [WORK, CARRY, MOVE];
  }
}

class transporterClass extends baseCreepClass {
  constructor() {
    super();
    this.name = "transporter";
    this.requiredBody = [CARRY, MOVE, CARRY, MOVE];
    this.extendedBody = [CARRY, MOVE];
  }
}

class fillerClass extends baseCreepClass {
  constructor() {
    super();
    this.name = "filler";
    this.requiredBody = [CARRY, CARRY, MOVE];
    this.extendedBody = [CARRY, CARRY, MOVE];
  }
}

class claimerClass extends baseCreepClass {
  constructor() {
    super();
    this.name = "claimer";
    this.requiredBody = [CLAIM, MOVE];
    this.extendedBody = [];
    this.maxBodies = 1;
  }
}

let classes = [
  workerClass,
  minerClass,
  builderClass,
  transporterClass,
  remoteMinerClass,
  fillerClass,
  claimerClass
];

let exp = {};
for (let claz in classes) {
  let clazz = classes[claz];
  let classObj = new clazz();
  logger.log(classObj.name)
  exp[classObj.name] = classObj;
}

export default exp;