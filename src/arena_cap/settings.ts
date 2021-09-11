
import {
  // @ts-ignore  type needs to be updated
  getTicks, getCpuTime, getRange, getObjectById

} from 'game/utils';
let mem = {};
//@ts-ignore
import { text } from "game/visual";
import {FakeGameObject, Location, Settings} from "shared/utils/settings"


class settings implements Settings {
  getCpu() {
    return getCpuTime();
  }
  getTick(){
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

export default new settings();
