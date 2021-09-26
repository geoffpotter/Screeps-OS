//import to override defaults
import settings from "./settings";
settings.getTick();

import { startTick, endTick, setTimeout } from 'shared/polyfills';
import { CreepSquad } from "shared/subsystems/CreepSquad";
import intel from "../shared/subsystems/intel/intel"
import { ATTACK, BodyPartConstant, BODYPART_COST, CARRY, HEAL, MOVE, RANGED_ATTACK, RESOURCE_ENERGY, WORK } from "game/constants";
import { StructureContainer, StructureExtension, StructureSpawn } from "game/prototypes";
import { CreepWrapper, ContainerWrapper, SpawnWrapper } from "shared/subsystems/wrappers";
import { findClosestByRange, getObjectsByPrototype } from "game/utils";
import { GameObjectWrapper } from "shared/subsystems/wrappers/GameObjectWrapper";
import { StructureWrapper } from "shared/subsystems/wrappers/StructureWrapper";
import { getSettings } from "shared/utils";



let squad = new CreepSquad();
squad.desiredParts.setAmount(ATTACK, 8);
squad.desiredParts.setAmount(RANGED_ATTACK, 8);
squad.desiredParts.setAmount(HEAL, 8);
squad.desiredParts.setAmount(CARRY, 10);

let mySpawn: SpawnWrapper;
let enemySpawn: SpawnWrapper;
let init = true;

let rInfo = intel.getRoomIntel();

export function loop() {
  console.log("main loop start")
  intel.updateIntel();
  console.log("num neutral buildings", rInfo.neutralBuildings.size)
  if (init) {
    intel.myBuildings.forEach(building => {
      if (building.my && building instanceof SpawnWrapper) {
        mySpawn = building;
      } else if (!building.my && building instanceof SpawnWrapper) {
        enemySpawn = building;
      }
    })
    init = false;
  }

  startTick();

  console.log("in regular main")
  //console.log("intel", intel.getRoomIntel())

  endTick();

  // console.log('------------')

  // console.log(mySpawn.designBody(WORK, CARRY, 1, 1, 0, 1000));
  // console.log(mySpawn.designBody(WORK, CARRY, 0.5, 1, 0, 1000))
  // console.log(mySpawn.designBody(WORK, CARRY, 2, 1, 0, 1000))
  // console.log(mySpawn.designBody(WORK, CARRY, 1, 0.5, 0, 1000))
  // console.log(mySpawn.designBody(WORK, CARRY, 1, 1, 1, 1000))
  // console.log("--------------end")
}



// CreepWrapper.doRun = function(wrapper:CreepWrapper) {
//   console.log("running creep", wrapper.id)
//   let closestContainer = findClosestContainer(wrapper);
//   let rIntel = intel.getRoomIntel();
//   let creep = wrapper.get();
//   let creepisFull = (creep.store.getFreeCapacity(RESOURCE_ENERGY)||0) == 0;
//   if( !creepisFull && getSettings().getRange(creep, closestContainer) <= 1) {
//     creep.withdraw(closestContainer.get(), RESOURCE_ENERGY);
//   } else if(creepisFull && getSettings().getRange(creep, mySpawn) <= 1) {
//     creep.transfer(mySpawn.get(), RESOURCE_ENERGY)
//   }
// }

function findClosestContainer(wrapper:CreepWrapper) {
  let rIntel = intel.getRoomIntel();
  let containers:ContainerWrapper[] = [];
  rIntel.neutralBuildings.forEach(building=>{
    let obj = building.get();
    if( obj &&  obj instanceof StructureContainer ) {
      let amtInContainer = obj.store.getUsedCapacity(RESOURCE_ENERGY) || 0;
      if(amtInContainer == 0) return;
      //@ts-ignore
      containers.push(building);
    }
  });

  let closestContainer = findClosestByRange(wrapper, containers);
  return closestContainer;
}

// CreepWrapper.doMovement = function(wrapper:CreepWrapper) {
//   console.log("moving creep", wrapper.id)
//   let rIntel = intel.getRoomIntel();
//   let creep = wrapper.get();
//   if(wrapper.isFull()) {
//     //move to spawn
//     creep.moveTo(mySpawn);
//   } else {
//     let closestContainer = findClosestContainer(wrapper);
//     creep.moveTo(closestContainer);
//   }
// }

SpawnWrapper.doRun = function(wrapper:SpawnWrapper) {
  if(!wrapper.my) {
    console.log("enemy spawn", wrapper.id);
    return;
  }
  if(wrapper.spawning) {
    console.log("already spawning")
    return;
  }
  //console.log("running spawn", wrapper.id)
  let spawn = wrapper.get();
  let neededParts = squad.missingParts;
  //console.log("parts have", squad.currentParts.value, 'parts needed', neededParts, neededParts.getAmount(CARRY))
  if(neededParts.total == 0) {
    return;
  }
  let energyAvail = wrapper.getAvailEnergy();
  //console.log("avail energy", energyAvail);
  if(energyAvail < (wrapper.get().store.getCapacity(RESOURCE_ENERGY) || 0) * 0.5) {
    return;
  }
  let body:BodyPartConstant[]|false = false;
  if(neededParts.getAmount(CARRY) > 0) {
    //console.log("spawning haulers!")
    //spawn haulers first
    let neededCarrys = neededParts.getAmount(CARRY);

    //let body: BodyPartConstant[] = newFunction(fatness, energyAvail, neededCarrys);
    body = mySpawn.designBody(CARRY);
  } else if(neededParts.getAmount(ATTACK) > 0) {
    body = mySpawn.designBody(ATTACK, false, 0, 1, 1)
  } else if(neededParts.getAmount(RANGED_ATTACK) > 0) {
    body = mySpawn.designBody(RANGED_ATTACK);
  } else if(neededParts.getAmount(HEAL) > 0) {
    body = mySpawn.designBody(HEAL);
  }

  if(body) {
    let ret = wrapper.spawnCreep(body);
    ret.then((newCreep)=>{
      console.log("new creep spawned")
      squad.addCreep(newCreep);
    })
  }
}


