
// let memory = Memory;
// global.Memory = memory;

// delete global.Memory;
// 	Memory = memory;
// 	global.Memory = memory;

var logger = require("screeps.logger");
logger = new logger("main");

// logger.log(Game.cpu.bucket);
// return;

//_.each(Game.creeps, (c) => c.suicide());
// _.each(Game.creeps, (c) => c.memory.task = false)
//return;

//_.each(Game.flags, (f) => logger.log(f.remove()));
// Memory.creeps = {};
// return;
//Memory.rooms ={}
//util classes
// Memory.pStar = "";
// return;
// RawMemory.set("");
// return;
//prototype overrides
require("proto.creep");
require("proto.roomPosition");
require("proto.RoomObject");
const profiler = require('screeps.profiler');
global.profiler = profiler;
global.utils = {};
global.utils.array = require("util.array");
global.utils.visual = require("util.visual");
global.utils.map = require("util.map");
global.utils.pStar = require("util.pStar");
global.utils.cm = require("util.cm");

for(let u in global.utils) {
	let util = global.utils[u];
	//util = profiler.registerObject(util, "utils." + u);
	for(let itemName in util) {
		let item = util[itemName];
		let label = "utils." + u + "." + itemName;
		logger.log("wrapping", label)
		//all classes go in a .classes property of the utility.
		if (itemName == "classes") {
			for(let className in item) {
				let cl = item[className];
				logger.log("registering class",  label + "." + className)
				profiler.registerClass(cl, label + "." + className);
			}
		} else if (typeof item == "function") {
			item = profiler.registerFN(item, label);
		} else if (typeof item == "object") {
			//likely a good place for recursion.. meh..
			item = profiler.registerObject(item, label)
		}
		
		//logger.log(u, itemName, item.toString().indexOf("this"), item.constructor.name, item.profilerWrapped)
		util[itemName] = item;
	}
	global.utils[u] = util;
}
//profiler.registerObject(global.utils, "utils")
// logger.log(JSON.stringify(global.creepClasses));
//return;


let kernelClass = require("INeRT.kernel");
profiler.registerClass(kernelClass, 'kernel');
let kernel = new kernelClass();

logger.log("---------main reboot---------")


let initProcClass = require("pr.init");
let initProc = new initProcClass("init");
kernel.startProcess(initProc);

// let testProcClass = require("inert.tests");
// let testProc = new testProcClass("testin");
// kernel.startProcess(testProc);
//profiler.registerClass(kernel.__proto__, "kernel");


profiler.enable();

// let mainLoop = function () {
// 	logger.log("----------------------- tick start -------------------------------------", Game.cpu.getUsed());
// 	kernel.run();
// 	logger.log("creep count:", Object.keys(Game.creeps).length)
// 	logger.log("----------------------- tick end -------------------------------------", Game.cpu.getUsed());
    
// };
let mainLoop = function () {
    profiler.wrap(function() {
		// delete global.Memory;
		// Memory = memory;
		// global.Memory = memory;

    logger.log("----------------------- tick start -------------------------------------", Game.cpu.getUsed());
	

	kernel.run();
	logger.log("creep count:", Object.keys(Game.creeps).length);
	let heap = Game.cpu.getHeapStatistics();
	logger.log(JSON.stringify(heap))
	
	
	// RawMemory._parsed = Memory;

	logger.log("----------------------- tick end -------------------------------------", Game.cpu.getUsed());
    });
};
if (Object.keys(Game.rooms)[0] !="sim") {
    mainLoop = wrapLoop(mainLoop);
}
module.exports.loop = mainLoop;


function wrapLoop(fn) {
    //let memory;
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
		//let mem = JSON.stringify(Memory)
		//logger.log("saving mem", mem)
		//logger.log("stored mem", JSON.stringify(global.Memory))
        //RawMemory.set(mem);
        RawMemory._parsed = Memory;
        logger.log("total cpu used:", Game.cpu.getUsed())
    };
}