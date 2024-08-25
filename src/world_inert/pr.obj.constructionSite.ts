/*
 * Module code goes here. Use 'module.export const to export things:
 * module.export constthing = 'a thing';
 *
 * You can import it from another modules like this:
 * import mod  from "pr.obj.constructionSite";
 * mod.thing == 'a thing'; // true
 */

import logger_import from "./screeps.logger";
let logger = new logger_import("pr.obj.constructionSite");

import processClass from "./INeRT.process";
import threadClass from "./INeRT.thread";


class constSiteProc extends processClass {
  init() {
    this.taskManager = this.kernel.getProcess('taskManager');
    let site = Game.getObjectById(this.data.siteId);
    //(proc, name, type, pos, data) {
    this.task = this.taskManager.createTask(this, global.Task.BUILD, global.Task.TYPE_WORK, site.pos, {
      "siteId": site.id
    });
    this.taskManager.setTask(this, this.task);
  }

  initThreads() {
    return [
      this.createThread("taskUpdate", "taskUpdate")
    ];
  }

  taskUpdate() {
    let site = Game.getObjectById(this.data.siteId);
    //logger.log(site, this.task.amount);
    if (site) {
      this.task.pos = site.pos;
      this.task.data.siteId = site.id;
      this.task.amount = site.progressTotal - site.progress;
      //this.task.amountAssigned = 0;

    } else {
      logger.log("SITE DOESN'T EXIST")
      return threadClass.DONE;
    }
  }


}



export default constSiteProc;