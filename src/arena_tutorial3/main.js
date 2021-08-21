import {
  getObjectsByPrototype,
  createConstructionSite
} from 'game/utils';
import {
  Creep,
  StructureTower,
  StructureContainer,
  StructureSpawn,
  Source
} from 'game/prototypes';
import {
  ATTACK,
  HEAL,
  RANGED_ATTACK,
  MOVE,
  WORK,
  CARRY,
  RESOURCE_ENERGY
} from 'game/constants';

let myCreeps = [];
let flags;
/**
 * @type StructureSpawn
 */
let spawn;
/**
 * @type Source[]
 */
let sources;
let site;
export function loop() {
  myCreeps = getObjectsByPrototype(Creep);
  flags = getObjectsByPrototype(StructureTower);
  spawn = getObjectsByPrototype(StructureSpawn)[0];
  sources = getObjectsByPrototype(StructureContainer);
  if (!site) {
    site = createConstructionSite(50, 55, StructureTower).object;
  }
  spawnCreeps();
  runCreeps();
}

function spawnCreeps() {
  if (spawn && myCreeps.length < 5) {
    //console.log(spawn, "spawning creep")
    spawn.spawnCreep([MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY]);
  }
}

function runCreeps() {
  for (let c in myCreeps) {
    /**
     * @type Creep
     */
    let creep = myCreeps[c];
    console.log("running Creep", c)
    let attRet = false,
      moveRet = false;
    let esource = creep.findClosestByRange(sources);
    let etarget = site;
    let hasEnergy = creep.store.energy > 0;
    let target = hasEnergy ? etarget : esource;
    console.log(c, hasEnergy, target);
    if (!target) {
      console.log("creep", c, "no target", hasEnergy);
      return;
    }
    if (creep.getRangeTo(target) == 1) {
      if (hasEnergy) {
        attRet = creep.build(target);
      } else {
        attRet = creep.withdraw(target, RESOURCE_ENERGY);
      }
    }
    if (creep.getRangeTo(target) > 1) {
      moveRet = creep.moveTo(target);
    }
    console.log(c, "move:", moveRet, "Attack:", attRet)
  }
}