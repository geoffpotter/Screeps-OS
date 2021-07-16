/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('pr.empire.taskManager');
 * mod.thing == 'a thing'; // true
 */


var logger = require("screeps.logger");
logger = new logger("lib.taskManager");
//logger.enabled = false;
logger.color = COLOR_YELLOW;

let processClass = require("INeRT.process");
let threadClass = require("INeRT.thread");

var Task = require("tasks.base");

var taskTypes = require("tasks.all");

class taskManager extends processClass {
    init() {
        this.tasks = [];
        this.tasksByName = {};
    }
    
    initThreads() {
        return [
            this.createThread("cullAssignments", "work"),
            this.createThread("cullTasks", "work"),
            ];
    }
    
    initTick() {
        //this.tasks = [];
        //this.tasksByName = {};
        //logger.log("=======================",JSON.stringify(this.tasks))
    }
    tick() {
        
    }
    endTick() {
        //this.updateAssignments();
        this.cullAssignments();
        //logger.log("tasks:", JSON.stringify()this.tasks));
    }
    
    createTask(proc, name, type, pos, data) {
        let taskClass = taskTypes[name];
        if (taskClass) {
            let task = new taskClass();
            task.procName = proc.name;
            task.name = name;
            task.type = type;
            task.pos = pos;
            task.data = data;
            task.kernel = this.kernel;
            return task;
        } else {
            logger.log(proc, name, "invalid task class!--------------------")
            //use generic task and complain
            let task = new Task();
            task.procName = proc.name;
            task.name = name;
            task.type = type;
            task.pos = pos;
            task.data = data;
            task.kernel = this.kernel;
            return task;
        }
        
        return false;
    }
    
    cullAssignments() {
        for(let i in this.tasks) {
            let task = this.tasks[i];
            task.displayTask();
            let assignments = task.assignments;
            //logger.log("checkin assignments for", task.name, task.pos, JSON.stringify(assignments));
            //this should be smarter.. but it won't be.
            let taskAmt = task.amount;
            let taskAmtUsed = 0;
            for(let creepId in assignments) {
                let assignmentAmt = assignments[creepId];
                let creep = Game.getObjectById(creepId);
                //if the total amount assigned(as of last creep) is over the limit, remove the rest of the creeps.
                let overAmt = false;
                if (taskAmt !== false) {
                    overAmt = taskAmtUsed >= taskAmt;
                }
                //logger.log(task.name, creep && creep.name, taskAmt, taskAmtUsed, assignmentAmt)
                if (!overAmt && creep && creep.memory.task) {
                    let creepTask = creep.memory.task;
                    let sameName = creepTask.name == task.name;
                    let samePos = (new RoomPosition(creepTask.pos.x, creepTask.pos.y, creepTask.pos.roomName)).isEqualTo(task.pos);
                    if (sameName && samePos) {
                        //add this creeps assignment to the total assigned to this task
                        taskAmtUsed += assignmentAmt;
                        //logger.log("assignment valid", creep)
                        //task matches, leave this entry
                        continue;
                    }
                }
                if (overAmt && creep && task) {
                    logger.log(task.name, "over amt removing creep", creep.name);
                }
                
                //logger.log("wtf.", taskAmtUsed)
                //logger.log(task.name, "assignment invalid", creepId, creep)
                //creep not workin this task, remove assignment
                delete task.assignments[creepId];
                if (creep) {
                    creep.memory.task = false;
                }
            }
        }
    }
    
    //remove tasks with no parent
    cullTasks() {
        //don't run on reboot
        if (this.kernel.time == 0) {
            return;
        }
        for(let i in this.tasks) {
            let task = this.tasks[i];
            let proc = this.kernel.getProcess(task.procName);
            if (!proc) {
                //proc is dead, kill task
                logger.log(task.procName, "is dead, removing it's task:", task.name);
                _.remove(this.tasks, task);
            }
        }
    }
    
    setTask(proc, task) {
        if (!_.some(this.tasks, {name:task.name, procName:task.procName, type:task.type, pos:task.pos})) {
            this.tasks.push(task);
            if (!this.tasksByName[task.name]) {
                this.tasksByName[task.name] = [];
            }
            if (!_.some(this.tasksByName[task.name], {name:task.name, procName:task.procName, type:task.type, pos:task.pos})) {
                this.tasksByName[task.name].push(task);
            }
            
            // if (task.name == Task.BUILD) {
            //     logger.log("adding build task!", task.pos)
            // }
        } else {
            //task is already in queue
        }
    }
    
    
    getTaskFromMemory(creep) {
        //let t = new global.Task();
        let memTask = creep.memory.task;
        if (memTask) {
            let memPos = new RoomPosition(memTask.pos.x, memTask.pos.y, memTask.pos.roomName);
            let t = _.filter(this.tasks, function(t) {
                //(t) => t.name = memTask.name && t.pos.isEqualTo(memTask.pos)
                //logger.log(t, memTask, t == memTask);
                // logger.log(t.pos, JSON.stringify(memPos));
                // logger.log( t.pos.isEqualTo(memPos));
                return t.name == memTask.name && memPos.isEqualTo(t.pos);
            })[0];
            
            
            //logger.log(creep, "--=-=-=-",t, JSON.stringify(t), t)
            if (t) {
                return t;
            }
        }
        return false;
    }
    
