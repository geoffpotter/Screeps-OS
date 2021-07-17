/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('screeps.stats');
 * mod.thing == 'a thing'; // true
 */
 

var logger = require("screeps.logger");
logger = new logger("screeps.stats");

var stats = function() {

    
    
    this.startOfMain = Game.cpu.getUsed();
    
    
    this.startTick = function() {
        this.startOfMain = Game.cpu.getUsed();
        
        this.mem = {};
        this.mem.stats = {};
        
        for(var s in RawMemory.segments) {
            logger.log(s)
        }
        if (RawMemory.segments[99]) {
            var mem = RawMemory.segments[99].split("\n");
            this.mem = JSON.parse(mem[3])
            logger.log(JSON.stringify(this.mem))
        }
        if (!this.mem.stats.paths) {
            this.mem.stats.paths = {};
        }
        this.mem.stats.paths.searches = 0;
        this.mem.stats.paths.searchCPU = 0;
        this.mem.stats.paths.flowsUsed = 0;
        this.mem.stats.paths.pathUsed = 0;
    }
    
    this.logTick = function() {
        return;
        if (Memory.profiler) {
            for (var func in Memory.profiler.map) {
                Memory.profiler.map[func].name=func;
            }
            var i = 0;
            var lim = 100;
            var m = _.sortBy(Memory.profiler.map, ["time"]);
            var totalTicks = Game.time - Memory.profiler.enabledTick;
            if (!this.mem.stats.profile) {
                this.mem.stats.profile = {};
            }
            //logger.log("kjkjh--", m);
            for (var func in m) {
                var fData = m[func];
                
                var p = fData.name.split(".");
                var on = p[0];
                var fn = p[1];
                
                //var n = fData.name.replace(".","-");
                if (!this.mem.stats.profile[on]) {
                    this.mem.stats.profile[on] = {};
                }
                if (!this.mem.stats.profile[on][fn]) {
                    this.mem.stats.profile[on][fn] = {};
                }

                this.mem.stats.profile[on][fn].time = fData.time /totalTicks;
                this.mem.stats.profile[on][fn].calls = fData.calls / totalTicks;
                this.mem.stats.profile[on][fn].avg = fData.time / fData.calls;
                this.mem.stats.profile[on][fn].totalTicks = totalTicks;
                
                if (i >= lim) {
                    break;
                }
                i++;
            }
        }
        
        this.setStat("gcl", "progress", Game.gcl.progress);
        this.setStat("gcl", "progressTotal", Game.gcl.progressTotal);
        this.setStat("gcl", "level", Game.gcl.level);
        
        this.setStat("cpu", "start", this.startOfMain);
        this.setStat("cpu", "bucket", Game.cpu.bucket);
        this.setStat("cpu", "limit", Game.cpu.limit);
        this.runningAvgStat("cpu", "change", Game.cpu.getUsed() - this.mem.lastCPU, 0.9);
        this.setStat("cpu", "getUsed", Game.cpu.getUsed());
        this.runningAvgStat("cpu", "runningUsed", Game.cpu.getUsed(), 0.9);
        
        
        //turn 
        
        
        this.mem.lastCPU = Game.cpu.getUsed()
        var headers = []
        headers.push("application/json");
        headers.push(Game.time);
        headers.push(new Date());
        //logger.log(JSON.stringify( this.toGrafana("mem", this.mem)))
        RawMemory.segments[99] = headers.join("\n") + "\n" + JSON.stringify(this.mem);
    },
    
    this.runningAvgStat = function(objName, statName, value, lerp) {
        // if (!lerp) {
        //     lerp = 0.9;
        // }
        // if (!this.mem.stats[objName]) {
        //     this.mem.stats[objName] = {};
        // }
        // if (!this.mem.stats[objName][statName]) {
        //     this.mem.stats[objName][statName] = value;
        // }
        // this.mem.stats[objName][statName] = this.mem.stats[objName][statName]*lerp + value*(1-lerp);
    }
    
    this.setStat = function(objName, statName, value) {
        // if (!this.mem.stats[objName]) {
        //     this.mem.stats[objName] = {};
        // }
        // this.mem.stats[objName][statName] = value;
    },
    this.setSubStat = function(objName, statName, subStatName, value) {
        // if (!this.mem.stats[objName]) {
        //     this.mem.stats[objName] = {};
        // }
        // if (!this.mem.stats[objName][statName]) {
        //     this.mem.stats[objName][statName] = {};
        // }
        // this.mem.stats[objName][statName][subStatName] = value;
    },
    this.pathSearched = function(cpuUsed) {
        // this.mem.stats.paths.searches++;
        // this.mem.stats.paths.searchCPU += cpuUsed;
    },
    this.flowUsed = function() {
        // this.mem.stats.paths.flowsUsed++;
    },
    this.pathUsed = function() {
        // this.mem.stats.paths.pathUsed++;
    },
    
    
    this.toGrafana = function(name, obj) {
        var out = [];
        if (_.isObject(obj) || _.isArray(obj)) {
            for(var i in obj) {
                var converted = this.toGrafana(name + (name.length > 0 ? "." : "") + i, obj[i]);
                //logger.log(i, JSON.stringify(converted))
                out = out.concat(converted);
            }
        } else {
            out.push(name + " " + obj);
        }
        return out;
    }
    
    this.fromGrafana = function(dataString) {
        var lines = dataString.split("\n");
        var out = {};
        for(var l in lines) {
            var line = lines[l];
            logger.log("doin line", line)
            parts = line.split(" ");
            var name = parts[0];
            var value = parts[1];
            var path = name.split(".");
            var curTarget = out;
            for(var loc in path) {
                var thisName = path[loc]
                var lastInPath = loc == path.length-1;
                if (lastInPath) {
                    curTarget[thisName] = value;
                } else {
                    if (!curTarget[thisName] ) {
                        curTarget[thisName] = {};
                    }
                    curTarget = curTarget[thisName];
                }
                
            }
            
            curTarget = value;
        }
        return out;
    }
    
    this.logRoomTick = function(roomManager) {

        
    }
};

module.exports = stats;