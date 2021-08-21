
import {
  // @ts-ignore  type needs to be updated
  getTicks,
} from 'game/utils';
let mem = {};
export let runtimeSettings = {
  getCpu: () => new Date().valueOf(),
  getTick: getTicks,
  getMemory:() => {
    return mem;
  }
}