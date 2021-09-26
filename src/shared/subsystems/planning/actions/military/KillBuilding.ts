import { ATTACK, CARRY, RANGED_ATTACK } from "game/constants";
import { Creep } from "game/prototypes";
import { AnyGameObjectWrapper, AnyKillableWrapper, baseGameObject, CreepWrapper, GameObjectWrapper } from "shared/subsystems/wrappers";
import { HasStorage, HasStorageWrapper } from "shared/subsystems/wrappers/HasStorageWrapper";
import { getSettings } from "shared/utils";
import { BodyPartInfoCollection } from "shared/utils/Collections/BodyInfoCollection";
import { ResourceInfoCollection } from "shared/utils/Collections/ResourceInfoCollection";
import { Action, BaseAction } from "../BaseAction";
import { BasePartAction, PartAction } from "../BasePartAction";
import { BaseResourceAction, ResourceAction } from "../BaseResourceAction";




export class KillBuilding extends BasePartAction<AnyKillableWrapper> implements BasePartAction<AnyKillableWrapper> {
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


  getAssignmentAmount(object:CreepWrapper): BodyPartInfoCollection {
    let validParts = new BodyPartInfoCollection();

    let creepClassification = object.getBodyClassification();
    validParts.setAmount(ATTACK,  creepClassification.numAttackActive);
    validParts.setMax(ATTACK, 100);
    validParts.setAmount(RANGED_ATTACK,  creepClassification.numRangedActive);
    validParts.setMax(RANGED_ATTACK, 100);
    return validParts;
  }

  // predictedDoneTick(object: GameObjectWrapper<Creep>): number {
  // }

  doJob(object:CreepWrapper) {
    if(!this.target.get().exists) {
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

