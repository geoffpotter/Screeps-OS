import {
  getObjectsByPrototype,
  // @ts-ignore  type needs to be updated
  getTicks,
  findPath
} from 'game/utils';
import {
  Creep,
} from 'game/prototypes';
import {
  Flag
} from 'arena/prototypes';
import {
  startTick,
  endTick
} from 'shared/polyfills';
import {
  setTimeout,
  setInterval,
  settings
} from "polyfills";


import {
  profiler,
  profile
} from "profiler";
let mem = {};


import { runtimeSettings } from "./settings";
import { winCTF } from './goals/winCTF';
settings.setSettings(runtimeSettings);


let winGoal = new winCTF("base");


export function loop() {
  console.log("------ start tick ----------")
  startTick();

  winGoal.runGoal();

  endTick();
}