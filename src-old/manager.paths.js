/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('manager.paths');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("manager.paths");

var obj = function() {
    
}

obj.prototype.init = function() {
    logger.log("init")
    this.mem = {};
    
    // RawMemory.setActiveSegments([0,2,3]);
    // this.mem = {};
    // if (RawMemory.segments[0]) {
    //     var allPaths = RawMemory.segments[0];
    //     if (RawMemory.segments[2]) {
    //         allPaths += RawMemory.segments[2];
    //     }
    //     if (RawMemory.segments[3]) {
    //         allPaths += RawMemory.segments[3];
    //     }
    //     logger.log(allPaths);
    //     if (allPaths) {
    //         this.mem = JSON.parse(allPaths)
    //     } else {
           
    //     }
        
    // }
    // Memory.paths = false;
    // if (!Memory.paths) {
    //     Memory.paths = {};
    // }
    
}
var lastParseTick = 0;
obj.prototype.tickInit = function() {
    var startCpu = Game.cpu.getUsed();
    //this.mem = Memory.paths;
    
    // RawMemory.setActiveSegments([0,2,3,99]);
    
    // var dataLength = 0;
    // if (RawMemory.segments[0] && (lastParseTick+1 != Game.time)) {
    //     var allPaths = RawMemory.segments[0];
    //     if (RawMemory.segments[2]) {
    //         allPaths += RawMemory.segments[2];
    //     }
    //     if (RawMemory.segments[3]) {
    //         allPaths += RawMemory.segments[3];
    //     }
    //     dataLength = allPaths.length;
        
    //     if (allPaths && allPaths.length < 210000) {
    //         this.mem = JSON.parse(allPaths)
    //         if (dataLength > 190000) {
    //             for(var d in this.mem) {
    //                 var dest = this.mem[d];
    //                 logger.log("-----------]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]--", dest, _.keys(dest).length);
    //                 if (_.keys(dest).length < 2) {
    //                     delete this.mem[d];
    //                 }
    //             }
    //         }
    //     } else {
           
    //     }
        //lastParseTick = Game.time;
    //}
    var cpu = Game.cpu.getUsed();
    //global.utils.stats.runningAvgStat("paths", "parseCpu", cpu-startCpu, 0.9);
    //global.utils.stats.setStat("paths", "dataSize", dataLength);
    logger.log("paths parsed", startCpu, cpu, cpu-startCpu, "********************", this.mem.length)
}

obj.prototype.tick = function() {
    
}

obj.prototype.tickEnd = function() {
    logger.log('tickEnd---------------------')
    var displayFlags = global.utils.flagsByColor(Game.flags, COLOR_WHITE, COLOR_GREY);
    for(var f in displayFlags) {
        var flag = displayFlags[f];
        var destName = flag.pos.roomName+"-"+flag.pos.x+"-"+flag.pos.y;
        if (this.mem[destName]) {
            var flow = this.mem[destName];
            logger.log('-----------------drawing path', flag.pos)
            global.utils.drawFlowField(flag.pos, flow);
        }
    }
    //drawFlowField
    
    // var allPaths = JSON.stringify(this.mem);
    // var sections = allPaths.match(/.{1,100000}/g);
    // if (sections.length > 3) {
    //     return;
    // }
    // if (sections.length > 0)
    //     RawMemory.segments[0] = sections[0];
        
    // if (sections.length > 1) {
    //     RawMemory.segments[2] = sections[1];
    // } else {
    //     RawMemory.segments[2] = ""
    // }
    
    // if (sections.length > 2) {
    //     RawMemory.segments[3] = sections[2];
    // } else {
    //     RawMemory.segments[3] = ""
    // }
}

obj.prototype.getFlowDir = function(dest, currentPos) {
    //this.mem = {};
    //return false;
    var destName = dest.roomName+"-"+dest.x+"-"+dest.y
    //logger.log(destName)
    var flow = this.mem[destName];
    if (flow) {
        if (flow[currentPos.roomName] && flow[currentPos.roomName][currentPos.x] && flow[currentPos.roomName][currentPos.x][currentPos.y]) {
            var myflow = flow[currentPos.roomName][currentPos.x][currentPos.y];
            //global.utils.drawFlowField(dest, flow);
            return myflow;
        }
    }
    return false;
}

