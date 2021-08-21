import {
  getObjectsByPrototype
} from 'game/utils';
import {
  Creep,
  Flag,
  StructureTower,
  StructureContainer
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

export function loop() {
  let myAttackers = [];
  let myHealers = [];
  let myRanged = [];
  let myWorkers = [];
  let myHaulers = [];
  let myCreeps = []
  let enemyCreeps = [];
  let towers = getObjectsByPrototype(StructureTower);
  let containers = getObjectsByPrototype(StructureContainer);
  let flags = getObjectsByPrototype(Flag);


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
        // } else if (creep.body.some((part) => part.type == CARRY)) {
        //     myHaulers.push(creep);
      } else {
        myCreeps.push(creep);
      }
    } else {
      enemyCreeps.push(creep);
    }
  });
  /**
   * @type Creep
   */
  let enemy = enemyCreeps[0];
  for (let c in myAttackers) {
    /**
     * @type Creep
     */
    let creep = myAttackers[c];

    let attRet = false,
      moveRet = false;
    if (creep.getRangeTo(enemy) == 1) {
      attRet = creep.attack(enemy);
    }
    if (creep.getRangeTo(enemy) > 1) {
      moveRet = creep.moveTo(enemy);
    }
    console.log(creep, "move:", moveRet, "Attack:", attRet)
  }
  for (let c in myHealers) {
    /**
     * @type Creep
     */
    let creep = myHealers[c];

    let attRet = false,
      moveRet = false;
    let target = creep.findClosestByRange([...myRanged, ...myAttackers, ...myHealers].filter((c) => c.hits < c.hitsMax));
    if (!target) {
      target = myAttackers[0]
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
  for (let c in myRanged) {
    /**
     * @type Creep
     */
    let creep = myRanged[c];

    let attRet = false,
      moveRet = false;
    if (creep.getRangeTo(enemy) <= 3) {
      attRet = creep.rangedAttack(enemy);
    }
    if (creep.getRangeTo(enemy) > 2) {
      moveRet = creep.moveTo(enemy);
    }
    console.log(creep, "move:", moveRet, "Attack:", attRet)
  }

  for (let c in myRanged) {
    /**
     * @type Creep
     */
    let creep = myRanged[c];

    let attRet = false,
      moveRet = false;
    if (creep.getRangeTo(enemy) <= 3) {
      attRet = creep.rangedAttack(enemy);
    }
    if (creep.getRangeTo(enemy) > 2) {
      moveRet = creep.moveTo(enemy);
    }
    console.log(creep, "move:", moveRet, "Attack:", attRet)
  }

  for (let c in myWorkers) {
    /**
     * @type Creep
     */
    let creep = myWorkers[c];
    console.log(creep, "No worker code")
  }

  for (let c in myHaulers) {
    /**
     * @type Creep
     */
    let creep = myHaulers[c];
    let attRet = false,
      moveRet = false;
    let esource = containers.filter((c) => c.store.getUsedCapacity() > 0);
    console.log(towers[0].store.getCapacity(), towers[0].store.getFreeCapacity())
    let etarget = towers.filter((t) => t.store.getCapacity() != t.store.energy);
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

  for (let t in towers) {
    /**
     * @type StructureTower
     */
    let tower = towers[t];
    let attRet = tower.attack(enemy);

    console.log(t, "Attack:", attRet)
  }

  for (let c in myCreeps) {
    /**
     * @type Creep
     */
    let creep = myCreeps[c];

    let attRet = false,
      moveRet = false;
    let flag = creep.findClosestByPath(flags);
    if (creep.getRangeTo(flag) > 0) {
      moveRet = creep.moveTo(flag);
    }
    console.log(creep, "move:", moveRet, "flag", flag)
  }
}