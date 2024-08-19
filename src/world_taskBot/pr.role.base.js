/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * import mod  from "pr.role.base";
 * mod.thing == 'a thing'; // true
 */


import logger_import from "./screeps.logger";
let logger = new logger_import("pr.role.base");
logger.enabled = false;
import processClass from "./INeRT.process";
import threadClass from "./INeRT.thread";

/*    
    static get MINING() { return "mining" }
    static get PRAISE() { return "praise" }
    static get PICKUP() { return "pickup" }
    static get FILLSPAWNS() { return "fillSpawns" }
    */

//constructor(taskNames, maxRange = 50, minAmount = false, useBiggestTask = false, searchData = false) {

class baseRole extends processClass {
  // constructor(name, priority, data = {}, parentName = false) { // class constructor
  //     super(name, priority, data, parentName);
  //     this.creeps = [];


  // }
  initThreads() {

    return [
      this.createThread("initTick", "init"),
      this.createThread("handleSpawning", "empire"),
      this.createThread("getCreepTasks", "taskFind"),
      this.createThread("runCreepTasks", "creepAct"),
      this.createThread("updateFillTasks", "taskUpdate"),
    ];
  }

  init() {
    this.taskManager = this.kernel.getProcess('taskManager');
    this.creepManager = this.kernel.getProcess('creepManager');
    this.creeps = [];

    let defaultRange = 50;
    this.enabledEnergyTasks = [
      new global.TaskOptIn([global.Task.PICKUP, global.Task.PICKUPATCONTROLLER], defaultRange, false),
      new global.TaskOptIn(global.Task.PICKUPENERGYCONT, defaultRange, false),
      new global.TaskOptIn(global.Task.MINING, defaultRange, false),
    ];
    this.enabledWorkTasks = [
      new global.TaskOptIn(global.Task.FILLSPAWNS, defaultRange, false),
      new global.TaskOptIn(global.Task.FILLTOWERS, defaultRange, false),
      new global.TaskOptIn([global.Task.BUILD, global.Task.REPAIR], defaultRange, false),
      new global.TaskOptIn(global.Task.PRAISE, defaultRange, false),
    ];

    //this.taskManager.createTask(this, global.Task.DELIVERENERGY, global.Task.TYPE_WORK, creep.pos, {"targetId":creep.id});
    this.deliverTasks = {};
    this.creepTasks = {};
    this.allowRefils = true;

    this.creepClass = "worker";
    this.creepRole = "worker2";
    this.spawnPriority = 1;
    this.requiredParts = {
      WORK: 5
    };

    this.totalNeededParts = 0;
    this.totalParts = 0;

    this.priorityIncresePerCreep = 10;
  }

  initTick() {
    // if(!this.data.pos){
    //   logger.log("no pos",this.creepRole,this.parentName);
    //   return;
    // }

    //logger.log("here?")
    //setup our position
    this.pos = new RoomPosition(this.data.pos.x, this.data.pos.y, this.data.pos.roomName);
    //logger.log('also here')
    //grab our creeps
    this.creeps = this.creepManager.getProcessCreeps(this);
    //logger.log(this.name, "got creeps?", this.creeps.length);

    //logger.log(this.name, "parts", JSON.stringify(this.requiredParts), JSON.stringify(this.data.requiredParts));
    if (this.data.requiredParts) {
      this.requiredParts = this.data.requiredParts;
    }
    if (this.data.creepClass) {
      this.creepClass = this.data.creepClass;
    }

    this.displayRole();
  }
  updateFillTasks() {
    //handle working flag and refil task
    for (let c in this.creeps) {
      let creep = this.creeps[c];
      if (creep.spawning)
        continue;
      this.handleWorkingFlag(creep);
      if (this.allowRefils) {
        let deliverTask = this.deliverTasks[creep.name];
        if (!deliverTask) {
          deliverTask = this.taskManager.createTask(this, global.Task.DELIVERENERGY, global.Task.TYPE_WORK, creep.pos, {
            "targetId": creep.id
          });
          this.deliverTasks[creep.name] = deliverTask;
        }
        deliverTask.amount = creep.carryCapacity - _.sum(creep.carry);
        //if (this.deliverTask.amount > (creep.carryCapacity * 0.5)) {
        if (creep.memory.working && deliverTask.amount < 0) {
          this.taskManager.setTask(this, deliverTask);
        }
      }
    }
  }




  getCreepTasks() {
    this.creepTasks = {};
    for (let c in this.creeps) {
      let creep = this.creeps[c];
      if (!creep.spawning) {
        let task = this.taskManager.getTaskFromMemory(creep);

        if (task) {
          task.assignCreep(creep);
        } else {
          logger.log(creep, "find task")
          creep.say("find task");
          task = this.findTask(creep);


          if (task) {
            logger.log(creep, task.name, task.amount)
            creep.memory.task = {
              name: task.name,
              pos: task.pos
            };
          } else {
            logger.log(creep.name, "can't find task!");
          }
        }

        this.creepTasks[creep.name] = task;
        if (task) {
          //logger.log(creep, task.name, this.creepTasks[creep.name].name);
        } else {
          logger.log(creep, "no task!")
        }
      }
    }
  }
  runCreepTasks() {
    for (let creepName in this.creepTasks) {
      let task = this.creepTasks[creepName];
      let creep = _.find(this.creeps, {
        'name': creepName
      });
      if (!creep) {
        //guess he died?
        delete this.creepTasks[creepName];
        continue;
      }
      if (creep.spawning) {
        continue;
      }
      //fuckin do it already
      //logger.log(creep, "doing thing", task)
      this.doTask(creep, task);
    }
  }



