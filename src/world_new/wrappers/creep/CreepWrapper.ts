import { idType, setInterval, clearInterval } from "shared/polyfills";
import { CachedValue } from "shared/utils/caching/CachedValue";
import { BaseAction, findClosestAction } from "../../actions/base/BaseAction";
import { BasePartAction } from "../../actions/base/BasePartAction";
import { BaseResourceAction } from "../../actions/base/BaseResourceAction";
import { registerObjectWrapper } from "../base/AllGameObjects";
import type { GameObjectWrapper } from "../base/GameObjectWrapper";
import { HasStorageWrapper, HasStorageWrapperData } from "../base/HasStorageWrapper";
import { KillableWrapper, KillableWrapperData } from "../base/KillableWrapper";
import queues from "../../queues";
import { StorableCreatableClass } from "shared/utils/memory";
import { CreepBody, CreepClass } from "./CreepBody";
import { canHazJob, Job } from "world_new/jobs/Job";
import { CreepRequestOptions } from './CreepRequest';
import Logger from "shared/utils/logger";
import Empire from "world_new/Empire";
import nodeNetwork from "shared/subsystems/NodeNetwork/nodeNetwork";

const logger = new Logger("CreepWrapper");
logger.color = COLOR_CYAN;
logger.enabled = false;

let creepWrappers: Map<string, CreepWrapper> = new Map();
//run creep movement
setInterval(()=>{
  creepWrappers.forEach(wrapper=>{
    if(!wrapper.exists) {
      creepWrappers.delete(wrapper.id);
      return;
    }
    wrapper.move();
  })
}, 1, queues.MOVEMENT)
//run creep actions
setInterval(()=>{
  creepWrappers.forEach(wrapper=>{
    if(!wrapper.exists) {
      creepWrappers.delete(wrapper.id);
      return;
    }
    wrapper.act();
  })
}, 1, queues.ACTIONS, true)



declare global {
  interface CreepMemory {
    jobId: string | false;
    actionId: string | false;
  }
}
interface CreepWrapperData extends HasStorageWrapperData {
  name?: string;
}

export default class CreepWrapper extends HasStorageWrapper<Creep>  implements StorableCreatableClass<CreepWrapper, typeof CreepWrapper, CreepWrapperData>, canHazJob  {
  static fromJSON(json: CreepWrapperData): CreepWrapper {
    let wrapper = new CreepWrapper(json.id);
    if(json.name) {
      wrapper.name = json.name;
    } else {
      // if there's no name, it must be mine, so just get the wrapper from the object
      let obj = Game.getObjectById(json.id as Id<Creep>);
      if(obj) {
        //@ts-ignore missing data whne it's our creeps, we can always see them.
        return obj.getWrapper<CreepWrapper>();
      }
      throw new Error("no own creep for " + json.name);
    }
    HasStorageWrapper.fromJSON(json, wrapper);
    let colony = wrapper.colony;
    if(colony) {
      let creepMemory = Memory.creeps[wrapper.name];
      if (creepMemory.jobId) {
        let assignedJob = colony.getJob(creepMemory.jobId);
        if(assignedJob) {
          wrapper.assignedJob = assignedJob;
        }
      }
      if (creepMemory.actionId) {
        let assignedAction = colony.getAction(creepMemory.actionId);
        if(assignedAction) {
          wrapper.currentAction = assignedAction;
        }
      }
    }
    return wrapper;
  }

  toJSON(): CreepWrapperData {
    if(this.my && this.name) {
      if (!Memory.creeps) {
        Memory.creeps = {};
      }
      if (!Memory.creeps[this.name]) {
        //@ts-ignore
        Memory.creeps[this.name] = {};
      }
      if (this.assignedJob) {
        Memory.creeps[this.name].jobId = this.assignedJob.id;
      } else {
        Memory.creeps[this.name].jobId = false;
      }
      if (this.currentAction) {
        Memory.creeps[this.name].actionId = this.currentAction.id;
      } else {
        Memory.creeps[this.name].actionId = false;
      }
    }
    if (this.my) {
      //@ts-ignore don't store anything but Id for own creeps
      return {
        id: this.id,
        name: this.name || "ERROR",
      };
    }
    return {
      ...super.toJSON(),
      name: this.name || "ERROR",
    };
  }

  name: string | false = false;
  assignedJob: Job | false = false;
  currentAction: BaseAction<GameObjectWrapper<Creep>, CreepWrapper, any> | false = false;


