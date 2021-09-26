import { ATTACK, CARRY, CLAIM, HEAL, MOVE, RANGED_ATTACK, TOUGH, WORK } from "game/constants";
import { Creep } from "game/prototypes";
import { idType, setInterval, clearInterval } from "shared/polyfills";
import { builtInQueues } from "shared/polyfills/tasks";
import { getSettings } from "shared/utils/"
import { CachedValue } from "shared/utils/caching/CachedValue";
import { CacheHelper } from "shared/utils/caching/CacheHelper";
import { Location } from "shared/utils/map/Location";
import { Action, BaseAction, findClosestAction } from "../planning/actions/BaseAction";
import { BasePartAction } from "../planning/actions/BasePartAction";
import { BaseResourceAction } from "../planning/actions/BaseResourceAction";
import { createObjectWrapper, GameObjectWrapper, getObjectWrapper } from "./GameObjectWrapper";
import { HasStorageWrapper } from "./HasStorageWrapper";
import { StructureWrapper } from "./StructureWrapper";

declare module "game/prototypes" {
  interface Creep {
    getWrapper():CreepWrapper;
    spawning:boolean;
    structureType:StructureConstant;
  }
}
//@ts-ignore using non standard structure type
Creep.prototype.structureType = "creep";
Creep.prototype.getWrapper = function() {
  let wrapper:CreepWrapper|false = getObjectWrapper(this);
  if(wrapper)
    return wrapper;

  wrapper = createObjectWrapper<Creep, CreepWrapper>(CreepWrapper, this);
  creepWrappers.set(wrapper.id, wrapper);
  return wrapper;
}


let creepWrappers: Map<string, CreepWrapper> = new Map();
//run creep movement
setInterval(()=>{
  creepWrappers.forEach(wrapper=>{
    if(!wrapper.get().exists) {
      creepWrappers.delete(wrapper.id);
      return;
    }
    wrapper.move();
  })
}, 1, builtInQueues.MOVEMENT)


type BodyPartConstant = MOVE | WORK | CARRY | ATTACK | RANGED_ATTACK | TOUGH | HEAL | CLAIM;
type BodyPartDescriptor = { type: BodyPartConstant; hits: number };

// let creepBodies: Set<CreepBody> = new Set();
// setInterval(() => {
//   creepBodies.forEach((creepBody) => {
//     creepBody.tickInit();
//   })
// }, 1, "init");

interface bodyClassification {
  hasAttack: boolean;
  hasRanged: boolean;
  hasHeal: boolean;

  hasAttackActive: boolean;
  hasRangedActive: boolean;
  hasHealActive: boolean;

  numAttack: number;
  numRanged: number;
  numHeal: number;

  numAttackActive: number;
  numRangedActive: number;
  numHealActive: number;

  //economy stuff
  hasWork:boolean;
  hasCarry:boolean;

  numWork:number;
  numCarry:number;

  fatness: number;
  toughness: number;
}
function newBodyClassification():bodyClassification {
  return {
    hasAttack: false, hasRanged: false, hasHeal: false,
    hasAttackActive: false, hasRangedActive: false, hasHealActive: false,
    numAttack: 0, numRanged: 0, numHeal: 0,
    numAttackActive: 0, numRangedActive: 0, numHealActive: 0,

    hasWork: false, hasCarry: false,
    numWork:0, numCarry:0,

    fatness:0, toughness:0
  }
}

export enum CreepClass {
  healer = "👨‍⚕️",//mostly heal parts
  ranged = "🏹",//mostly ranged parts
  attacker = "🤺",//mostly attack parts

  sheild = "🛡",//attack+>50%heal
  paladin = "🏇",//ranged+>50%heal
  poop = "💩",//attack+>%50ranged or ranged+>50%attack or heal+>50%attack|ranged

  wounded = "🩹",

