//import to override defaults
import settings from "./settings";
settings.getTick();

import {
  getObjectsByPrototype,
  // @ts-ignore  type needs to be updated
  getTicks,
  findPath,
  getObjects,
  findInRange,
  findClosestByRange,
  getRange,
} from 'game/utils';
import {
  Creep, StructureTower,
} from 'game/prototypes';
import {
  BodyPart,
  Flag
} from 'arena/prototypes';
import {
  startTick,
  endTick
} from 'shared/polyfills';
import {
  setTimeout,
  setInterval,
} from "polyfills";


import {
  profiler,
  profile
} from "shared/utils/profiling/profiler";

import "prototypes/prototypeCreep"
import "prototypes/prototypeStructure"

import intel from "../shared/subsystems/intel/intel"
import { winCTF } from './goals/winCTF';
import { arenaInfo } from 'game';

let init = false;

let myTower: StructureTower;

let handledBodyPartIds: string[] = [];
let winGoal: winCTF;
//profiler.start();
export function loop() {
  intel.updateIntel();
  let arenaIntel = intel.getRoomIntel();
  let enemyCreeps = Array.from(arenaIntel.enemyCreeps.values());
  let ourFlag = arenaIntel.myFlags.values().next();


  // let closestRange = 100;
  // if(enemyCreeps.length > 0) {
  //   let closestCreep = findClosestByRange(ourFlag, enemyCreeps);
  //   closestRange = getRange(ourFlag, closestCreep);
  // }

  // if(settings.getTick() < 100 && closestRange > 20) {
  //  return;
  // }

  if (!init) {
    console.log("----------------running init code----------------------")

    winGoal = new winCTF();
    winGoal.setupChildGoals();

    let towers = getObjectsByPrototype(StructureTower);
    for (let tower of towers) {
      if (tower.my) {
        myTower = tower;
      } else {
        winGoal.assignTarget(tower);
      }
    }

    let flags = getObjectsByPrototype(Flag);
    for (let flag of flags) {
      winGoal.assignTarget(flag);
    }

    init = true;
  }
  console.log("------ start tick ----------");
  startTick();

  let creeps = getObjectsByPrototype(Creep);
  for (let creep of creeps) {
    if (creep.my) {
      //console.log("checking creep", creep.id, creep.body.reduce<string>((acc, part) => acc + "|" + part.type, ''))
      if (!creep.goalId) {
        console.log("orphaned creep, searching for goal", creep.id);
        if (winGoal.assignCreep(creep)) {
          console.log(creep.id, "assigned!", creep.goalId, creep.squadId)
        } else {
          console.log(creep.id, "cound't find a goal!")
        }
      }
    } else {
      if (!creep.goalId && (creep.isAttacker() || creep.isRangedAttacker())) {
        winGoal.assignTarget(creep);
      }
    }
  }

  let bodyParts = getObjectsByPrototype(BodyPart);
  for (let part of bodyParts) {
    if (!handledBodyPartIds.includes(part.id)) {
      winGoal.assignTarget(part);
      handledBodyPartIds.push(part.id);
    }
  }

  winGoal.runGoal();


  //run tower


  let injuredCreeps = getObjectsByPrototype(Creep).filter(c => c.my && c.hits < c.hitsMax)
  let secondaryTargets = findInRange(myTower, enemyCreeps, 10);
  let injuredMembers = findInRange(myTower, injuredCreeps, 10);
  if (injuredMembers.length > 0) {
    let target = findClosestByRange(myTower, injuredMembers);
    myTower.heal(target);
  } else if (secondaryTargets.length > 0) {
    let target = findClosestByRange(myTower, secondaryTargets);
    if (target.hits < target.hitsMax * 0.9) {
      let ret = myTower.attack(target.get());
      console.log("tower tried to attack", target.id, "got", ret);
    }

  }

  endTick();
  //console.log(settings.getMemory())
  //@ts-ignore
  console.log("tick over", settings.getCpu(), arenaInfo.cpuTimeLimit, arenaInfo.cpuTimeLimitFirstTick)
}
