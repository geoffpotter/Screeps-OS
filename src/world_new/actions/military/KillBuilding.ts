import { getGameObjectWrapperById } from "world_new/wrappers/base/AllGameObjects";
import { AnyKillableWrapper } from "world_new/wrappers/base/KillableWrapper";
import CreepWrapper from "world_new/wrappers/creep/CreepWrapper";
import { BodyPartInfoCollection } from "shared/utils/Collections/BodyInfoCollection";
import { BasePartAction, BasePartActionMemory } from "../base/BasePartAction";
import { StorableClass } from "shared/utils/memory/MemoryManager";
import { ActionDemand } from "../base/ActionHelpers";


export interface KillBuildingMemory extends BasePartActionMemory {

}

export class KillBuilding extends BasePartAction<AnyKillableWrapper> implements StorableClass<KillBuilding, typeof KillBuilding, KillBuildingMemory> {
  static fromJSON(json: KillBuildingMemory, action?: KillBuilding): KillBuilding {
    if (!action) {
      const target = getGameObjectWrapperById(json.targetId) as AnyKillableWrapper;
      action = new KillBuilding(target);
    }
    BasePartAction.fromJSON(json, action);
    return action;
  }

  static actionType = "🧨";
  constructor(target:AnyKillableWrapper) {
    super(KillBuilding.actionType, target, []);
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
      [ATTACK]: Math.ceil(target.hits / ATTACK_POWER),
      // [RANGED_ATTACK]: Math.ceil(target.hits / RANGED_ATTACK_POWER),
    };
  }

  // predictedDoneTick(object: GameObjectWrapper<Creep>): number {
  // }

  doAction(object:CreepWrapper) {
    if(!this.target.exists) {
      console.log(object.id, "attaking dead object", this.id)
      return true; //shits dead!
    }
    let assignment = this.assignments.get(object.id);
    if(!assignment){
      console.log(object.id, "not assigned to", this.id, "wtf you doin?")
      return true; //not assigned?!?!
    }

    let creepClassification = object.getBodyClassification();
    if(creepClassification.hasAttackActive && assignment.distanceToTarget <= 1) {
      //@ts-ignore
      let ret = object.get().attack(this.target.get());
      if(!ret) {
        console.log(object.id, "tried to attack", this.target.id, "got", ret);
        return true;
      }
    }
    if(creepClassification.hasRangedActive && assignment.distanceToTarget <= 3) {
      //@ts-ignore
      let ret = object.get().rangedAttack(this.target.get());
      if(!ret) {
        console.log(object.id, "tried to ranged attack", this.target.id, "got", ret);
        return true;
      }
    }
    return false;
  }
}

