import { text } from "game/visual";
import { baseGoal, idType } from "subsystems/goal";

export class defendLocation extends baseGoal {
  static type = "defendLocation";
  x: number;
  y: number;


  constructor(id: idType, parent: baseGoal | false = false, x:number, y:number) {
    super(id, parent);
    this.x = x;
    this.y = y;
  }
  /**
   * performs the goals per tick stuff
   */
   runGoal(): void {
     console.log("running goal", this.id)
     //@ts-ignore
    text(this.id + " defend", this)
  }
}