  hauler = "🚚", //Carry no work
  worker = "🚜", // work+>=50%carry
  miner = "⛏" // Work+<50%carry

}
export function classifyCreep(creepWrapper: Creep | CreepWrapper, woundedThreshold:number=0.5) {
  //pick a class for this creep
  if(creepWrapper instanceof Creep) {
    creepWrapper = creepWrapper.getWrapper();
  }
  let creep = creepWrapper.get();
  let bodyClass = creepWrapper.getBodyClassification();
  let highestPartCount = Math.max(bodyClass.numAttack, bodyClass.numRanged, bodyClass.numHeal);
  let activePartCount = bodyClass.numAttackActive + bodyClass.numHealActive + bodyClass.numRangedActive;
  //if creep is under wounded threshhold, pick wounded
  //then go through parts in attack->range->heal order to determine class type
  if (creep.hits <= creep.hitsMax * woundedThreshold || activePartCount == 0) {
    return CreepClass.wounded;
  } else if (bodyClass.numAttack == highestPartCount) { //mostly attack parts(or equal I guess)
    //some form of attack creep
    if (bodyClass.hasHeal && bodyClass.numAttack * 0.5 <= bodyClass.numHeal) {
      //at least 50% as many heal parts as attack
      return CreepClass.sheild
    }
    if (bodyClass.hasRanged && bodyClass.numAttack * 0.5 <= bodyClass.numRanged) {
      //at least 50% as many ranged parts as attack
      return CreepClass.poop;
    }
    return CreepClass.attacker;
  } else if (bodyClass.numRanged == highestPartCount) {
    if (bodyClass.numRanged * 0.5 <= bodyClass.numHeal) {
      // at least 50% heal parts
      return CreepClass.paladin;
    }
    if (bodyClass.hasAttack && bodyClass.numRanged * 0.5 <= bodyClass.numAttack) {
      //at least 50% as many attack parts as ranged
      return CreepClass.poop;
    }
    return CreepClass.ranged;
  } else if (bodyClass.numHeal == highestPartCount) {
    if (bodyClass.hasAttack && bodyClass.numHeal * 0.5 <= bodyClass.numAttack) {
      //at least 50% as many attack parts as heal
      return CreepClass.poop;
    }
    if (bodyClass.hasRanged && bodyClass.numHeal * 0.5 <= bodyClass.numRanged) {
      //at least 50% as many ranged parts as heal
      return CreepClass.poop;
    }
    return CreepClass.healer;
  } else if (bodyClass.numWork == highestPartCount) {
    if(bodyClass.hasCarry && bodyClass.numWork * 0.5 <= bodyClass.numCarry) {
      return CreepClass.miner;
    }
    return CreepClass.worker;
  } else if (bodyClass.numCarry == highestPartCount) {
    if(bodyClass.hasWork) {
      return CreepClass.worker;
    }
    return CreepClass.hauler;
  }

  return CreepClass.poop;
}


export class CreepBody {
  creepWrapper: CreepWrapper;
  body: BodyPartDescriptor[];
  /**
   * number from 0.0-1.0 representing the hits threshold for being wounded
   */
  woundedThreshold: number = 0.55;

  private creepClass: CachedValue<CreepClass>;
  private bodyClassification: CachedValue<bodyClassification>;

  updateBody() {
    this.body = this.creepWrapper.get().body;
  }
  getBodyClassification() {
    //console.log(this.creepWrapper.id, "getting body", this.bodyClassification)
    let classification = this.bodyClassification.get();
    //console.log(classification)
    return classification;
  }

  constructor(creepWrapper: CreepWrapper) {
    this.creepWrapper = creepWrapper;
    this.body = creepWrapper.get().body;
    this.updateBody();
    this.bodyClassification = this.setupBodyClassification(creepWrapper);
    this.creepClass = new CachedValue(() => {
      return classifyCreep(creepWrapper.get(), this.woundedThreshold)
    }, getSettings().creepClassCacheTicks, false)
  }


  private setupBodyClassification(creepWrapper: CreepWrapper) {

    return new CachedValue<bodyClassification>(() => {
      let creep = creepWrapper.get();
      let ret = newBodyClassification();
      if(!creep.exists) return ret;

      console.log("counting body parts", creep.body.length)
      ret.hasAttack = ret.hasRanged = ret.hasHeal = false;
      ret.numAttack = ret.numRanged = ret.numHeal = 0;
      ret.hasAttackActive = ret.hasRangedActive = ret.hasHealActive = false;
      ret.numAttackActive = ret.numRangedActive = ret.numHealActive = 0;

      //handle body counts
      for (let part of creep.body) {
        if (part.type == ATTACK) {
          ret.hasAttack = true;
          ret.numAttack++;
          if (part.hits > 0) {
            ret.hasAttackActive = true;
            ret.numAttackActive++;
          }
        }
        if (part.type == RANGED_ATTACK) {
          ret.numRanged++;
          ret.hasRanged = true;
          if (part.hits > 0) {
            ret.hasRangedActive = true;
            ret.numRangedActive++;
          }
        }
        if (part.type == HEAL) {
          ret.hasHeal = true;
          ret.numHeal++;
          if (part.hits > 0) {
            ret.hasHealActive = true;
            ret.numHealActive++;
          }
        }

        if (part.type == CARRY) {
          ret.hasCarry = true;
          ret.numCarry++;
        }
        if (part.type == WORK) {
          ret.hasWork = true;
          ret.numWork++;
        }

      }



      //console.log('counted body:', ret)
      return ret;
    });
  }

