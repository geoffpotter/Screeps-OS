import {
  Creep,
} from 'game/prototypes';

/*
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
*/

declare module "game/prototypes" {
  interface Creep {
    isAttacker():void;
    isRangedAttacker():void;
    isHealer():void;
    isWorker():void;
    isHauler():void;
    run():void;
  }
}

Creep.prototype.isAttacker = function() {
  return this.body.some((part) => part.type == ATTACK)
}
Creep.prototype.isRangedAttacker = function() {
  return this.body.some((part) => part.type == RANGED_ATTACK)
}
Creep.prototype.isHealer = function() {
  return this.body.some((part) => part.type == HEAL)
}
Creep.prototype.isWorker = function() {
  return this.body.some((part) => part.type == WORK)
}
Creep.prototype.isHauler = function() {
  return this.body.some((part) => part.type == CARRY)
}