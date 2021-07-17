//> storage.db['rooms.objects'].update({ _id: '956a29c7015efce'},{ $set: { body:[{type:"work"}, "work", "work", "work", "carry", "carry", "carry", "move", "move", "move"] }})
//retur

require('prototype.source');
require('prototype.creep');
require('prototype.container');
require('prototype.extractor');
require('prototype.flag');
require('prototype.creep.gathering');
require('prototype.creep.working');
require('prototype.creep.military');
require('prototype.costMatrix');
require('prototype.terminal');
require('prototype.link');
require('prototype.storage');

require('prototype.tower');
require('prototype.room');
require('prototype.position');



var logger = require("screeps.logger");
logger = new logger("main");


// const profiler = require('screeps.profiler');
// global.profiler = profiler;
// profiler.enable();


global.utils = require("util.global");
//profiler.registerObject(global.utils, "utils")


var empireManager = require("manager.empire");
//profiler.registerObject(empireManager, "empire")



empireManager = new empireManager();
//console.log(JSON.stringify(empireManager));
empireManager.init();
global.empire = empireManager;




const plus = require('screeps.plus');

var cache = {};
cache.tick = Game.time;
cache.used = 0;


var cpuFloor = 100;
module.exports.loop = function () {
    if (Game.cpu.bucket < cpuFloor) {
        console.log("skipping tick, not enough bucket", Game.cpu.bucket, "min: ", cpuFloor);
        cpuFloor = 1000;
        return;
    }
    cpuFloor = 100;
    //profiler.wrap(function() {
        // if (Game.time % 100 == 0) {
        //     Game.profiler.profile(100);
        // }
    //Game.profiler.background();
        //global.utils.stats.startTick();
        
        //return;
        
        // var req = global.utils.makeCreepRequest(this.name, "workerCreepIds", [HEAL, HEAL, MOVE, MOVE], [MOVE, HEAL], 10, {}, 0, 5);
        // req.important = true;
        // var b = req.getBody(880.0);
        // logger.log("====",JSON.stringify(b));
        // return;
        //Memory.stats.avgCpu;
        logger.log("cpu after mem read", Game.cpu.getUsed())
        logger.log(cache.tick, Game.time-cache.tick, cache.used, empireManager);
        var cpuStart = Game.cpu.getUsed()
        empireManager.tickInit();
        logger.log("empire tick init:", Game.cpu.getUsed() - cpuStart);
        
        cpuStart = Game.cpu.getUsed()
        logger.log('before tick', cpuStart)
        empireManager.tick();
        logger.log("after tick", Game.cpu.getUsed());
        logger.log("empire tick:", Game.cpu.getUsed() - cpuStart);
        
        cpuStart = Game.cpu.getUsed()
        empireManager.tickEnd();
        logger.log("empire tick end:", Game.cpu.getUsed() - cpuStart);
        
        
        var numCreeps = _.keys(Game.creeps).length;
        var cpu = Game.cpu.getUsed();
        if (!Memory.stats) {
            Memory.stats = {};
            Memory.stats.avgCpu = cpu;
        }
        var l = 0.9;
        Memory.stats.avgCpu = Memory.stats.avgCpu * l + cpu * (1-l);
        logger.log('Tick done', Memory.stats.avgCpu + "(" + cpu + ")", numCreeps, cpu / numCreeps, Game.cpu.bucket);
        
        
        // var d = _.map(Game.creeps, function(c, name, creeps) {
        //     var home = c.memory.home;
        //     var bornIn = c.memory.bornIn;
        //     var dist = 0;
        //     if (home != bornIn) {
        //         var rPath = Game.map.findRoute(home, bornIn);
        //         dist = rPath.length;
        //     }
            
        //     return {
        //         "home": home,
        //         "bornIn": bornIn,
        //         "dist": dist,
        //         "role": c.memory.role,
        //         'ttl': c.ticksToLive
        //     }
        // });
        // d = _.groupBy(d, "dist");
        // var tot = 0;
        // var numOver = 0;
        // for(var i in d) {
        //     tot += i * d[i].length;
        //     if (i > 5) {
        //         numOver += d[i].length;
        //     }
        //     logger.log("dist:", i, " count:", d[i].length, " roles:", _.map(d[i], function(d) {return d.role + "(" + d.ttl + ")("+d.home+")"}) )
        // }
        
        // logger.log('avg', tot / _.keys(Game.creeps).length, "num over:", numOver)
        // logger.log(JSON.stringify(d))
        global.utils.stats.logTick();
        //plus.collect_stats();
        //logger.log(Game.profiler.output());
    //});
}
