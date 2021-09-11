
import { Squad } from "arena_cap/squad";
import { Creep } from "game/prototypes";
import { FakeGameObject } from "shared/utils/settings";
import { baseGoal, Goal, idType } from "subsystems/goal";
//@ts-ignore
import { text } from "game/visual";
import { getObjectsByPrototype } from "game/utils";
import { Flag } from "arena/prototypes";


export class defendLocation extends baseGoal implements Goal {
  static type = "defend";
  x: number;
  y: number;
  squad: Squad;

  static makeId(x:number, y:number) {
    return `${defendLocation.type}-${x}-${y}`
  }

  constructor(id: idType, parent: baseGoal | false = false, x:number, y:number) {
    super(id, parent);
    this.x = x;
    this.y = y;

    //make squads
    this.squad = new Squad("defense", {heal: 4, attack:0, ranged:4});
    this.squad.assignLocation(this.x, this.y, 0, true);
  }

  assignCreep(creep:Creep) {
    //console.log(this.id, "checking creep", creep.id)
    if(this.squad.assignCreep(creep)) {
      creep.goalId = this.id;
      return true;
    }
    return false;
  }

  assignTarget(target: any) {
    console.log(this.id, "checking creep", target.id);
    if(target instanceof Creep || (target instanceof Flag && target.my)) {
      if(this.squad.assignTarget(target)) {
        //@ts-ignore
        target.goalId = this.id;
        return true;
      }
    }
    return false;
  }

  /**
   * performs the goals per tick stuff
   */
   runGoal(): void {
     console.log("running goal", this.id)
     this.squad.runSquad(75, 0, true);


     this.squad.assignLocation(this.x, this.y, 0, true, true)
     //@ts-ignore
    text("d", this)
  }
}
