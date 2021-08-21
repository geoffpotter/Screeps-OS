import { baseGoal, idType, goals } from "subsystems/goal";

import { Creep } from "game/prototypes";
import { Flag } from "arena/prototypes";
import { getObjectsByPrototype } from "game/utils";
import { defendLocation } from "./defendLocation";
import { attackLocation } from "./attackLocation";

export class winCTF extends baseGoal {
  static type = "winCTF";

  defenseGoals: defendLocation[];
  attackGoals: attackLocation[];

  constructor(id: idType, parent: baseGoal | false = false) {
    super(id, parent);

    this.defenseGoals = [];
    this.attackGoals = [];
  }
  /**
   * check all the flags, make sure we've got a goal for each one
   */
  runGoal(): void {
    this.setupChildGoals();
    this.runChildGoals();
  }

  runChildGoals() {
    for(let goal of this.defenseGoals) {
      goal.runGoal()
    }
    
    for(let goal of this.attackGoals) {
      goal.runGoal()
    }
  }

  reassignCreeps() {
    let creeps = getObjectsByPrototype(Creep);
    let ranged:Creep[] = [];
    let attack:Creep[] = [];
    let heal:Creep[] = [];
    for(let creep of creeps) {

    }
  }


}
