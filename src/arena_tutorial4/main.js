import {
  getObjectsByPrototype
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
let myAttackers = [];
let myHealers = [];
let myRanged = [];
let myWorkers = [];
let myHaulers = [];
let enemyCreeps = [];
let towers;
let containers;
let flags;
/**
 * @type Spawn
 */
let spawn;
let sources;

export function loop() {

  towers = getObjectsByPrototype(StructureTower);
  containers = getObjectsByPrototype(StructureContainer);
  //flags = getObjectsByPrototype(Flag);
  spawn = getObjectsByPrototype(StructureSpawn)[0];
  sources = getObjectsByPrototype(Source);
  myAttackers = [];
  myHealers = [];
  myRanged = [];
  myWorkers = [];
  myHaulers = [];
  enemyCreeps = [];
  getObjectsByPrototype(Creep).forEach((creep) => {
    if (creep.my) {
      if (creep.body.some((part) => part.type == ATTACK)) {
        myAttackers.push(creep);
      } else if (creep.body.some((part) => part.type == HEAL)) {
        myHealers.push(creep);
      } else if (creep.body.some((part) => part.type == RANGED_ATTACK)) {
        myRanged.push(creep);
      } else if (creep.body.some((part) => part.type == WORK)) {
        myWorkers.push(creep);
      } else if (creep.body.some((part) => part.type == CARRY)) {
        myHaulers.push(creep);
      }
    } else {
      enemyCreeps.push(creep);
    }
  });

  spawnCreeps();
  runAttackers();
  runRanged();
  runHealers();
  runWorkers();
  runHaulers();


  runTowers();
}

function spawnCreeps() {
  if (spawn) {
    if (myWorkers.length < 2) {
      spawn.spawnCreep([WORK, CARRY, MOVE]);
    } else if (myHealers.length < 1) {
      spawn.spawnCreep([HEAL, MOVE]);
    } else if (myAttackers.length < 1) {
      spawn.spawnCreep([ATTACK, MOVE]);
    } else if (myRanged.length < 1) {
      spawn.spawnCreep([RANGED_ATTACK, MOVE]);
    }
  }
}

function runTowers() {
  for (let t in towers) {
    /**
     * @type StructureTower
     */
    let tower = towers[t];
    let enemy = creep.findClosestByRange(enemyCreeps);
    let attRet = tower.attack(enemy);

    console.log(t, "Attack:", attRet)
  }
}

function runAttackers() {
  for (let c in myAttackers) {
    /**
     * @type Creep
     */
    let creep = myAttackers[c];

    let attRet = false,
      moveRet = false;
    let enemy = creep.findClosestByRange(enemyCreeps);
    if (creep.getRangeTo(enemy) == 1) {
      attRet = creep.attack(enemy);
    }
    if (creep.getRangeTo(enemy) > 1) {
      moveRet = creep.moveTo(enemy);
    }
    console.log(creep, "move:", moveRet, "Attack:", attRet)
  }
}

function runHealers() {
  for (let c in myHealers) {
    /**
     * @type Creep
     */
    let creep = myHealers[c];

    let attRet = false,
      moveRet = false;
    let target = creep.findClosestByRange([...myRanged, ...myAttackers, ...myHealers, ...myWorkers].filter((c) => c.hits < c.hitsMax));
    if (!target) {
      target = myAttackers[0]
    }
    if (!target) {
      target = myWorkers[0]
    }
    if (!target) {
      target = spawn
    }
    if (creep.getRangeTo(target) < 0) {
      attRet = creep.heal(target);
    } else if (creep.getRangeTo(target) <= 3) {
      attRet = creep.rangedHeal(target);
    }
    if (creep.getRangeTo(target) > 1) {
      moveRet = creep.moveTo(target);
    }
    console.log(creep, "move:", moveRet, "Attack:", attRet)
  }
}

function runRanged() {
  for (let c in myRanged) {
    /**
     * @type Creep
     */
    let creep = myRanged[c];

    let attRet = false,
      moveRet = false;
    let enemy = creep.findClosestByRange(enemyCreeps);
    if (creep.getRangeTo(enemy) <= 3) {
      attRet = creep.rangedAttack(enemy);
    }
    if (creep.getRangeTo(enemy) > 2) {
      moveRet = creep.moveTo(enemy);
    }
    console.log(creep, "move:", moveRet, "Attack:", attRet)
  }
}

function runWorkers() {
  for (let c in myWorkers) {
    /**
     * @type Creep
     */
    let creep = myWorkers[c];
    console.log("running Creep", c)
    let attRet = false,
      moveRet = false;
    let esource = creep.findClosestByRange(sources);
    let etarget = spawn;
    if (creep.mining == undefined) {
      creep.mining = true;
    } else if (creep.mining && creep.store.getFreeCapacity() == 0) {
      creep.mining = false;
    } else if (!creep.mining && creep.store.getUsedCapacity() == 0) {
      creep.mining = true;
    }
    let target = !creep.mining ? etarget : esource;
    console.log(c, creep.mining, target);
    if (!target) {
      console.log("creep", c, "no target", creep.mining);
      return;
    }
    if (creep.getRangeTo(target) == 1) {
      if (!creep.mining) {
        attRet = creep.transfer(target, RESOURCE_ENERGY);
      } else {
        attRet = creep.harvest(target);
      }
    }
    if (creep.getRangeTo(target) > 1) {
      moveRet = creep.moveTo(target);
    }
    console.log(c, "move:", moveRet, "Attack:", attRet)
  }
}

function runHaulers() {

  for (let c in myHaulers) {
    /**
     * @type Creep
     */
    let creep = myHaulers[c];
    let attRet = false,
      moveRet = false;
    let esource = sources.filter((c) => c.store.getUsedCapacity() > 0);
    console.log(towers[0].store.getCapacity(), towers[0].store.getFreeCapacity())
    let etarget = [spawn];
    let hasEnergy = creep.store.energy > 0;
    let target = hasEnergy ? etarget[0] : esource[0]
    console.log(c, hasEnergy, target);
    if (!target) {
      console.log("creep", c, "no target", hasEnergy);
      return;
    }
    if (creep.getRangeTo(target) == 1) {
      if (hasEnergy) {
        attRet = creep.transfer(target, RESOURCE_ENERGY);
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