import {
  // @ts-ignore  type needs to be updated
  getTicks, getCpuTime, getRange, getObjectById

} from 'game/utils';
//@ts-ignore
import { text } from "game/visual";

export interface FakeGameObject {
  exists: boolean;
  run?(): void;
  moveTo?(pos: any):number|undefined;
  id:string,
  x: number,
  y: number
}

export interface Location{
  x:number,
  y:number
}


export interface Settings {
  getCpu(): number

  getTick(): number

  getMemory(): object

  /**
   * get the range between two objects/positions
   * @param obj1
   * @param obj2
   * @returns
   */
  getRange(obj1:Location, obj2:Location): number

  /**
   * get the path based distance between two objects/positions
   * @param obj1
   * @param obj2
   * @returns
   */
  getDistance(obj1:Location, obj2:Location): number


  getObjectById(id:string): FakeGameObject|null

  drawText(text:string, pos:Location, style?:object): void
}

let mem = {};
export class defaultSettings implements Settings {
  getCpu() {
    return getCpuTime();
  }
  getTick(){
    throw new Error("override me!");
    return getTicks();
  }
  getMemory() {
    return mem;
  }
  getRange(obj1:Location, obj2:Location) {
    return getRange(obj1, obj2);
  }

  drawText(txt: string, pos: Location, style={}) {
    //@ts-ignore
    if(!style.font) {
      //@ts-ignore
      style.font = 1;
    }
    text(txt, pos, style)
  }
  getDistance(pos1:Location, pos2:Location) {
    return getRange(pos1, pos2)
  }
  getObjectById(id:string) {
    //@ts-ignore
    return getObjectById<FakeGameObject>(id);
  }
}

class holder {
  settings:Settings|false = false;
}

let settingsHolder = new holder();


export function getSettings() {
  if(!settingsHolder.settings) {
    console.log("---------------------------------------using default settings!!!------------------------")
    settingsHolder.settings = new defaultSettings();
    return settingsHolder.settings;
  }
  return settingsHolder.settings;
}

export function overrideSettings(newSettingsObj:Settings) {
  console.log("---------------------------------------using Custom settings!!!------------------------")
  settingsHolder.settings = newSettingsObj;
}
