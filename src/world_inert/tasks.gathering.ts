/*
 * Module code goes here. Use 'module.export const to export things:
 * module.export constthing = 'a thing';
 *
 * You can import it from another modules like this:
 * import mod  from "tasks.gathering";
 * mod.thing == 'a thing'; // true
 */

import logger_import from "./screeps.logger";
let logger = new logger_import("tasks.gathering");
logger.enabled = false;

import Task from "./tasks.base";


class mining extends Task {
  constructor() {
    super();
    this.name = Task.MINING;
    //this.displayThisTask = true;
  }
  assignCreep(creep) {
    let amtAssigned = 1;
    this.assignments[creep.id] = amtAssigned;
  }
  preformTask(creep) {
    let source = Game.getObjectById(this.data.sourceId);
    logger.log(creep, "mining!", source)
    if (source) {
      let moveTarget = source;

      let sourceProc = this.kernel.getProcess("source-" + source.id);

      let stopMining = false;
      if (creep.pos.isNearTo(source) && creep.memory.role == "miner" && sourceProc && sourceProc.cont) {
        moveTarget = sourceProc.cont;
        //logger.log(creep, _.sum(sourceProc.cont.store), sourceProc.cont.storeCapacity)
        if (_.sum(sourceProc.cont.store) == sourceProc.cont.storeCapacity) {
          stopMining = true;
        }
      }

      let range = moveTarget == source ? 1 : 0;
      if (!creep.pos.inRangeTo(moveTarget, range)) {
        global.creepActions.moveTo(creep, moveTarget, range)
      }
      if (!stopMining && creep.pos.isNearTo(source)) {
        let ret = creep.harvest(source);
      }

    } else {
      logger.log(creep, "no source, moving to pos")
      //no visiblity on source, move to data.pos
      let target = new RoomPosition(this.pos.x, this.pos.y, this.pos.roomName);
      global.creepActions.moveTo(creep, target);
    }
    //logger.log(creep, creep.carryCapacity != 0, _.sum(creep.carry) == creep.carryCapacity, _.sum(creep.carry), creep.carryCapacity)
    return creep.carryCapacity != 0 && _.sum(creep.carry) == creep.carryCapacity;
  }
}

class pickup extends Task {
  constructor() {
    super();
    this.name = Task.PICKUP;
    this.displayThisTask = true;
  }
  assignCreep(creep) {
    let amtAssigned = creep.carryCapacity - _.sum(creep.carry);
    this.assignments[creep.id] = amtAssigned;
  }
  preformTask(creep) {
    let pile = Game.getObjectById(this.data.pileId);
    if (!pile) {
      logger.log(creep.name, "My pile doesn't exist anymore!  considering job done.", this.data.pileId)
      return true;
    }
    if (global.creepActions.moveTo(creep, pile)) {
      let ret = creep.pickup(pile);
    }
    return _.sum(creep.carry) == creep.carryCapacity || pile.amount == 0;
  }
}

class pickupController extends pickup {
  constructor() {
    super();
    this.name = Task.PICKUPATCONTROLLER;
    this.displayThisTask = true;
  }
}

class pickupFromContainer extends Task {
  constructor() {
    super();
    this.name = Task.PICKUPENERGYCONT;
    this.displayThisTask = true;
  }
  assignCreep(creep) {
    let amtAssigned = creep.carryCapacity - _.sum(creep.carry);
    this.assignments[creep.id] = amtAssigned;
  }
  preformTask(creep) {
    let cont = Game.getObjectById(this.data.targetId);
    if (!cont) {
      return true;
    }
    if (global.creepActions.moveTo(creep, cont)) {
      let ret = creep.withdraw(cont, RESOURCE_ENERGY);
      logger.log(creep, "grabed", cont, ret)
    }
    //logger.log(creep, "pickup", )
    return creep.carryCapacity == _.sum(creep.carry) || cont.store.energy == 0;
  }
}
class pickupFromSpawnCont extends pickupFromContainer {
  constructor() {
    super();
    this.name = Task.PICKUPENERGYSPAWN;
    this.displayThisTask = false;
  }
}

class pickupFromControllerCont extends pickupFromContainer {
  constructor() {
    super();
    this.name = Task.PICKUPENERGYCONTROLLER;
    this.displayThisTask = false;
  }
}

let all = [
  mining,
  pickup,
  pickupController,
  pickupFromContainer,
  pickupFromSpawnCont,
  pickupFromControllerCont,

];
let map = {};


for (let i in all) {
  let one = all[i];
  let inst = new one();
  map[inst.name] = one;
}

export default map;