import { idType } from "shared/polyfills";
import { CreepWrapper } from "shared/subsystems/wrappers";
import { StructureWrapper } from "shared/subsystems/wrappers/StructureWrapper";
import { BaseGoal, Goal } from "./BaseGoal";



export class RunBase extends BaseGoal implements Goal {
  constructor(id:idType, x:number, y:number, parent:Goal) {
    super(id, x, y, parent)
  }
  assignCreep(creep:CreepWrapper) {
    return false;
  }
  assignStructure(struct:StructureWrapper<any>) {
    return false;
  }
  runGoal() {

  }
}
