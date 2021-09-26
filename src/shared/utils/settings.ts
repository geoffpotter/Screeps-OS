import { RESOURCE_ENERGY, TERRAIN_SWAMP, TERRAIN_WALL } from 'game/constants';
import { FindPathResult } from 'game/path-finder';
import { GameObject } from 'game/prototypes';
import { hasLocation, Location } from './map/Location';

export interface FakeGameObject {
  exists: boolean;
  run?(): void;
  moveTo?(pos: any):number|undefined;
  id:string,
  x: number,
  y: number
}



/**
 *
 */
interface settingsProps {
  /**
   * values 0-1, if creep.hits <= creep.maxHits*[this number] the creep is considered wounded
   */
  creepInjuredThreshold:number;
  /**
   * number of ticks to cache a creeps class before recalc
   */
  creepClassCacheTicks:number;

  /**
   * number of ticks between intel updates(basically room parses)
   */
  intelUpdateFrequency:number;

  allResourceConstants:ResourceConstant[];
}

export interface pathfindingGoal {
  pos:hasLocation,
  range:number
}

interface providedFuncs {
  /**
  * get the path based distance between two Locations
  */
  getRangeByPath(obj1:hasLocation, obj2:hasLocation): number;
  /**
   * get the path cost between two locations
   */
  getPathCost(obj1:hasLocation, obj2:hasLocation): number;
  /**
   * Turns a list of game objects and an array of ranges into a list of goals for pathfinder/findPath
   */
  toGoals(objs:hasLocation[], range:number|number[]): pathfindingGoal[]
}
/**
 * compatability layer for arena+world
 * each bot must provide an implementation of each function
 */
interface compatabilityFuncs {
  getCpu(): number
  getTick(): number
  getMemory(): object
  /**
   * get the range between two objects/positions
   */
  getRange(obj1:hasLocation, obj2:hasLocation): number
  /**
   * get a path from obj1 to obj2 according to the opts param, if given.
   */
  getPath(obj1:hasLocation, obj2:hasLocation, opts?:PathFinderOpts|FindPathOpts):FindPathResult
  getTerrainAt(obj:hasLocation): TERRAIN_SWAMP | TERRAIN_WALL | 0;
  getObjectById<T>(id:string): T|null

  drawText(text:string, pos:Location, style?:object): void
}
/**
 * Settings interface for bot settings and compatability functions
 */
export interface Settings extends settingsProps, compatabilityFuncs, providedFuncs {

}

export class defaultSettings implements settingsProps, providedFuncs {

  allResourceConstants = [RESOURCE_ENERGY]
  creepInjuredThreshold = 0.55;
  creepClassCacheTicks = 1;
  intelUpdateFrequency = 1;

  getPathCost(obj1:hasLocation, obj2:hasLocation): number {
    let path = getSettings().getPath(obj1, obj2);
    if (path.incomplete)
      return Infinity;
    return path.cost;
  }

  getRangeByPath(obj1:hasLocation, obj2:hasLocation): number {
    let path = getSettings().getPath(obj1, obj2);
    if (path.incomplete)
      return Infinity;
    return path.path.length;
  }
  toGoals(objs:GameObject[], range:number|number[]): pathfindingGoal[] {
    let goals = [];
    let index = 0;
    for(let obj of objs) {
      let goal = {
        pos: obj,
        range: !Array.isArray(range) ? range : range[Math.min(index, range.length)]
      };
      goals.push(goal)
      index++;
    }
    return goals;
  }


  constructor() {
    //@ts-ignore this class doesn't implement settings, but the class that extends it should.
    overrideSettings(this);
  }
}

class holder {
  settings:Settings|false = false;
}

let settingsHolder = new holder();


export function getSettings() {
  if(!settingsHolder.settings) {
    throw new Error("trying to get settings that haven't been set, move your settings import to the top of main")
  }
  return settingsHolder.settings;
}

export function overrideSettings(newSettingsObj:Settings) {
  console.log("---------------------------------------using Custom settings!!!------------------------")
  settingsHolder.settings = newSettingsObj;
}
