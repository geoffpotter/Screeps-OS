import { getSettings } from "shared/utils/settings";
import { Creep } from "game/prototypes"
import { CreepWrapper } from "shared/subsystems/wrappers";
import { CachedValue } from "shared/utils/caching/CachedValue";
import { CreepClass } from "shared/subsystems/wrappers/CreepWrapper";
import { setInterval, clearInterval } from "shared/polyfills";
import { hasLocation, Location } from "shared/utils/map/Location";
import { ATTACK, CARRY, HEAL, RANGED_ATTACK, WORK } from "game/constants";
import { ResourceInfoCollection } from "shared/utils/Collections/ResourceInfoCollection";
import { BodyPartInfoCollection } from "shared/utils/Collections/BodyInfoCollection";

/**
 * represents a group of creeps, mine or an enemies.
 * military goups by room then location(try to keep groups from room to room somehow)
 * civilian goups by room then type
 */
export class CreepSquad {
  desiredParts:BodyPartInfoCollection = new BodyPartInfoCollection();
  private _currentParts = new CachedValue<BodyPartInfoCollection>(()=>{
    let currentParts = new BodyPartInfoCollection();
    this.creeps.forEach(creep=>{
      let bodyInfo = creep.getBodyClassification();
      //console.log('process creep', creep.id, bodyInfo)
      if(bodyInfo.hasAttack) {
        currentParts.addAmount(ATTACK, bodyInfo.numAttack);
      }
      if(bodyInfo.hasRanged) {
        currentParts.addAmount(RANGED_ATTACK, bodyInfo.numRanged);
      }
      if(bodyInfo.hasHeal) {
        currentParts.addAmount(HEAL, bodyInfo.numHeal);
      }

      if(bodyInfo.hasCarry) {
        currentParts.addAmount(CARRY, bodyInfo.numCarry);
      }
      if(bodyInfo.hasWork) {
        currentParts.addAmount(WORK, bodyInfo.numWork);
      }
    })
    //console.log("updating current parts for squad", currentParts)
    return currentParts;
  }, Infinity, false);

  get currentParts() {
    return this._currentParts;
  }
  get missingParts() {
    //console.log("calc missing parts for squad");
    //console.log(this.desiredParts, this.currentParts.value)
    return this.desiredParts.diff(this.currentParts.value);
  }

  private creeps: CreepWrapper[] = [];
  attackers: CachedValue<CreepWrapper[]>;
  ranged: CachedValue<CreepWrapper[]>;
  healers: CachedValue<CreepWrapper[]>;

  sheilds: CachedValue<CreepWrapper[]>;
  paladins: CachedValue<CreepWrapper[]>;
  poops: CachedValue<CreepWrapper[]>;

  wounded: CachedValue<CreepWrapper[]>;

  haulers: CachedValue<CreepWrapper[]>;
  workers: CachedValue<CreepWrapper[]>;
  miners: CachedValue<CreepWrapper[]>;

  get avgLocation(): hasLocation | false {
    let totalX = 0;
    let totalY = 0;
    this.creeps.forEach(creep => {
      totalX += creep.x;
      totalY += creep.y;
    })
    let numCreeps = this.creeps.length;
    return {
      x: totalX / numCreeps,
      y: totalY / numCreeps
    }
  }

  constructor() {
    let ttl = 1;//getSettings().creepClassCacheTicks
    this.attackers = new CachedValue(() => {
      return this.creeps.filter((creep) => creep.getCreepClass() == CreepClass.attacker)
    }, ttl)
    this.ranged = new CachedValue(() => {
      return this.creeps.filter((creep) => creep.getCreepClass() == CreepClass.ranged)
    }, ttl)
    this.healers = new CachedValue(() => {
      return this.creeps.filter((creep) => creep.getCreepClass() == CreepClass.healer)
    }, ttl)

    this.sheilds = new CachedValue(() => {
      return this.creeps.filter((creep) => creep.getCreepClass() == CreepClass.sheild)
    }, ttl)
    this.paladins = new CachedValue(() => {
      return this.creeps.filter((creep) => creep.getCreepClass() == CreepClass.paladin)
    }, ttl)
    this.poops = new CachedValue(() => {
      return this.creeps.filter((creep) => creep.getCreepClass() == CreepClass.poop)
    }, ttl)

    this.wounded = new CachedValue(() => {
      return this.creeps.filter((creep) => creep.getCreepClass() == CreepClass.wounded)
    }, ttl)


    this.haulers = new CachedValue(() => {
      return this.creeps.filter((creep) => creep.getCreepClass() == CreepClass.hauler)
    }, ttl)
    this.workers = new CachedValue(() => {
      return this.creeps.filter((creep) => creep.getCreepClass() == CreepClass.worker)
    }, ttl)
    this.miners = new CachedValue(() => {
      return this.creeps.filter((creep) => creep.getCreepClass() == CreepClass.miner)
    }, ttl)
  }

  addCreep(creep:CreepWrapper) {
    this._currentParts.clearValue();
    this.creeps.push(creep);
  }
  setCreeps(creeps: CreepWrapper[]) {
    this._currentParts.clearValue();
    this.creeps = creeps;
  }


}
