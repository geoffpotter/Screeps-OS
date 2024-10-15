import CreepWrapper from "world_new/wrappers/creep/CreepWrapper";
import { getGameObjectWrapperById } from "world_new/wrappers/base/AllGameObjects";
import { BodyPartInfoCollection } from "shared/utils/Collections/BodyInfoCollection";
import { ResourceInfoCollection } from "shared/utils/Collections/ResourceInfoCollection";
import { BaseAction } from "../base/BaseAction";
import { BasePartAction, BasePartActionMemory } from "../base/BasePartAction";
import { BaseResourceAction } from "../base/BaseResourceAction";
import { StorableClass } from "shared/utils/memory/MemoryManager";
import { baseStorable } from "shared/utils/memory";
import { ActionDemand } from "../base/ActionHelpers";

export interface KillCreepMemory extends BasePartActionMemory {
}

export class KillCreep extends BasePartAction<CreepWrapper> implements StorableClass<KillCreep, typeof KillCreep, KillCreepMemory> {
  static fromJSON(json: KillCreepMemory, action?: KillCreep): KillCreep {
    if (!action) {
      const target = getGameObjectWrapperById(json.targetId) as CreepWrapper;
      action = new KillCreep(target);
    }
    BasePartAction.fromJSON(json, action);
    return action;
  }

  static actionType = "🎯";
  constructor(target:CreepWrapper) {
    super(KillCreep.actionType, target, []);
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

  calculateDemand(): ActionDemand {
    const target = this.target.getObject();
    if (!target) return {};
    return {
      // [ATTACK]: Math.ceil(target.hits / ATTACK_POWER),
      [RANGED_ATTACK]: Math.ceil(target.hits / RANGED_ATTACK_POWER),
    };
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
    if(creepClassification.hasAttackActive && assignment.distanceToTarget <= 1) {
      creep.attack(target);
    }
    if(creepClassification.hasRangedActive && assignment.distanceToTarget <= 3) {
      creep.rangedAttack(target);
      //creep.rangedMassAttack();
    }
    return false;
  }
}

