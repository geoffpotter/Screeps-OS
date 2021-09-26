import { baseGameObject, GameObjectWrapper } from "shared/subsystems/wrappers/GameObjectWrapper";
import { idType } from "shared/polyfills";
import { CreepWrapper } from "shared/subsystems/wrappers";
import { StructureWrapper } from "shared/subsystems/wrappers/StructureWrapper";
import { Location } from "shared/utils/map/Location";
import { getSettings } from "shared/utils";

let goals = new Map<idType, BaseGoal>();

export function findClosestGoal(obj:GameObjectWrapper<any>) {
  let closestGoal:BaseGoal|false = false;
  let closestGoalDist:number = Infinity;
  let settings = getSettings();
  for(let goal of goals.values()) {
    let goalDist = settings.getRangeByPath(goal, obj);
    if(goalDist < closestGoalDist) {
      closestGoal = goal;
      closestGoalDist = goalDist;
    }
  }
  return closestGoal;
}

export interface Goal extends BaseGoal {
  assignCreep(creep:CreepWrapper):boolean;
  assignStructure(structure:StructureWrapper<any>):boolean
  runGoal(): void;
}

export enum GoalStates {
  INIT="init",
  RUNNING="running",
  COMPLETED="completed"
}

export class BaseGoal extends Location {
  private _state: GoalStates|string = GoalStates.RUNNING;
  public get state(): GoalStates|string {
    return this._state;
  }
  public set state(value: GoalStates|string) {
    this._state = value;
  }

  parent:BaseGoal|false;

  constructor(id: idType, x:number, y:number, parent: BaseGoal | false = false) {
    super(x, y, id)
    if(goals.has(id)) {
      //trying to make action with dupe id, throw
      throw new TypeError(`goalId already exists! ${id}`)
    }
    goals.set(id, this);
    this.parent = parent;
  }
}
