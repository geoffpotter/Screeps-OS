import { ATTACK, CARRY, HEAL, RANGED_ATTACK, WORK } from 'game/constants';
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
    isAttacker(onlyActive?:boolean):boolean;
    isRangedAttacker(onlyActive?:boolean):boolean;
    isHealer(onlyActive?:boolean):boolean;
    isWorker():boolean;
    isHauler():boolean;
    smartMove(direction: DirectionConstant): CreepMoveReturnCode | undefined;
  }
}


Creep.prototype.smartMove = function(direction: DirectionConstant): CreepMoveReturnCode | undefined {
  console.log(this.id, "moving", direction, this.move);
  return this.move(direction);
}




Creep.prototype.isAttacker = function(onlyActive = false) {
  if(!onlyActive) {
    return this.body.some((part) => part.type == ATTACK)
  } else {
    return this.body.some((part) => part.type == ATTACK && part.hits!=0)
  }
}
Creep.prototype.isRangedAttacker = function(onlyActive = false) {
  if(!onlyActive) {
    return this.body.some((part) => part.type == RANGED_ATTACK)
  } else {
    return this.body.some((part) => part.type == RANGED_ATTACK && part.hits!=0)
  }
}
Creep.prototype.isHealer = function(onlyActive = false) {
  if(!onlyActive) {
    return this.body.some((part) => part.type == HEAL)
  } else {
    return this.body.some((part) => part.type == HEAL && part.hits!=0)
  }
}
Creep.prototype.isWorker = function() {
  return this.body.some((part) => part.type == WORK)
}
Creep.prototype.isHauler = function() {
  return this.body.some((part) => part.type == CARRY)
}



Object.defineProperty(Creep.prototype, "squad", {
  get(){
    return this._squad ?? false;
  },
  set(value){
    this._squad = value;
  }
})




// Object.defineProperty(Creep.prototype, "targets", {
//   get(){
//     return this._targets ?? [];
//   },
//   set(value){
//     this._targets = value;
//   }
// })
// Object.defineProperty(Creep.prototype, "moveTarget", {
//   get(){
//     return this._targets ?? [];
//   },
//   set(value){
//     this._targets = value;
//   }
// })


