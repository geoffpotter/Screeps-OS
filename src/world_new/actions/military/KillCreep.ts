import CreepWrapper from "world_new/wrappers/creep/CreepWrapper";
import { getGameObjectWrapperById } from "world_new/wrappers/base/AllGameObjects";
import { BodyPartInfoCollection } from "shared/utils/Collections/BodyInfoCollection";
import { BaseCreepAction } from "../base/BaseCreepAction";
import { StorableClass } from "shared/utils/memory/MemoryManager";
import { baseStorable } from "shared/utils/memory";
import { ActionDemand } from "../base/ActionDemand";

export class KillCreep extends BaseCreepAction<CreepWrapper> {

  static actionType = "🎯";
  constructor(target:CreepWrapper, priority: number = 0) {
    super(KillCreep.actionType, target, priority);
  }
  canDo(object: CreepWrapper): boolean {
    if(!super.canDo(object)) return false;
    let creepClassification = object.getBodyClassification();
    //have to have attack or ranged parts to kill.
    if(creepClassification.hasAttackActive || creepClassification.hasRangedActive) {
      return true;
    }
    //losers.
    return false;
  }

  calculateDemand(): ActionDemand<BodyPartConstant> {
    const target = this.target.getObject();
    let ret = new ActionDemand<BodyPartConstant>();
    if (!target) return ret;
    // ret.set(ATTACK, Math.ceil(target.hits / ATTACK_POWER));
    ret.set(RANGED_ATTACK, Math.ceil(target.hits / RANGED_ATTACK_POWER));
    return ret;
  }

  // predictedDoneTick(object: GameObjectWrapper<Creep>): number {
  // }

  doAction(object:CreepWrapper) {
    if(!this.target.exists) return true; //creep dead!
    let assignment = this.assignments.get(object.id);
    if(!assignment) return true; //not assigned?!?!

    let creep = object.getObject();
    if(!creep) throw new Error("no creep for " + object.id + "something is very wrong");

    let target = this.target.getObject();
    if(!target) return true; //creep dead!


    let creepClassification = object.getBodyClassification();
    let distanceToTarget = object.wpos.getRangeTo(this.target.wpos);
    if(creepClassification.hasAttackActive && distanceToTarget <= 1) {
      creep.attack(target);
    }
    if(creepClassification.hasRangedActive && distanceToTarget <= 3) {
      creep.rangedAttack(target);
      //creep.rangedMassAttack();
    }
    return false;
  }
}