    //constructor(taskNames, maxRange = 50, minAmount = false, useBiggestTask = false, searchData = false) {
    //findTask(creep, pos = false) {
    getTaskFromOptIn(creep, optIn, pos=false) {
        if (pos == false) {
            pos = creep.pos;
        }
        
        let dataFields = [];
        for(var field in optIn.searchData) {
            dataFields.push(field);
        }
        
        let homeWPos = pos.toWorldPosition();
        let CreepWPos = creep.pos.toWorldPosition();
        
        let tasks = this.tasks;
        let tasksToSearch = [];
        for(let n in optIn.taskNames) {
            let taskName = optIn.taskNames[n];
            if (this.tasksByName[taskName]) {
                for(let t in this.tasksByName[taskName]) {
                    let task = this.tasksByName[taskName][t];
                    //logger.log(JSON.stringify(task))
                    let wl = task.workLeft();
                    if (wl) {
                        //logger.log("work left")
                        let dataMatches = true;
                        for(let f in dataFields) {
                            let field = dataFields[f];
                            let fVal = optIn.searchData[field];
                            let mVal = task.data[field];
                            if (fVal != mVal) {
                                dataMatches = false;
                            }
                        }
                        if (dataMatches) {
                            //logger.log("good data")
                            let filterOk = optIn.filter === false || optIn.filter(creep, task);
                            if (filterOk) {
                                //logger.log("task good!")
                                tasksToSearch.push(task);
                                //everything passed, add to the list for range checking
                            }
                        }
                    }
                }
            }
        }
        
        
        let matchingTasks = _.filter(tasksToSearch, function(t) {
            
            let inHomeRange = optIn.maxRange === false || homeWPos.getRangeTo(t.pos.toWorldPosition()) <= optIn.maxRange;
            let inCreepRange = optIn.maxRange === false || CreepWPos.getRangeTo(t.pos.toWorldPosition()) <= optIn.maxRange;
            
            
            
            // if (creep.name =="spawnRoom-W27N5-filler-filler-0" && optIn.taskNames.indexOf(Task.PICKUPENERGYSPAWN) !== -1) {
            //     logger.log(creep, JSON.stringify(t));
            //     logger.log(nameMatches , wl , inRange , sizeOk , filterOk , dataMatches)
            // }
            return (inHomeRange);// || inCreepRange);
        })
        let task = false;
        if(optIn.useBiggestTask) {
            //logger.log(creep.name, "sorted tasks", JSON.stringify( _.sortBy(matchingTasks, "amountRemaining")))
            task = _.sortBy(matchingTasks, "amountRemaining")[0];
        } else {
            task = homeWPos.findClosestByRange(matchingTasks);
        }
        if (!task || !task.name) {
            task = false;
        }
        if(task) {
            task.assignCreep(creep);
        }
    //logger.log(JSON.stringify(matchingTasks));
        //logger.log(creep,"got task", JSON.stringify(task), JSON.stringify(matchingTasks));
        return task;
    }
    
    getTaskByNameAndLoc(name, creep, range = 50, useBiggestTask = false, pos = false) {
        if (pos == false) {
            pos = creep.pos;
        }

        
        let tasks = this.tasksByName[name];
        if (tasks) {
            let wPos = pos.toWorldPosition();
            let activeTasksInRange = _.filter(tasks, function(t) {
                //logger.log(wPos, t, wPos.getRangeTo(t.pos.toWorldPosition()), range, t.workLeft(), wPos.getRangeTo(t) <= range)
                return t.workLeft() && wPos.getRangeTo(t.pos.toWorldPosition()) <= range;
            })
            let ordered = _.sortBy(activeTasksInRange, function(s) {return s.amountRemaining()}).reverse();
            logger.log(creep, JSON.stringify(ordered), JSON.stringify(activeTasksInRange));
            let target = ordered[0];//creep.pos.findClosestByRange(options);
            if (target) {
                target.assignCreep(creep);
                return target;
            }

        }
        //logger.log("no task found", creep.Namespace, name, creep.pos)
        return false;
    }
    getTaskByNameAndData(name, data, fields=[]) {
        let opts = _.filter(this.tasks, (t)=> t.name == name);
        if (fields == false) {
            for(var field in data) {
                fields.push(field);
            }
        }
        for(let o in opts) {
            let opt = opts[o];
            let equal = true;
            for(let f in fields) {
                let field = fields[f];
                let fVal = data[field];
                let mVal = opt.data[field];
                if (fVal != mVal) {
                    equal = false;
                }
            }
            if (equal) {
                return opt;
            }
        }
        return false;
    }
    
    getTaskAmountByNameAndRange(names, pos, range) {
        if (!_.isArray(names)) {
            names = [names];
        }
        let tasksToSearch = [];
        for(let n in names) {
            let taskName = names[n];
            //logger.log(taskName, this.tasksByName[taskName]);
            if (this.tasksByName[taskName]) {
                //logger.log(taskName, this.tasksByName[taskName].length)
                tasksToSearch = tasksToSearch.concat(this.tasksByName[taskName])
            }
        }
        //logger.log(JSON.stringify(names), "tasks to search", tasksToSearch.length)
        let wPos = pos.toWorldPosition();
        let matchingTasks = _.filter(tasksToSearch, function(t) {
            
            let inHomeRange = range === false || wPos.getRangeTo(t.pos.toWorldPosition()) <= range;
            
            return inHomeRange;
        });
        //logger.log("num tasks" + matchingTasks.length)
        //now count the amountRemaining
        let totalAmountRemaining = 0;
        for(let t in matchingTasks) {
            let task = matchingTasks[t];
            //logger.log(t.amountRemaining)
            totalAmountRemaining += task.amount;
        }
        return totalAmountRemaining;
    }
}

module.exports = taskManager;