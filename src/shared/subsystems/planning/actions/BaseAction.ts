
import loggerClass from "utils/logger";

let logger = new loggerClass("util.actions");

import { getSettings, Settings } from "shared/utils/settings";
import { AnyGameObjectWrapper, baseGameObject, GameObjectWrapper } from "../../wrappers/GameObjectWrapper";
import { CachedValue } from "shared/utils/caching/CachedValue";
import { BaseJob } from "../jobs/BaseJob";
import { idType } from "shared/polyfills";
import { Location } from "shared/utils/map/Location";
import { ResourceInfoCollection } from "shared/utils/Collections/ResourceInfoCollection";
import { BodyPartInfoCollection } from "shared/utils/Collections/BodyInfoCollection";
import { BasePartAction } from "./BasePartAction";
import { BaseResourceAction } from "./BaseResourceAction";


export type assignedId = string //Id<any>

let actions = new Map<idType, AnyAction>();
export function findClosestAction<ActionType extends AnyAction>(obj: AnyGameObjectWrapper, types: (Function)[]):ActionType | false {
  let closestAction: ActionType | false = false;
  let closestActionDist: number = Infinity;
  let settings = getSettings();
  for (let action of actions.values()) {
    if(!action.canDo(obj)) {
      continue;
    }
    let validType = false;
    for(let type of types) {
      if(action instanceof type) {
        validType = true;
        break;
      }
    }
    if(!validType) continue;
    let actionDist = settings.getRange(action, obj);
    console.log("wtf", action.x, action.y, obj.x, obj.y)
    console.log(obj.id, "checking action", action.id, actionDist, closestActionDist)
    if (actionDist < closestActionDist) {
      console.log(obj.id, "found closer action", action.id, actionDist)
      //@ts-ignore action isn't specfic enouhg, should prolly change all this..
      //types arg should keep this from being a huge problem, but we'll see.
      closestAction = action;
      closestActionDist = actionDist;
    }
  }
  console.log('found closest Action:', closestAction && closestAction.id, "at range", closestActionDist)
  return closestAction;
}

export function deleteAction(action:AnyAction) {
  actions.delete(action.id);
}


export type AnyActionAssignment = ActionAssignment<AnyGameObjectWrapper, AnyAction>;

export class ActionAssignment<AssignedWrapperType extends AnyGameObjectWrapper,
                              ActionType extends Action<AssignedWrapperType>> {
  private _id: string;
  action: ActionType;
  assigned: AssignedWrapperType;
  priority: number;
  constructor(action:ActionType, assigned:AssignedWrapperType, priority:number = 0) {
    this.action = action;
    this.assigned = assigned;
    this.priority = priority;
    this._id = this.action.id + "-" + this.assigned.id
  }

  private _distanceToTarget = new CachedValue<number>(() => {
    return getSettings().getRange(this.action.target, this.assigned);
  })
  get distanceToTarget() {
    return this._distanceToTarget.get();
  }
  get id() {
    return this._id;
  }
}

export type AnyAction = Action<AnyGameObjectWrapper>;

// extends BaseAction<AnyGameObjectWrapper, AssignedWrapperType>
export interface Action<AssignedWrapperType extends AnyGameObjectWrapper> {
  target:AnyGameObjectWrapper,
  maxRange: number;
  maxAssignments: number;
  id:string,
  x:number,
  y:number,

  valid():boolean;
  isAssigned(obj: AssignedWrapperType):boolean;
  display():void;
  assign(obj: AssignedWrapperType, priority?:number): boolean
  unassign(obj: AssignedWrapperType):void

  overAllowedAssignments():boolean;
  canDo(object:AssignedWrapperType): boolean;
  predictedDoneTick(object:AssignedWrapperType): number
  doJob(object:AssignedWrapperType): boolean
}

export type ActionAssignmentConstructor<AssignedWrapperType extends AnyGameObjectWrapper,
                                        ActionType extends Action<AssignedWrapperType>,
                                        AssignmentType extends ActionAssignment<AssignedWrapperType, ActionType>> =
{ new(action:any,assigned:AssignedWrapperType,priority?:number): AssignmentType }