  private body: CreepBody;
  getCreepClass() {
    return this.body.getCreepClass();
  }
  getBodyClassification() {
    return this.body.getBodyClassification();
  }
  hasBodyPart(part:BodyPartConstant) {
    return this.body.hasPart(part);
  }
  getNumBodyParts(part:BodyPartConstant) {
    return this.body.numParts(part);
  }


  constructor(id: string) {
    super(id as Id<Creep>);
    this.body = new CreepBody(this);
    if(creepWrappers.has(this.id)) {
      throw new Error("duplicate creep wrapper!" + this.id)
    }
    creepWrappers.set(this.id, this);
    this.isCreep = true;
    this.name = this.getObject()?.name || false;
  }

  delete() {
    super.delete();
    creepWrappers.delete(this.id);
    if (this.currentAction) {
      this.currentAction.unassign(this);
    }
    if (this.assignedJob) {
      this.assignedJob.unassignObject(this);
    }
  }


  dropAll() {
    if (this.store.maxTotal > 0) {
      let creep = this.getObject();
      if(creep) {
        let dropResource = this.store.getTypesByAmountAvailable().getTypes().find(type=>this.store.getAmount(type) > 0)
        if(dropResource) {
          creep.drop(dropResource);
        }
      }
    }
  }

  /**
   * find new actions
   */
  update() {
    super.update();
    //if(this.body.getBodyClassification())
    if(!this.my) return;
    let action = this.currentAction;
    if(action && action.valid()) {
      logger.log(this.name, "has action", action.id, action.assignments.size, action.maxAssignments);
    } else {
      // if (this.colony && !this.assignedJob)
      if (this.colony && !this.assignedJob) {
        logger.log(this.name, "has no job, finding a new one")
        let newJob = this.colony.findSuitableJobForCreep(this);
        if(newJob) {
          newJob.assignObject(this);
          logger.log(this.name, "assigned job", newJob.id);
        }
      }
      if (!this.assignedJob) {
        logger.log(this.name, "has no colony job, finding a new one from Empire");
        let newJob = Empire.findSuitableJobForObject(this);
        if(newJob) {
          newJob.assignObject(this);
          logger.log(this.name, "assigned Empire job", newJob.id);
        }
      }
      if (this.assignedJob) {
        logger.log(this.name, "finding new action from existing job", this.assignedJob.id);
        let newAction = this.assignedJob.findActionForObject(this);
        if(newAction) {
          newAction.assign(this);
          logger.log(this.name, "assigned action", newAction.id);
        }
      }
      if(!this.currentAction) {
        logger.log(this.name, "has no action, dropping all")
        this.dropAll();
      }
    }
    // logger.log(this.id, "update", this.currentAction ? this.currentAction.id : "no action", this.assignedJob ? this.assignedJob.id : "no job");
  }

  /**
   * preform any actions
   */
  act() {
    let action = this.currentAction;
    if(!action){
      console.log(this.id, "has no action, doing nothing")
      return;
    }

    let rangeToAction = this.wpos.getRangeTo(action.target.wpos);
    logger.log(this.id, "range to action", rangeToAction, "max range", action.maxRange)
    if(rangeToAction <= action.maxRange) {
      let actionDone = action.doAction(this);
      logger.log(this.id, "did action", actionDone, action.id, action.assignments.size, action.maxAssignments);
      if(actionDone==true) {
        logger.log(this.id, "finished action", action.id)
        this.currentAction && this.currentAction.unassign(this);
        this.currentAction = false;
      }
    }
  }

  /**
   * do movement
   */
  move() {
    let action = this.currentAction;//researches for new action if it was completed during the do phase.
    if(!action){
      // console.log(this.id, "has no action, not moving")
      return;
    }

    let creep = this.getObject();
    if(!creep) {
      this.delete();
      throw new Error("no creep for " + this.id + " something has gone horribly wrong")
    }

    let rangeToAction = this.wpos.getRangeTo(action.target.wpos);
    // logger.log(this.id, " doing move. range to action", rangeToAction, "max range", action.maxRange, this.wpos.roomName,  action.target.wpos.roomName)
    if(rangeToAction > action.maxRange || this.wpos.roomName !== action.target.wpos.roomName) {
      // logger.log(this.id, " moving to action", action.target.id)
      //creep.moveTo(action.target.wpos.toRoomPosition());
      nodeNetwork.moveTo(creep, {pos: action.target.wpos, range: action.maxRange});
    }
  }



}



registerObjectWrapper(Creep, CreepWrapper);
