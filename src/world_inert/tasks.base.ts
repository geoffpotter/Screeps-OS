/*
 * Module code goes here. Use 'module.export const to export things:
 * module.export constthing = 'a thing';
 *
 * You can import it from another modules like this:
 * import mod  from "tasks.base";
 * mod.thing == 'a thing'; // true
 */
import logger_import from "./screeps.logger";
let logger = new logger_import("tasks.base");



class Task {
  constructor() {
    this.procName = false;
    this.name = false;
    this.type = false;
    this.data = false;
    this.pos = false;

    this.amount = false;
    this.assignments = {}; //creepName => amount assigned

    this.displayThisTask = false;

    this.kernel = false;
  }
  get amountAssigned() {
    return _.sum(this.assignments);
  }

  workLeft() {
    //logger.log('???', this.amount, this.amountAssigned)
    return this.amount === false || (this.amount > this.amountAssigned);
  }

  amountRemaining() {
    return Math.max(this.amount - this.amountAssigned, 0);
  }

  displayTask(creep = false) {
    return;
    //logger.log(this.name, "display?", this.displayThisTask)
    if (!this.displayThisTask /*&& creep === false*/ ) {
      return false;
    }
    if (this.amount == 0) {
      return false;
    }
    let creepMode = creep == false;
    let pos = creep ? creep.pos : this.pos;
    let t = creep ? this.name : this.name + " " + this.amount + " " + this.amountAssigned;

    global.utils.drawText(t, pos);
  }



  assignCreep(creep) {
    logger.log(this.name, "has no assignCreep implementation!")
  }
  preformTask(creep) {
    logger.log(this.name, "has no preformTask implementation!")
  }

  //types
  static get TYPE_GETENERGY() {
    return "getEnergy"
  } //this task gets energy, after completion, creep should contain energy, if it has carry parts
  static get TYPE_DOWORK() {
    return "doWork"
  } //this task uses energy to DO something


  //names
  static get MINING() {
    return "⛏"
  }
  static get PICKUP() {
    return "🆙"
  }
  static get PICKUPATCONTROLLER() {
    return "🆙⛪"
  }
  static get PICKUPENERGYCONT() {
    return "📦"
  }
  static get PICKUPENERGYSTORAGE() {
    return "📦🛄"
  }
  static get PICKUPENERGYSPAWN() {
    return "📦🏠"
  }
  static get PICKUPENERGYCONTROLLER() {
    return "📦⛪"
  }

  static get FILLSPAWNS() {
    return "🏠"
  }
  static get PRAISE() {
    return "🙌"
  }
  static get FEEDUPGRADERS() {
    return "🥫⛪"
  }
  static get FEEDSPAWNS() {
    return "🥫🏠"
  }
  static get DUMPINSTORAGE() {
    return "🛄"
  }
  static get BUILD() {
    return "🏗️"
  }
  static get REPAIR() {
    return "🔧"
  }
  static get DELIVERENERGY() {
    return "🔋"
  }
  static get FILLTOWERS() {
    return "🗼"
  }
  static get DROP() {
    return "🚯"
  }


}

global.Task = Task;
//not sure why this was here..
//import tasks.taskOptIn
export default Task;