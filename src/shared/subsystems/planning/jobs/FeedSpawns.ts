import { CreepWrapper } from "shared/subsystems/wrappers";
import { StructureWrapper } from "shared/subsystems/wrappers/StructureWrapper";
import { BaseJob, Job } from "./BaseJob";





export class FeedSpawns extends BaseJob implements Job {
  assignCreep(creep:CreepWrapper) {
    return false;
  }
  assignStructure(struct:StructureWrapper<any>) {
    return false;
  }
  runjob() {

  }
}
