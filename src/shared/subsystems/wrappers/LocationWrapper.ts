import { Location } from "shared/utils/map/Location";
import { GameObjectWrapper } from "shared/subsystems/wrappers/GameObjectWrapper";
import { getSettings } from "shared/utils";
import { TERRAIN_SWAMP, TERRAIN_WALL } from "game/constants";
import { CreepWrapper } from "./CreepWrapper";
import { StructureWrapper } from "./StructureWrapper";
import { CachedValue } from "shared/utils/caching/CachedValue";


export class LocationWrapper extends GameObjectWrapper<Location> {

  constructor(loc: Location) {
    super(loc)
  }

  private _isWall = new CachedValue<boolean>(()=>{
    return getSettings().getTerrainAt(this) == TERRAIN_WALL
  }, Infinity);
  get isWall() {
    return this._isWall.value;
  }

  private _isSwamp = new CachedValue<boolean>(()=>{
    return getSettings().getTerrainAt(this) == TERRAIN_SWAMP
  }, Infinity);
  get isSwamp() {
    return this._isSwamp.value;
  }

  //resets every tick
  private _creepAtLoc = new CachedValue<false|CreepWrapper>(()=>{
    return false;
  });
  get isCreepAt () {
    return this._creepAtLoc.hasValue;
  }
  get creepAt() {
    return this._creepAtLoc.value;
  }
  set creepAt(creep:CreepWrapper|false) {
    this._creepAtLoc.value = creep;
  }

  //resets every tick
  private _structureAtLoc = new CachedValue<false|StructureWrapper>(()=>{
    return false;
  })
  get isStructureAt() {
    return this._structureAtLoc.hasValue;
  }
  get structureAt() {
    return this._structureAtLoc.value;
  }
  set structureAt(structure:StructureWrapper|false) {
    this._structureAtLoc.value = structure;
  }
}
