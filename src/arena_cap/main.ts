

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
} from "profiler";

import "prototypeCreep"


import {getSettings, overrideSettings} from "shared/utils/settings"

import runtimeSettings from "./settings";


import { objectManager } from "./objectManager";
let om = new objectManager();

import { winCTF } from './goals/winCTF';




console.log("Starting!")

let init = false;

let myTower:StructureTower;

let handledBodyPartIds:string[] = [];
let winGoal: winCTF;
//profiler.start();
export function loop() {
  let enemyCreeps =  getObjectsByPrototype(Creep).filter(c => !c.my);
  let ourFlag = getObjectsByPrototype(Flag).filter((f)=> f.my)[0];

  // let closestRange = 100;
  // if(enemyCreeps.length > 0) {
  //   let closestCreep = findClosestByRange(ourFlag, enemyCreeps);
  //   closestRange = getRange(ourFlag, closestCreep);
  // }

  // if(settings.getTick() < 100 && closestRange > 20) {
  //  return;
  // }

  if(!init) {
    console.log("----------------running init code----------------------")
    overrideSettings(runtimeSettings);

    winGoal = new winCTF();
    winGoal.setupChildGoals();

    let towers = getObjectsByPrototype(StructureTower);
    for(let tower of towers) {
      if(tower.my) {
        myTower = tower;
      } else {
        winGoal.assignTarget(tower);
      }
    }

    let flags = getObjectsByPrototype(Flag);
    for(let flag of flags) {
      winGoal.assignTarget(flag);
    }

    init = true;
  }
  console.log("------ start tick ----------");
  startTick();

  let creeps = getObjectsByPrototype(Creep);
  for(let creep of creeps) {
    if(creep.my) {
      //console.log("checking creep", creep.id, creep.body.reduce<string>((acc, part) => acc + "|" + part.type, ''))
      if(!creep.goalId) {
        console.log("orphaned creep, searching for goal", creep.id);
        if(winGoal.assignCreep(creep)) {
          console.log(creep.id, "assigned!", creep.goalId, creep.squadId)
        } else {
          console.log(creep.id, "cound't find a goal!")
        }
      }
    } else {
      if(!creep.goalId && (creep.isAttacker() || creep.isRangedAttacker())) {
        winGoal.assignTarget(creep);
      }
    }
  }

  let bodyParts = getObjectsByPrototype(BodyPart);
  for(let part of bodyParts) {
    if(!handledBodyPartIds.includes(part.id)) {
      winGoal.assignTarget(part);
      handledBodyPartIds.push(part.id);
    }
  }

  winGoal.runGoal();


  //run tower


  let injuredCreeps = getObjectsByPrototype(Creep).filter(c => c.my && c.hits < c.hitsMax)
  let secondaryTargets = findInRange(myTower, enemyCreeps, 10);
  let injuredMembers = findInRange(myTower, injuredCreeps, 10);
  if(injuredMembers.length > 0) {
    let target = findClosestByRange(myTower, injuredMembers);
    myTower.heal(target);
  } else if(secondaryTargets.length > 0) {
    let target = findClosestByRange(myTower, secondaryTargets);
    if(target.hits < target.hitsMax * 0.9) {
      let ret = myTower.attack(target);
      console.log("tower tried to attack", target.id, "got", ret);
    }

  }

  endTick();
  //console.log(settings.getMemory())
}
