import { idType } from "shared/polyfills";
import { CreepWrapper } from "shared/subsystems/wrappers";
import { StructureWrapper } from "shared/subsystems/wrappers/StructureWrapper";
import { Location } from "shared/utils/map/Location";
import { getSettings } from "shared/utils";
import { GameObjectWrapper } from "shared/subsystems/wrappers/GameObjectWrapper";

let jobs = new Map<idType, BaseJob>();

export function findClosestjob(obj:GameObjectWrapper<any>) {
  let closestjob:BaseJob|false = false;
  let closestjobDist:number = Infinity;
  let settings = getSettings();
  for(let job of jobs.values()) {
    let jobDist = settings.getRangeByPath(job, obj);
    if(jobDist < closestjobDist) {
      closestjob = job;
      closestjobDist = jobDist;
    }
  }
  return closestjob;
}

export interface Job {
  assignCreep(creep:CreepWrapper):boolean;
  assignStructure(structure:StructureWrapper<any>):boolean
  runjob(): void;
}
export enum JobStates {
  INIT="init",
  OK="ok",
  COMPLETED="completed"
}

export class BaseJob extends Location {
  private _state: JobStates|string = JobStates.OK;
  public get state(): JobStates|string {
    return this._state;
  }
  public set state(value: JobStates|string) {
    this._state = value;
  }

  parent:BaseJob|false;



  constructor(id:idType, x:number, y:number, parent:BaseJob) {
    super(x,y,id);
    this.parent = parent;
    if(jobs.has(this.id)) {
      throw new TypeError(`jobId already exists! ${id}`)
    }
    jobs.set(this.id, this);
  }

}
