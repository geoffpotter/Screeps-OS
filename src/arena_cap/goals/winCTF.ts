import { BaseGoal, idType, goals, Goal } from "shared/subsystems/planning/goal";

import { Creep } from "game/prototypes";
import { Flag } from "arena/prototypes";
import { getObjectsByPrototype } from "game/utils";
import { defendLocation } from "./defendLocation";
import { attackLocation } from "./attackLocation";
import { FakeGameObject, getSettings } from "shared/utils/settings";

export class winCTF extends BaseGoal implements Goal {
  static type = "winCTF";

  defenseGoals: defendLocation[];
  attackGoals: attackLocation[];

  constructor() {
    let id = "winCTF"
    super(id, false);

    this.defenseGoals = [];
    this.attackGoals = [];

  }

  /**
   * check all the flags, make sure we've got a goal for each one
   */
  runGoal(): void {
    //console.log('running goal', this.id)
    //this.setupChildGoals();
    this.runChildGoals();
  };

  runChildGoals() {
    for(let goal of this.defenseGoals) {
      goal.runGoal()
    }

    for(let goal of this.attackGoals) {
      goal.runGoal()
    }
  }

  assignCreep(creep:Creep) {
    //console.log(this.id, "checking creep", creep.id)
    for(let dGoal of this.defenseGoals) {
      if(dGoal.assignCreep(creep))
        return true;
    }
    for(let aGoal of this.attackGoals) {
      if(aGoal.assignCreep(creep))
        return true;
    }
    return false;
  }

  assignTarget(target: FakeGameObject): boolean {
    let settings = getSettings();
    let distToOurFlag = settings.getRange(this.defenseGoals[0], target);
    //console.log(this.id, "checking target", target.id, target.constructor.name, distToOurFlag);
    if(distToOurFlag < 10) {
      for(let dGoal of this.defenseGoals) {
        if(dGoal.assignTarget(target))
          return true;
      }
    } else {
      for(let aGoal of this.attackGoals) {
        if(aGoal.assignTarget(target))
          return true;
      }
    }


    return false;
  };


  setupChildGoals() {
    let flags = getObjectsByPrototype(Flag);
    console.log("checking flags", flags.length)
    for (let flag of flags) {
      console.log("setting up child goals", this.id)
      if (flag.my) {
        let goalId = `defend-${flag.x}-${flag.y}`;
        if (!goals.has(goalId)) {
          console.log("making defend goal", flag)
          //no goal for this flag yet, make one
          let defendGoal = new defendLocation(goalId, this, flag.x, flag.y);
          this.defenseGoals.push(defendGoal);
        }
      } else {
        let goalId = `attack-${flag.x}-${flag.y}`;
        if (!goals.has(goalId)) {
          console.log("Making attack goal", flag)
          let attackGoal = new attackLocation(goalId, this, flag.x, flag.y);
          this.attackGoals.push(attackGoal);
          attackGoal.assignTarget(flag);
        }
      }
    }
  }

}