  getCreepClass(): CreepClass {
    return this.creepClass.get();
  }

  isAttacker(onlyActive = false) {
    let description = this.bodyClassification.get();
    if (onlyActive) {
      return description.hasAttackActive;
    } else {
      return description.hasAttack;
    }
  }
  isRangedAttacker(onlyActive = false) {
    let description = this.bodyClassification.get();
    if (onlyActive) {
      return description.hasRangedActive;
    } else {
      return description.hasRanged;
    }
  }
  isHealer(onlyActive = false) {
    let description = this.bodyClassification.get();
    if (onlyActive) {
      return description.hasHealActive;
    } else {
      return description.hasHeal;
    }
  }
  isWorker() {
    return this.body.some((part) => part.type == WORK)
  }
  isHauler() {
    return this.body.some((part) => part.type == CARRY)
  }
  hasPart(partType:BodyPartConstant) {
    return this.body.some((part)=> part.type == partType);
  }
  numParts(partType:BodyPartConstant) {
    return this.body.filter((part)=> part.type == partType).length;
  }
}

export class CreepWrapper extends HasStorageWrapper<Creep> {

  //assigned action
  _action:Action<CreepWrapper>|false = false;
  get action() {
    //find new action if false
    if(!this._action || !this._action.valid()) {
      this._action = findClosestAction<BasePartAction|BaseResourceAction>(this, [BasePartAction, BaseResourceAction]);
      if(!this._action)
        console.log("no action found!!!")
      else {
        this._action.assign(this);
      }
    }
    if(this._action) {
      return this._action
    }
    return false;
  }
  set action(newVal:Action<CreepWrapper>|false) {
    this._action = newVal;
  }

  //targeting
  private targetPrimary:GameObjectWrapper<any>|false = false;
  private targetsSecondary:GameObjectWrapper<any>[] = [];

  //movement
  private targetLocation:GameObjectWrapper<any>|false = false;
  private forcedMoveDir:DirectionConstant|false = false;


  _spawning:boolean = false;
  get spawning() {
    return this._spawning
  }
  set spawning(isSpawning:boolean) {
    if(!isSpawning) {
      this.body = new CreepBody(this);
    }
  }
  private body: CreepBody;
  getCreepClass() {
    return this.body.getCreepClass();
  }
  getBodyClassification() {
    return this.body.getBodyClassification();
  }
  hasBodyPart(part:BodyPartConstant) {
    return this.body.hasPart(part);
  }

  isFull() {
    return this.get().store.getFreeCapacity() == 0;
  }

  constructor(creep: Creep) {
    super(creep);
    this.body = new CreepBody(this);
    if(creepWrappers.has(this.id)) {
      throw new Error("duplicate creep wrapper!" + this.id)
    }
    creepWrappers.set(this.id, this);
  }




  /**
   * find new actions
   */
  update() {
    super.update(false, false);
    //if(this.body.getBodyClassification())
    if(!this.my) return;
    let action = this.action;
    if(action) {
      console.log(this.id, "has action", action.id);
    }
  }

  /**
   * preform any actions
   */
  run() {
    let action = this.action;
    if(!action){
      console.log(this.id, "has no action, doing nothing")
      return;
    }

    let rangeToAction = getSettings().getRange(this, action.target);
    console.log(this.id, "range to action", rangeToAction, "max range", action.maxRange)
    if(rangeToAction <= action.maxRange) {
      let actionDone = action.doJob(this);
      if(actionDone==true) {
        console.log(this.id, "finished action", action.id)
        this.action && this.action.unassign(this);
        this.action = false;
      }
    }
  }

  /**
   * do movement
   */
  move() {
    let action = this.action;//researches for new action if it was completed during the do phase.
    if(!action){
      console.log(this.id, "has no action, not moving")
      return;
    }

    let rangeToAction = getSettings().getRange(this, action.target);
    if(rangeToAction > action.maxRange) {
      this.get().moveTo(action.target);
    }
  }

}

