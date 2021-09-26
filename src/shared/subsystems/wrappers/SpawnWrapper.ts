import { Creep, StructureSpawn } from "game/prototypes";
import { CreepSquad } from "../CreepSquad";
import { createObjectWrapper, getObjectWrapper } from "./GameObjectWrapper";
import { StructureWrapper } from "./StructureWrapper";
import intel from "shared/subsystems/intel/intel"
import { setInterval, clearInterval, Promise as myPromise } from "shared/polyfills";
import { CreepWrapper } from "./CreepWrapper";
import { BODYPART_COST, MOVE, RESOURCE_ENERGY, TOUGH } from "game/constants";
import { getObjectsByPrototype } from "game/utils";
import { builtInQueues } from "shared/polyfills/tasks";
import { HasStorageWrapper } from "./HasStorageWrapper";

declare module "game/prototypes" {
  interface StructureSpawn {
    getWrapper():StructureWrapper<StructureSpawn>;
  }
}

StructureSpawn.prototype.getWrapper = function() {
  let wrapper:SpawnWrapper|false = getObjectWrapper(this);
  if(wrapper)
    return wrapper;

  wrapper = createObjectWrapper<StructureSpawn, SpawnWrapper>(SpawnWrapper, this);
  return wrapper;
}


export class SpawnWrapper extends HasStorageWrapper<StructureSpawn> {
  static doUpdate(spawn:SpawnWrapper) {

  }
  static doRun(spawn:SpawnWrapper) {

  }
  /**
   * find new actions
   */
  update() {
    super.update();
    let energyInfo = this.store.get(RESOURCE_ENERGY);
    energyInfo.min = energyInfo.max = this.store.maxTotal;
    SpawnWrapper.doUpdate(this);
  }
  /**
   * preform any actions
   */
  run() {
    SpawnWrapper.doRun(this);
  }



  spawning:boolean = false;
  getAvailEnergy() {
    return this.get().store.getUsedCapacity(RESOURCE_ENERGY) || 0;
  }

  constructor(spawn: StructureSpawn) {
    super(spawn);
    let capacity = spawn.store.getCapacity(RESOURCE_ENERGY) || 0;
    this.store.updateMaxTotal(capacity);
  }

  designBody(primaryPart:BodyPartConstant, secondaryPart:BodyPartConstant|false = false, secondaryPerPrimary:number = 0, fatness:number = 1, toughness:number = 0, energyAvail:number|false=false) {
    if(!energyAvail) {
      energyAvail = this.getAvailEnergy();
    }
    //console.log("building creep body", primaryPart, secondaryPart, secondaryPerPrimary, toughness, fatness, energyAvail)
    //number of tough parts per primary?
    // 0=no tough  0-1=less tough than primary  1=same tough as primary  1+=more tough than primary
    let toughPerPrimary = toughness + secondaryPerPrimary;
    //number of move parts per other parts
    // 0=can't move  0-1=moves fast in swamps(extra moves)  1=normal(1to1moves)  1+ = slow on plains(less moves)
    let movePerPrimary = fatness > 0 ? (1+secondaryPerPrimary+toughPerPrimary) / (fatness) : 0;


    let primaryCost = BODYPART_COST[primaryPart];
    let secondaryCost = 0;
    if(secondaryPart) {
      secondaryCost = BODYPART_COST[secondaryPart] * secondaryPerPrimary;
    }
    let moveCost = BODYPART_COST[MOVE] * movePerPrimary;
    let toughCost = BODYPART_COST[TOUGH] * toughPerPrimary;
    //console.log('muls', secondaryPerPrimary, toughPerPrimary, movePerPrimary)
    //console.log("costs", primaryCost, secondaryCost, toughCost, moveCost)
    //use per primary costs to calculate total per primary cost and from that total parts given avail energy
    let costPerPrimary = Math.floor(primaryCost + secondaryCost + moveCost + toughCost)
    let totalParts = Math.floor(energyAvail / costPerPrimary);

    //console.log("tots", costPerPrimary, totalParts)
    //break total parts into num of each part
    let numMove = Math.floor(totalParts * movePerPrimary);
    let numTough = Math.floor(totalParts * toughPerPrimary);
    let numSecondary = Math.floor(totalParts * secondaryPerPrimary);
    let numPrimary = totalParts;// - numMove - numTough - numSecondary;

    //console.log("calcs", numPrimary, numSecondary, numTough, numMove)
    //build body from calcs
    let body:BodyPartConstant[] = Array(numMove + numTough + numSecondary + numPrimary);
    body.fill(TOUGH, 0, numTough);
    body.fill(primaryPart, numTough, numTough+numPrimary);
    if(secondaryPart) {
      body.fill(secondaryPart, numTough+numPrimary, numTough+numPrimary+numSecondary);
    }
    body.fill(MOVE, numTough+numPrimary+numSecondary, numTough+numPrimary+numSecondary+numMove);

    return body;
  }

  async spawnCreep(body:BodyPartConstant[]) {
    let spawn = this.get();
    let res = spawn.spawnCreep(body);
    return new myPromise<CreepWrapper>((resolve, reject)=>{
      if(res.error) {
        reject(res.error);
        return;
      }
      this.spawning = true;
      //@ts-ignore object must be there if no error.. right?
      let spawningCreep:Creep = res.object;
      spawningCreep.spawning = true;
      //no error, wait for creep to not be on our location, then resolve
      let intId = setInterval(()=>{
        let allCreeps = getObjectsByPrototype(Creep);

        //console.log("watching for creep spawn", this.x, this.y, spawningCreep.x, spawningCreep.y, allCreeps)
        if(spawningCreep.x !== this.x || spawningCreep.y !== this.y) {
          //creep has moved, it's spawned
          this.spawning = false;
          spawningCreep.spawning = false;
          resolve(spawningCreep.getWrapper());
          clearInterval(intId)
        }
      },1, builtInQueues.TICK_INIT)
    })
  }

}
