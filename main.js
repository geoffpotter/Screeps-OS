var logger = require("screeps.logger");
logger = new logger("main");
//_.each(Game.creeps, (c) => c.suicide());
// _.each(Game.creeps, (c) => c.memory.task = false)
//return;

//Memory.rooms ={} 
//util classe
//Game.Memory = {};
//return false;
//prototype overrides
require("proto.creep");
require("proto.roomPosition");
require("proto.RoomObject");
const profiler = require('screeps.profiler');
global.profiler = profiler;
global.utils = require("util.global");
global.creepClasses = require("util.creepClasses");
global.creepActions = require("util.creepActions");

//profiler.registerObject(global.utils, "utils")
// logger.log(JSON.stringify(global.creepClasses));
// return;


let kernelClass = require("INeRT.kernel");
let kernel = new kernelClass();

logger.log("---------main reboot---------")


let initProcClass = require("pr.init");
let initProc = new initProcClass("init");
kernel.startProcess(initProc);

// let testProcClass = require("inert.tests");
// let testProc = new testProcClass("testin");
// kernel.startProcess(testProc);
profiler.registerClass(kernel.__proto__, "kernel");
//profiler.registerClass(kernelClass, 'kernel');

//profiler.enable();

let mainLoop = function () {
    profiler.wrap(function() {
        logger.log("----------------------- tick start -------------------------------------");
        kernel.run();
        logger.log("----------------------- tick end -------------------------------------");
    });
};

if (Object.keys(Game.rooms)[0] !="sim") {
//    mainLoop = wrapLoop(mainLoop);
}
module.exports.loop = mainLoop;


function wrapLoop(fn) {
    let memory;
    let tick;
    
    return () => {
		if (tick && tick + 1 === Game.time && memory) {
			// this line is required to disable the default Memory deserialization
			delete global.Memory;
			Memory = memory;
			global.Memory = memory;
		} else {
        	memory = Memory;
        	global.Memory = memory;
		}
		
        tick = Game.time;
        
        fn();
        
		// there are two ways of saving Memory with different advantages and disadvantages
		// 1. RawMemory.set(JSON.stringify(Memory));
		// + ability to use custom serialization method
		// - you have to pay for serialization
		// - unable to edit Memory via Memory watcher or console		
		// 2. RawMemory._parsed = Memory;
		// - undocumented functionality, could get removed at any time
		// + the server will take care of serialization, it doesn't cost any CPU on your site
		// + maintain full functionality including Memory watcher and console
		
		// this implementation uses the official way of saving Memory
		let mem = JSON.stringify(Memory)
		//logger.log("saving mem", mem)
		//logger.log("stored mem", JSON.stringify(global.Memory))
        //RawMemory.set(mem);
        RawMemory._parsed = Memory;
        logger.log("total cpu used:", Game.cpu.getUsed())
    };
}