  handleWorkingFlag(creep) {
    //creep.memory.task = false;
    let room = this.getRoom();
    //logger.log("here", creep, room);
    if (creep.memory.working == undefined) {
      creep.memory.working = false;
    }
    //logger.log(creep, !creep.memory.working, _.sum(creep.carry) == creep.carryCapacity)
    if (!creep.memory.working && (_.sum(creep.carry) == creep.carryCapacity && creep.carryCapacity != 0)) {
      //logger.log(creep, "start working")
      creep.memory.working = true;
      creep.memory.task = false;
    }

    if (creep.memory.working && _.sum(creep.carry) == 0) {
      //logger.log(creep, "done working")
      creep.memory.working = false;
      creep.memory.task = false;
    }
  }

  findTask(creep) {
    let task = false;

    this.energyTasksRange = 100;
    this.workTaskRange = 150;

    let pos = creep.pos;
    if (pos.roomName != this.data.roomName) {
      logger.log(creep, "in wrong room, using", this.data.roomName);
      pos = new RoomPosition(25, 25, this.data.roomName)
    }

    if (creep.memory.working) {
      //find doWork task
      for (let i in this.enabledWorkTasks) {
        let taskOptIn = this.enabledWorkTasks[i];
        let task = taskOptIn.findTask(this.taskManager, creep, pos);


        //logger.log("found work task", JSON.stringify(task));
        if (task) {
          return task;
        }
      }
    } else {
      //find getEnergy task
      for (let i in this.enabledEnergyTasks) {
        //getTaskByNameAndLoc(name, creep, range = 50)
        let taskOptIn = this.enabledEnergyTasks[i];
        let task = taskOptIn.findTask(this.taskManager, creep, pos);


        //logger.log("found energy task", JSON.stringify(task));
        if (task) {
          return task;
        }
      }
    }



  }

  doTask(creep, task) {
    //task.displayTask(creep);
    //logger.log(creep, JSON.stringify(task));
    if (task && task.preformTask) {
      task.displayTask(creep);
      let done = task.preformTask(creep);
      if (done === true) {
        logger.log(creep, "task done!", task.name)
        creep.memory.task = false;
      }
      //logger.log(creep, "did task", task.name, done)
    } else {
      creep.say("no " + (creep.memory.working ? "work" : "energy"));
      logger.log("___ERROR_____", creep, "has no task!", task);
      creep.memory.task = false;
      this.noTask(creep);
    }
  }
  noTask(creep) {
    //move to role pos
    global.creepActions.moveTo(creep, this.pos);
  }


  //-------------------spawnin shit------------------
  handleSpawning() {

    //if we don't have enough creeps, based on our part counts
    if (!this.creepNeedsMet()) {
      //logger.log(this.creepRole, "need creeps!", this.totalParts, this.totalNeededParts, this.pos)
      if (!this.pos) {
        logger.log(this.creepRole, "has no POS!  CAN'T SPAWN");
        return;
      }
      //umm.. fuckin spawn one?
      let creep = this.creepManager.requestCreep(this, this.creepRole, this.creepClass, this.pos, this.spawnPriority + this.creeps.length * this.priorityIncresePerCreep, this.creeps.length);
      if (creep) {
        //yay!, we got a creep.. dunno wtf to do with him at this point.. sooooo...
        this.creeps.push(creep);
        //logger.log(this.name, "got creep", creep)
        creep.say("Jobs!");
      }
    }

  }
  creepNeedsMet() {
    let needsMet = true;
    this.totalNeededParts = 0;
    this.totalParts = 0;

    for (let part in this.requiredParts) {
      let need = this.requiredParts[part];
      part = part.toLowerCase();
      this.totalNeededParts += need;
      let count = 0;
      for (let c in this.creeps) {
        let creep = this.creeps[c];
        let creepParts = _.groupBy(creep.body, (p) => p.type);
        //logger.log(creep, JSON.stringify(creepParts), count, creepParts[part.toLowerCase()], part);
        if (creepParts[part]) {
          count += creepParts[part].length;
          this.totalParts += creepParts[part].length;
        }
      }
      if (count < need) {
        needsMet = false;
        break;
      }
    }
    return needsMet;
  }

  displayRole() {
    //logger.log(this.name, this.pos);
    //global.utils.drawText(this.creepRole + " " + this.totalParts + " " + this.totalNeededParts, this.pos);
  }

}


//profiler.registerClass(baseRole, "role.base")
export default baseRole;