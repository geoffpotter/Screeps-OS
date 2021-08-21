import {
  getObjectsByPrototype
} from 'game/utils';
import {
  Creep,
  Flag
} from 'game/prototypes';
import {
  ATTACK,
  HEAL,
  RANGED_ATTACK
} from 'game/constants';

export function loop() {
  let myAttackers = [];
  let myhealers = [];
  let myRanged = [];
  let enemyCreeps = [];
  getObjectsByPrototype(Creep).forEach((creep) => {
    if (creep.my) {
      if (creep.body.some((part) => part.type == ATTACK)) {
        myAttackers.push(creep);
      } else if (creep.body.some((part) => part.type == HEAL)) {
        myhealers.push(creep);
      } else if (creep.body.some((part) => part.type == RANGED_ATTACK)) {
        myRanged.push(creep);
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
  for (let c in myhealers) {
    /**
     * @type Creep
     */
    let creep = myhealers[c];

    let attRet = false,
      moveRet = false;
    let target = creep.findClosestByRange([...myRanged, ...myAttackers, ...myhealers].filter((c) => c.hits < c.hitsMax));
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
}