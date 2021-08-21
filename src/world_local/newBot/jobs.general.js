import logger_import from "./screeps.logger";
let logger = new logger_import("jobs.general");
logger.enabled = false;

import {
  Job,
  JobTypes,
  JobAssignment
} from "./jobs.base";

let all = [

];
let map = {};


for (let i in all) {
  let one = all[i];
  let inst = new one();
  map[inst.name] = one;
}

export default map;