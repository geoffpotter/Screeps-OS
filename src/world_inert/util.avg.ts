/*
 * Module code goes here. Use 'module.export const to export things:
 * module.export constthing = 'a thing';
 *
 * You can import it from another modules like this:
 * import mod  from "util.avg";
 * mod.thing == 'a thing'; // true
 */

import logger_import from "./screeps.logger";
let logger = new logger_import("util.avg");

class avg {
  constructor(weight = .9) {
    this.avg = 0;
    this.weight = weight;
  }

  get value() {
    return this.avg;
  }
  set value(value) {
    if (this.avg == 0) {
      this.avg = value;
    }

    this.avg = this.avg * (this.weight) + value * (1 - this.weight);
  }
}



export default avg;