/*
 * Module code goes here. Use 'module.export const to export things:
 * module.export constthing = 'a thing';
 *
 * You can import it from another modules like this:
 * import mod  from "pr.obj.source";
 * mod.thing == 'a thing'; // true
 */

import logger_import from "./screeps.logger";
let logger = new logger_import("pr.obj.source");

import processClass from "./INeRT.process";
import threadClass from "./INeRT.thread";

import {
  Job,
  JobTypes,
  JobAssignment
} from "./jobs.base";

class sourceProc extends processClass {
  init() {
    this.jobManager = this.kernel.getProcess("jobManager");

    this.taskManager = this.kernel.getProcess('taskManager');
    let dataPOS = new RoomPosition(this.data.pos.x, this.data.pos.y, this.data.pos.roomName);
    let sourceId = `${this.data.pos.x}-${this.data.pos.y}-${this.data.pos.roomName}`
    this.task = this.taskManager.createTask(this, global.Task.MINING, global.Task.TYPE_GETENERGY, dataPOS, {
      "sourceId": sourceId,
      "energy": 1500
    });
    this.cont = false;
    this.openSpots = 5;
    //this.refreshSpotsAndContainers();
    this.taskManager.setTask(this, this.task)
  }

  initThreads() {
    return [
      this.createThread("taskUpdate", "taskUpdate"),
      this.createThread("jobCreate", "jobCreate"),
      this.createThread("refreshSpotsAndContainers", "work")
    ];
  }

  jobCreate() {
    //(parentProc, targetId, pos, jobType, resourceType = RESOURCE_ENERGY)
    this.mineJob = this.jobManager.createJob(this, this.data.sourceId, this.data.pos, JobTypes.MINE);

    this.jobManager.registerJob(this.mineJob);

    let updateThread = this.createThread("jobUpdate", "jobUpdate");
    this.kernel.startThread(updateThread);
    return threadClass.DONE;
  }

  jobUpdate() {
    let source = Game.getObjectById(this.data.sourceId);
    this.mineJob.targetId = this.data.sourceId;
    if (source) {
      this.mineJob.amount = source.energy == 0 ? 0 : this.openSpots;
    } else {
      this.mineJob.amount = this.openSpots;
    }
  }

  taskUpdate() {
    let source = Game.getObjectById(this.data.sourceId);

    //logger.log("---------------")
    //logger.log(this.data.pos.roomName, source, this.data.sourceId)
    if (this.data.sourceId) {
      this.task.data.sourceId = this.data.sourceId;
    }

    if (source) {
      this.task.data.energy = source.energy;
      this.task.amount = source.energy == 0 ? 0 : this.openSpots;
    } else {
      this.task.data.energy = 1500;
      this.task.amount = this.openSpots;
    }
  }
  refreshSpotsAndContainers() {
    let source = Game.getObjectById(this.data.sourceId);
    if (source) {
      let conts = source.pos.findInRange(FIND_STRUCTURES, 1, {
        filter: (s) => s.structureType == STRUCTURE_CONTAINER
      });
      if (conts.length > 0)
        this.cont = conts[0]

      //find open spaces
      let spaces = source.pos.getSurroundingClearSpaces();
      this.openSpots = spaces.length;
      this.task.data.sourceId = source.id;

      return 10; //sleep for 10 ticks
    }
  }

}



export default sourceProc;