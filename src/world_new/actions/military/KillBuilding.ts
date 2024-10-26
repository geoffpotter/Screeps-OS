import { getGameObjectWrapperById } from "world_new/wrappers/base/AllGameObjects";
import { AnyKillableWrapper } from "world_new/wrappers/base/KillableWrapper";
import CreepWrapper from "world_new/wrappers/creep/CreepWrapper";
import { BaseCreepAction } from "../base/BaseCreepAction";
import { ActionDemand } from "../base/ActionDemand";



export class KillBuilding extends BaseCreepAction<AnyKillableWrapper> {

  static actionType = "🧨";
  constructor(target:AnyKillableWrapper, priority: number = 0) {
    super(KillBuilding.actionType, target, priority);
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
    let distanceToTarget = object.wpos.getRangeTo(this.target.wpos);
    if(creepClassification.hasAttackActive && distanceToTarget <= 1) {
      //@ts-ignore
      let ret = object.get().attack(this.target.get());
      if(!ret) {
        console.log(object.id, "tried to attack", this.target.id, "got", ret);
        return true;
      }
    }
    if(creepClassification.hasRangedActive && distanceToTarget <= 3) {
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

