
import { searchPath } from 'game/path-finder';
import {
  // @ts-ignore  type needs to be updated
  getTicks, getCpuTime, getRange, getObjectById, getTerrainAt

} from 'game/utils';
let mem = {};
//@ts-ignore
import { text } from "game/visual";
import { hasLocation, Location } from 'shared/utils/map/Location';
import {defaultSettings, Settings} from "shared/utils/settings"


class settings extends defaultSettings implements Settings {
  getCpu() {
    return getCpuTime();
  }
  getTick(){
    return getTicks();
  }
  getMemory() {
    return mem;
  }
  getRange(obj1:hasLocation, obj2:hasLocation) {
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

  getPath(obj1:hasLocation, obj2:hasLocation, opts?:PathFinderOpts|FindPathOpts) {
    return searchPath(obj1, obj2, opts);
  }
  getTerrainAt(pos:hasLocation) {
    return getTerrainAt(pos)
  }
  getObjectById<T>(id:string) {
    //@ts-ignore
    return getObjectById<T>(id);
  }

}
let runtimeSettings = new settings();
export default runtimeSettings;