export class BaseAction<TargetWrapperType extends AnyGameObjectWrapper,
                        AssignedWrapperType extends AnyGameObjectWrapper,
                        AssignmentType extends ActionAssignment<AssignedWrapperType, Action<AssignedWrapperType>> = ActionAssignment<AssignedWrapperType, Action<AssignedWrapperType>>,
                        AssignmentConstructorType extends ActionAssignmentConstructor<AssignedWrapperType, Action<AssignedWrapperType>, AssignmentType> = ActionAssignmentConstructor<AssignedWrapperType, Action<AssignedWrapperType>, AssignmentType>
                        > extends Location {

  target: TargetWrapperType;
  assignmentConstructor: AssignmentConstructorType;
  actionType: string;
  assignments: Map<assignedId, AssignmentType> = new Map();
  maxRange: number = 1;
  maxAssignments: number = Infinity;

  displayTask: boolean = false;

  get x():number {
    return this.target.x;
  }
  get y():number {
    return this.target.y
  }

  constructor(actionType = "not implemented!!!", assignmentConstructor:AssignmentConstructorType, target: TargetWrapperType) {
    super(target.x, target.y, `${actionType}-${target.id}`);
    this.target = target;
    this.actionType = actionType;
    this.assignmentConstructor = assignmentConstructor;
    if(!actions.has(this.id)) {
      //@ts-ignore class should be overridden to implement interface
      actions.set(this.id, this);
    } else {
      throw new Error("action id already exists!!"+this.id)
    }
  }


  display() {
    getSettings().drawText(this.actionType + "(" + this.assignments.size + ")", this.target.location);
  }

  isAssigned(obj: AssignedWrapperType) {
    return this.assignments.has(obj.id);
  }

  valid() {
    return this.target.get().exists;
  }

  assign(obj: AssignedWrapperType, priority = 1): boolean {
    console.log("assigning", obj.id, "to", this.id);
    let settings = getSettings();


    this.clearLosers(settings, obj, priority);
    //@ts-ignore lack of virtual funcs :(  fucs will be defiend in child classes, no direct use of this class is allowed.
    let assignment = new this.assignmentConstructor(this, obj, priority);
    this.assignments.set(obj.id, assignment);
    console.log("assigned", obj.id, "to", this.id, this.assignments.size);
    return true;
  }



  clearLosers(settings: Settings, obj: AssignedWrapperType, priority: number) {
    let newObjRange = settings.getRange(obj, this.target.location);
    let loserAssignments = Array.from(this.assignments.values()).filter((assignment) => {
      let newObjCloser = assignment.distanceToTarget > newObjRange;
      let samePriority = priority == assignment.priority;
      let higherPriority = priority > assignment.priority;
      if (higherPriority || newObjCloser && samePriority) {
        return true;
      }
      return false;
    }).sort((a, b) => {
      if (a.priority != b.priority) {
        //priority is different, use that
        return a.priority - b.priority;
      }
      //priority is the same, use distance
      return a.distanceToTarget - b.distanceToTarget;
    });
    while (this.overAllowedAssignments()) {
      let loser = loserAssignments.shift();
      if(!loser) break;
      this.unassign(loser.assigned);
    }
  }

  overAllowedAssignments() {
    return this.assignments.size >= (this.maxAssignments);
  }

  unassign(obj: AssignedWrapperType) {
    console.log("-----------------------unassigning------------------------------------------")
    if (!this.assignments.has(obj.id)) {
      throw new Error("trying to unassign object that isn't assigned. " + this.id + " " + obj.id)
    }
    this.assignments.delete(obj.id);
    console.log("unassigned", obj.id, "from", this.id, this.assignments.size);
 }

  /******************************************************************************
   * virtual methods
   *
   * these will generally need to be overriden by the task class to provide task specific implementations
   *
   */


  // /**
  //  * Creep can do job currently
  //  */
  canDo(object:AssignedWrapperType): boolean {
    //console.log("base - can", object.id, "do", this.id, "?", this.target.id, this.assignments.size, this.maxAssignments)
    if(object.id == this.target.id) return false; // can't assign to yourself(well.. healing maybe?  no, no need for an action for that right?)
    if(this.assignments.size >= (this.maxAssignments)) return false;
    //console.log("base - ", object.id, "can do", this.id, "!")
    return true;
  }


  predictedDoneTick(object:AssignedWrapperType): number {
    let settings = getSettings();
    let currentTick = settings.getTick();
    let pathToTarget = settings.getPath(this.target.location, object);
    let ticksFromTarget = pathToTarget.cost;
    return currentTick + ticksFromTarget;
  }

}