obj.prototype.savePath = function(dest, pathInfo) {
    //return;
    // if (pathInfo.ops < 10) {
    //     return;
    // }
    //logger.log('saving path', dest.roomName, dest.x, dest.y, JSON.stringify(pathInfo))
    var destName = dest.roomName+"-"+dest.x+"-"+dest.y
    if (!this.mem[destName]) {
        this.mem[destName] = {};
    }
    var flow = this.mem[destName];
    var lastPos = false;
    for(var p in pathInfo.path) {
        var pos = pathInfo.path[p];
        if (lastPos) {
            var dir = lastPos.getDirectionTo(pos);
            flow = this.setFlowValue(flow, lastPos, dir);
            //logger.log(flow[pos.roomName][pos.x][pos.y]);
        }
        lastPos = pos;
    }
    this.mem[destName] = flow;
}

obj.prototype.setFlowValue = function(flow, pos, direction) {
    if (!flow[pos.roomName]) {
        flow[pos.roomName] = {};
    }
    if (!flow[pos.roomName][pos.x]) {
        flow[pos.roomName][pos.x] = {};
    }
    //logger.log(pos.roomName, pos.x, pos.y, direction);
    // only update flow if it has no value for this square
    if (!flow[pos.roomName][pos.x][pos.y]) {
        flow[pos.roomName][pos.x][pos.y] = direction;
    }
    return flow;
}

/*


Creep.prototype.oldMoveTo = Creep.prototype.moveTo;
Creep.prototype.moveTo = function(target, opts) {

    if (opts == undefined) {
        opts = {};
    }
    opts.reusePath=100;
    opts.ignoreCreeps=true;
    if (target == null) {
        console.log(this.name, "is dumb and going no where")
        return;
    }
    if (this.memory.stuck == undefined) {
        this.memory.stuck = 0;
    }
    if (this.memory.stuckLastTick == undefined) {
        this.memory.stuckLastTick = 0;
    }
    //this.memory.stuckLastTick=0
    if (this.memory.lastPos) {
        //if we're in the same position we were in, we may be stuck
        if (this.memory.lastPos.x == this.pos.x && this.memory.lastPos.y == this.pos.y) {
            this.memory.stuck++;
            if (this.memory.stuck > 1) {
                this.memory.stuckLastTick = (this.memory.stuckLastTick == 0 ? 2 : this.memory.stuckLastTick++);
            }
        } else {
            if (this.memory.stuck > 0) {
                this.memory.stuck--;
            }
            if (this.memory.stuckLastTick > 0) {
                this.memory.stuckLastTick--;
            }
        }
    }
    
    this.memory.lastPos = this.pos;
    
    // if (this.memory.stuckLastTick) {
    //     this.say("s"+this.memory.stuckLastTick);
    //     opts.ignoreCreeps = false;
    //     var res = this.oldMoveTo(target, opts);
    //     return res;
    // } else {
    //     var res = this.oldMoveTo(target, opts);
    //     return res;
    // }
    
    var targetPos;
    if (target instanceof RoomPosition) {
        targetPos = target;
    } else {
        targetPos = target.pos;
    }
    
    if (Creep.prototype.mem[targetPos.gridName()] == undefined) {
        Creep.prototype.mem[targetPos.gridName()] = {
            count: 0,
            paths: {}
        };
    }
    Creep.prototype.mem[targetPos.gridName()].count++;
    
    var alreadyOnPath = this.pathsContain(Creep.prototype.mem[targetPos.gridName()].paths, this.pos);

    
    if (this.memory.stuckLastTick) {
        this.say("s"+this.memory.stuckLastTick);
        opts.ignoreCreeps = false;
        var res = this.oldMoveTo(target, opts);
        return res;
    } else {
        if (!Creep.prototype.mem[targetPos.gridName()].paths[this.pos.gridName()]) {
            Creep.prototype.mem[targetPos.gridName()].paths[this.pos.gridName()] = {
                count:0
            };
        }
        
        if (alreadyOnPath) {
            Creep.prototype.mem[targetPos.gridName()].paths[alreadyOnPath].count++;
            var path = Creep.prototype.mem[targetPos.gridName()].paths[alreadyOnPath].path;
            //logger.log(this.name, 'moving by path2', this.pos, alreadyOnPath)
            this.say("on a path!");
            if (Creep.prototype.mem[targetPos.gridName()].paths[alreadyOnPath].count > 4) {
              this.buildRoad();  
            }
            return this.moveByPath(path);
        } else {
            Creep.prototype.mem[targetPos.gridName()].paths[this.pos.gridName()].count++;
            path = this.pos.findPathTo(targetPos, opts);
            
            Creep.prototype.mem[targetPos.gridName()].paths[this.pos.gridName()].path = path;
            
            //logger.log(this.name, 'moving by path', this.pos, target, targetPos)
            
            this.say("routing!");
            return this.moveByPath(path);
        }
    }
    
}
*/
module.exports = obj;