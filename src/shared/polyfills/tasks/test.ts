// function round(number: string | number, places: string | number) {
//   return +(Math.round(+(number + "e+" + places))  + "e-" + places);
// }

// let settings = {
//   getCpu: function() {
//     return new Date().getTime();
//   }
// }
// function benchmark(arr:Array<Function>, iter = 1) {
//   var exp,
//     r,
//     i,
//     j,
//     len = arr.length;
//   var start, end, used;
//   var results = arr.map((fn) => ({ fn: fn.toString(), time: 0, avg: 0, rtn: undefined }));
//   for (j = 0; j < iter; j++) {
//     for (i = 0; i < len; i++) {
//       start = settings.getCpu();
//       results[i].rtn = arr[i]();
//       used = settings.getCpu() - start;
//       if (i > 0 && results[i].rtn != results[0].rtn)
//         throw new Error("Results are not the same!");
//       results[i].time += used;
//     }
//   }
//   console.log(`Benchmark results, ${iter} loop(s): `);
//   results.forEach( (/** @type {{ avg: number; time: number; fn: any; }} */ res) => {
//     res.avg = round(res.time / iter, 3);
//     res.time = round(res.time, 3);
//     console.log(`Time: ${res.time}, Avg: ${res.avg}, Function: ${res.fn}`);
//   })
// }

// class functionQueueArray {
//   funcs:Array<Function>;
//   private numFuncs;
//   private initialSize;
//   private doneFuncs:WeakSet<Function>;
//   private numDoneFuncs:number;
//   private resetArray() {
//     //let currLen = this.funcs.length;
//     this.funcs = Array(this.initialSize)
//     //this.funcs = Array(Math.max(this.initialSize,  currLen));
//     this.numFuncs = 0;
//   }

//   constructor(initialSize=10000) {
//     this.initialSize = initialSize;
//     this.funcs = Array(initialSize);
//     this.numFuncs = 0;
//     this.doneFuncs = new WeakSet<Function>();
//     this.numDoneFuncs = 0;
//   }
//   addFunc(func:Function) {
//     // if(this.numFuncs > this.funcs.length) {
//     //   throw new Error("Too many funcs in array!!")
//     // }
//     this.funcs[this.numFuncs] = func;
//     this.numFuncs++;
//   }
//   processCurrentQueue() {
//     //console.log("start processing", this.numFuncs)
//     if(this.numFuncs == 0) return;

//     let currentQueue = this.funcs;
//     let numFuncs = this.numFuncs;
//     this.resetArray();

//     let currentFunc = 0;
//     let func;
//     while (currentFunc < numFuncs) {
//       func = currentQueue[currentFunc++];
//       func();
//     }
//   }
//   processCurrentQueueWithDone() {
//     //console.log("start processing", this.numFuncs)
//     if(this.numFuncs == 0) return;

//     let currentQueue = this.funcs;
//     let numFuncs = this.numFuncs;
//     this.resetArray();

//     let currentFunc = 0;
//     let func;
//     while (currentFunc < numFuncs) {
//       func = currentQueue[currentFunc++];
//       let done = func();
//       if(done===false) {
//         this.addFunc(func);
//       }
//     }

//     // currentQueue.forEach((func)=>{
//     //   let done = func();
//     //   if(done === false) {
//     //     this.addfunc(func);
//     //   }
//     // })

//     // let count = 0;
//     // let currentfunc = 0;
//     // let numFuncs = this.numFuncs;
//     // while (currentfunc < numFuncs) {
//     //   let func = this.funcs[currentfunc];
//     //   //console.log("running func", currentfunc, numFuncs, func)
//     //   let done = func();
//     //   if(done !== false) {
//     //     funcIndexesToRemove.add(currentfunc)
//     //   }
//     //   currentfunc++;
//     // }
//     // this.numFuncs -= funcIndexesToRemove.size;
//     // funcIndexesToRemove.forEach(index=>{
//     //   this.funcs.splice(index, 1);
//     // })
//     //this.funcs.splice(0, currentfunc);
//     //console.log("done processing", this.numFuncs, "processed", currentfunc)
//   }

//   processFullQueueWithDone() {
//     //if(this.numFuncs <= this.numDoneFuncs) return;
//     //console.log("start processing", this.numFuncs)
//     if(this.numDoneFuncs > Math.min(Math.max(this.numFuncs * 0.2, 0), 10000000)) {
//      let oldFuncs = this.funcs;
//       let total = this.numFuncs;
//       let current = 0;
//       this.resetArray();
//       while(current < total) {
//         let func = oldFuncs[current];
//         if(!this.doneFuncs.has(func)) {
//           this.addFunc(func);
//         }
//         current++;
//       }
//       this.doneFuncs = new WeakSet();
//       this.numDoneFuncs = 0;
//     }

//     if(this.numFuncs == 0) return;

//     let count = 0;
//     let currentFunc = 0;
//     let func;
//     let doneFuncs = this.doneFuncs;
//     let funcs = this.funcs;
//     while (currentFunc < this.numFuncs) {
//       func = funcs[currentFunc];
//       if(!doneFuncs.has(func)) {
//         if(func() !== false) {
//           doneFuncs.add(func);
//           this.numDoneFuncs++;
//         }
//         count++;
//       }

//       currentFunc++;
//     }
//     //console.log("done processing", this.numFuncs, "processed", count, "done funcs", this.numDoneFuncs, currentFunc)
//   }
//   processFullQueue() {
//     //console.log("start processing", this.numFuncs)
//     //console.log("checking for num done", this.numDoneFuncs, this.numFuncs)
//     if(this.numFuncs == 0) return;
//     let currentFunc = 0;
//     let func;
//     let funcs = this.funcs;
//     while (currentFunc < this.numFuncs) {
//       func = funcs[currentFunc++];
//       func();
//     }
//     this.resetArray();
//     //console.log("checking for num done", this.numDoneFuncs, this.numFuncs)
//     //console.log("done processing", this.numFuncs, "processed", currentFunc, "done funcs", this.numDoneFuncs)
//   }
// }

// class functionQueueSet {
//   funcs:Set<Function>;
//   addFunc:(func:Function)=>void
//   private resetSet() {
//     this.funcs = new Set<Function>();
//     this.addFunc = this.funcs.add.bind(this.funcs)
//   }

//   constructor() {
//     this.funcs = new Set<Function>();
//     this.addFunc = this.funcs.add.bind(this.funcs)
//   }


//   processCurrentQueueWithDone() {
//     //console.log("start processing", this.funcs.size)
//     if(this.funcs.size == 0) return;
//     let funcs = this.funcs;
//     this.resetSet();
//     let count = 0;
//     funcs.forEach((func)=>{
//       //console.log("running func", funcs.size, this.funcs.size)
//       let done = func();
//       if(done===false) {
//         this.addFunc(func);
//       }
//       count++;
//     })
//     //console.log("done processing", this.funcs.size, "processed", count)
//   }
//   processCurrentQueue() {
//     //console.log("start processing", this.funcs.size)
//     if(this.funcs.size == 0) return;
//     let funcs = this.funcs;
//     this.resetSet();
//     let count = 0;
//     funcs.forEach((func)=>{
//       //console.log("running func", funcs.size, this.funcs.size)
//       func();
//       count++;
//     })
//     //console.log("done processing", this.funcs.size, "processed", count)
//   }

//   processFullQueueWithDone() {
//     //console.log("start processing", this.funcs.size)
//     if(this.funcs.size == 0) return;
//     let count = 0;
//     this.funcs.forEach((func)=>{
//       let done = func();
//       if(done!==false) {
//         this.funcs.delete(func);
//       }
//       count++;
//     })
//     //console.log("done processing", this.funcs.size, "processed", count)
//   }
//   processFullQueue() {
//     //console.log("start processing", this.funcs.size)
//     if(this.funcs.size == 0) return;
//     let count = 0;
//     this.funcs.forEach((func)=>{
//       func();
//       count++;
//     })
//     this.funcs.clear();
//     //console.log("done processing", this.funcs.size, "processed", count)
//   }
// }



// enum tickPhases {
//   PRE_TICK,
//   POST_TICK
// }

// const BUFFER_SIZE  = 32768;
// const BUFFER_SIZE3 = 32768;



// class fifoArray_old2<T extends Function> {
//   items:T[];
//   //bufferGrowSize;

//   private currentIndex;
//   private currentBufferSize;

//   get bufferSize() {
//     return this.currentBufferSize
//   }

//   reset() {

//   }

//   constructor(bufferInitialSize=32768, bufferGrowSize = 32768) {
//     //this.bufferGrowSize = bufferGrowSize;
//     this.items = Array(bufferInitialSize);
//     this.currentBufferSize = bufferInitialSize;
//     this.currentIndex = 0;
//   }

//   addItem(item:T) {
//     // if(this.currentIndex > this.currentBufferSize) {
//     //   //console.log("fifo buffer increased by:", this.bufferGrowSize, ", new size:", this.currentBufferSize + this.bufferGrowSize, "current index", this.currentIndex);
//     //   this.currentBufferSize = this.currentBufferSize + this.bufferGrowSize;
//     //   this.items.length = this.currentBufferSize;
//     // }
//     this.items[this.currentIndex++] = item;
//   }

//   processQueue2(procFN:(item:T)=>void, pullNew:boolean=false, maxItems:number=Infinity) {
//     let processedItems = 0;
//     let numItems = this.currentIndex;
//     let itemsToKeep = [];
//     //console.log(processedItems, numItems, pullNew, (this.currentIndex))
//     while (processedItems < numItems) {
//       let item = this.items[processedItems];
//       let done;
//       if(!item) {
//         done = true;
//       } else {
//         done = item();
//       }
//       if(done!==false) {
//         itemsToKeep.push(item);
//       }
//       processedItems++;
//     }

//     this.items.splice(0, processedItems);
//     this.items = this.items.concat(itemsToKeep)


//     this.currentIndex = this.currentIndex - processedItems + itemsToKeep.length;
//     console.log("done processing", this.items.length)
//   }

//   processQueue(procFN:(item:T)=>void, pullNew:boolean=false, maxItems:number=Infinity) {
//     let processedItems = 0;
//     let numItems = this.currentIndex;
//     let lastStoredIndex = 0;

//     console.log("start que", processedItems, numItems)
//     while (processedItems < numItems) {
//       let item = this.items[processedItems];
//       let done;
//       if(!item) {
//         console.log("item doesn't exist")
//         done = true;
//       } else {
//         done = item();
//       }

//       if(processedItems > 100000){
//         console.log("breaking, we're too high", done)
//         break;
//       }

//       if(done!==false) {
//         let numToDelete = processedItems - lastStoredIndex;
//         //console.log('removing stuff', lastStoredIndex, processedItems, numToDelete, done)
//         this.items.splice(lastStoredIndex, numToDelete);
//         this.currentIndex -= numToDelete;
//         numItems = this.currentIndex;
//         processedItems = 0;
//       } else {
//         lastStoredIndex = processedItems
//       }
//       processedItems++;
//     }

//     console.log("done processing", this.items.length)
//   }
// }

// class fifoArray_old<T> {
//   items:T[];
//   bufferGrowSize;

//   private currentIndex;
//   private currentBufferSize;
//   private bufferInitialSize;

//   get bufferSize() {
//     return this.currentBufferSize
//   }

//   constructor(bufferInitialSize=10000000, bufferGrowSize = 1000000) {
//     this.bufferInitialSize = bufferInitialSize;
//     this.bufferGrowSize = bufferGrowSize;
//     this.items = Array(this.bufferInitialSize);
//     this.currentBufferSize = this.bufferInitialSize;
//     this.currentIndex = 0;
//   }

//   addItem(item:T) {
//     // if(this.currentIndex > this.currentBufferSize) {
//     //   //console.log("fifo buffer increased by:", this.bufferGrowSize, ", new size:", this.currentBufferSize + this.bufferGrowSize, "current index", this.currentIndex);
//     //   this.currentBufferSize = this.currentBufferSize + this.bufferGrowSize;
//     //   this.items.length = this.currentBufferSize;
//     // }
//     this.items[this.currentIndex++] = item;
//   }

//   processQueue2(procFN:(item:T)=>void, pullNew:boolean=false, maxItems:number=Infinity) {
//     let processedItems = 0;
//     let numItems = this.currentIndex;
//     const notDone = () => {
//       return
//     }
//     const notOverMaxRuns = () => processedItems < maxItems
//     //console.log(processedItems, numItems, pullNew, (this.currentIndex))
//     while (
//       (
//         (processedItems < numItems || (pullNew && (numItems = this.currentIndex)))
//       )  && notOverMaxRuns()
//     ) {
//       let item = this.items[processedItems];
//       procFN(item);
//       processedItems++;
//     }
//     this.items.splice(0, processedItems);
//     this.currentIndex -= processedItems;
//   }

//   processQueue(procFN:(item:T)=>void, pullNew:boolean=false, maxItems:number=Infinity) {
//     let processedItems = 0;
//     let numItems = this.currentIndex;
//     const gotNew = () => {
//       if(pullNew && numItems != this.currentIndex) {
//         numItems = this.currentIndex;
//         return true;
//       }
//       return false;
//     }
//     const notDone = () => {
//       return processedItems < numItems || gotNew()
//     }
//     while (notDone() && processedItems < maxItems) {
//       let item = this.items[processedItems];
//       procFN(item);
//       processedItems++;
//     }
//     this.items.splice(0, processedItems);
//     this.currentIndex -= processedItems;
//   }
// }









// class taskQueue {
//   tasks:Function[];
//   microTasks:Function[];
//   tasks2: Set<Function>;
//   microTasks2: Set<Function>;

//   tasks3:Function[];
//   microTasks3:Function[];

//   name: string;
//   tickPhase: tickPhases;
//   priority: number = 0;
//   maxTasksPerTick: number = Infinity;
//   maxMicroTasksPerTask: number = Infinity;
//   maxMicroTasksAtEndOfTick: number = Infinity;

//   _numTasks3 = 0;
//   _numTasks = 0;
//   _taskBufferSize = BUFFER_SIZE3;
//   _numTaskBufferUps = 1;
//   _numMicroTasks = 0;
//   _numMicroBufferUps = 0;


//   reset() {
//     this.tasks =  Array(this._taskBufferSize);
//     this.microTasks =  Array();

//     this.tasks2 = new Set();
//     this.microTasks2 = new Set();

//     this.tasks3 =  Array(BUFFER_SIZE3);
//     //this.microTasks3 =  Array(BUFFER_SIZE3);

//     this._numTasks = 0;
//     this._numTasks3 = 0;
//     this._numMicroTasks = 0;

//     //this._numTaskBufferUps = 1;
//     //this._taskBufferSize = BUFFER_SIZE3;
//   }

//   constructor(name: string, priority: number = 0, tickPhase: tickPhases = tickPhases.POST_TICK) {
//     this.name = name;
//     this.tickPhase = tickPhase;
//     this.priority = priority;
//     if (this.tickPhase == tickPhases.PRE_TICK) {
//       //preTickQueues.push(this);
//     }
//     if (this.tickPhase == tickPhases.POST_TICK) {
//       //postTickQueues.push(this);
//     }
//     this.tasks =  Array(BUFFER_SIZE);
//     this.microTasks =  Array(BUFFER_SIZE);

//     this.tasks2 = new Set();
//     this.microTasks2 = new Set();

//     this.tasks3 =  Array(BUFFER_SIZE3);
//     this.microTasks3 =  Array(BUFFER_SIZE3);
//     this.reset();
//   }

//   queueTask(task: Function) {
//     // if(this._taskBufferSize <= this._numTasks) {
//     //   console.log("buffer size:", this.tasks.length, this._numTasks, this._taskBufferSize);
//     //   //we're out of buffer
//     //   //this._numTaskBufferUps += this._numTasks;
//     //   //let tasks = this.tasks;


//     //   //let newBufferSize = Math.ceil(Math.pow(BUFFER_SIZE3, this._numTaskBufferUps))
//     //   let newBufferSize = BUFFER_SIZE
//     //   this.tasks.length = this.tasks.length + newBufferSize;
//     //   //this.tasks = this.tasks.concat(Array(newBufferSize));
//     //   console.log("pc buffer increased by:", newBufferSize, ", new size:", this.tasks.length, "current index", this._numTasks);
//     //   this._taskBufferSize += newBufferSize;
//     // }
//     //this.tasks[this.tasks.length] = task;
//     this.tasks[this._numTasks] = task;
//     this._numTasks++;
//   }
//   queueTask2(task: Function) {
//     this.tasks2.add(task);
//   }
//   queueTask3(task: Function) {
//     // if(this._taskBufferSize <= this._numTasks) {
//     //   //console.log("buffer size:", this.tasks3.length, this._numTasks, this._taskBufferSize);
//     //   //we're out of buffer
//     //   //this._numTaskBufferUps += this._numTasks;
//     //   //let tasks = this.tasks3;


//     //   //let newBufferSize = Math.ceil(Math.pow(BUFFER_SIZE3, this._numTaskBufferUps))
//     //   let newBufferSize = BUFFER_SIZE3
//     //   this.tasks3.length = this.tasks3.length + newBufferSize;
//     //   //this.tasks3 = this.tasks3.concat(Array(newBufferSize));
//     //   //console.log("pc buffer increased by:", newBufferSize, ", new size:", this.tasks3.length, "current index", this._numTasks);
//     //   this._taskBufferSize += newBufferSize;
//     // }
//     //this.tasks3[this.tasks3.length] = task;
//     this.tasks3[this._numTasks3] = task;
//     this._numTasks3++;

//   }
//   queueMicroTask(microTask: Function) {
//     this.microTasks.push(microTask);
//   }
//   queueMicroTask2(microTask: Function) {
//     this.microTasks2.add(microTask);
//   }
//   queueMicroTask3(microTask: Function) {
//     this.microTasks3[this._numMicroTasks] = microTask;
//     this._numMicroTasks++;
//   }



//   run() {
//     this.runTasks();
//     this.runMicroTasks(this.maxMicroTasksAtEndOfTick);
//   }


//   runTasks() {
//     let currentTask = 0;
//     let numTasks = this._numTasks;
//     let itemsToKeep:Function[] = []
//     console.log('running tasks', numTasks)
//     const notOverMaxRuns = () => currentTask <= this.maxTasksPerTick;
//     //no outter while loop cuz we only want to run the tasks that existed when we started.
//     while (currentTask < numTasks && notOverMaxRuns()) {
//       let task = this.tasks[currentTask];
//       let done;
//       if(!task) {
//         done = true;
//       } else {
//         done = task();
//       }
//       if(done===false) {
//         itemsToKeep.push(task)
//       }
//       currentTask++;
//       //this.runMicroTasks(this.maxMicroTasksPerTask)
//     }
//     this.tasks.splice(0, currentTask);
//     this._numTasks = this._numTasks - currentTask;
//     itemsToKeep.forEach(item=>{
//       this.queueTask(item);
//     })
//   }
//   runTasks3() {
//     let currentTask = 0;
//     let numTasks = this._numTasks3;
//     let itemsToKeep:Function[] = []
//     console.log('running tasks3', numTasks)
//     const notOverMaxRuns = () => currentTask <= this.maxTasksPerTick;
//     //no outter while loop cuz we only want to run the tasks that existed when we started.
//     while (currentTask < numTasks && notOverMaxRuns()) {
//       let task = this.tasks3[currentTask];
//       let done;
//       if(!task) {
//         console.log('task doesnt exist??', currentTask, this._numTasks3)
//         done = true;
//       } else {
//         done = task();
//       }
//       if(done===false) {
//         itemsToKeep.push(task)
//       }
//       currentTask++;
//       //this.runMicroTasks(this.maxMicroTasksPerTask)
//     }
//     this.tasks3.splice(0, currentTask);
//     this._numTasks3 = numTasks - currentTask;
//     itemsToKeep.forEach(item=>{
//       this.queueTask3(item);
//     })
//   }

//   runTasks2() {
//     let currentTask = 0;
//     const overMaxRuns = () => currentTask > this.maxTasksPerTick;
//     //console.log("--------------running tasks--------------", this.tasks.size)

//     let tasks = this.tasks2;
//     this.tasks2 = new Set();


//     //run each task
//     tasks.forEach(task => {
//       if (overMaxRuns()) {
//         console.log(this.name, "over runs!, skipping till next tick", currentTask)
//         return;
//       }
//       //console.log("running task", currentTask)
//       let done = task();
//       if(done!==false) {//delete task if we're done
//         //console.log("killing task", done, currentTask)
//         tasks.delete(task);
//       }

//       currentTask++;
//       //this.runMicroTasks2(this.maxMicroTasksPerTask)
//     })

//     tasks.forEach(t=>{
//       this.tasks2.add(t);
//     })

//     //console.log("--------------END running tasks--------------", this.tasks.size, "ran", currentTask)
//   }


//   runMicroTasks2(maxRuns: number = Infinity) {
//     if(this.microTasks2.size==0)
//       return;
//     let currentMicroTask = 0;
//     const overMaxRuns = () => currentMicroTask > maxRuns
//     //console.log("--------------running Mircotasks--------------", this.microTasks.size)
//     //run each task
//     this.microTasks2.forEach(microTask => {
//       if (overMaxRuns()) {
//         console.log(this.name, "over runs!, skipping till next tick", currentMicroTask, maxRuns)
//         return;
//       }
//       //console.log("running task", currentTask)
//       let done = microTask();
//       if(done !== false)
//         this.microTasks2.delete(microTask);
//       currentMicroTask++;
//     })

//     //console.log("--------------END running Mircotasks--------------", this.microTasks.size, "ran", currentMicroTask)
//     // let currentMicroTask = 0;
//     // let numMicroTasks;
//     // const notOverMaxRuns = () => currentMicroTask <= maxRuns
//     // while (currentMicroTask < (numMicroTasks = this.microTasks.length) && notOverMaxRuns()) {
//     //   //console.log("running batch of microtasks")
//     //   while (currentMicroTask < numMicroTasks && notOverMaxRuns()) {
//     //     let microTask = this.microTasks[currentMicroTask];
//     //     microTask();
//     //     currentMicroTask++;
//     //   }
//     // }
//     // this.microTasks.splice(0, currentMicroTask);

//   }
//   runMicroTasks(maxRuns:number = Infinity) {
//     let currentMicroTask = 0;
//     let numMicroTasks;
//     const notOverMaxRuns = () => currentMicroTask <= maxRuns
//     while (currentMicroTask < (numMicroTasks = this.microTasks.length) && notOverMaxRuns()) {
//       //console.log("running batch of microtasks")
//       while (currentMicroTask < numMicroTasks && notOverMaxRuns()) {
//         let microTask = this.microTasks[currentMicroTask];
//         let done = microTask();
//         if(done === false) {
//           //they want to stay in the array, but we're kinda setup to kick em out at the end as a group.
//           //I guess just cut it now?
//           //prolly need to maintain two arrays or something
//           this.microTasks.splice(0, currentMicroTask);
//           currentMicroTask = 0;
//           numMicroTasks = this.microTasks.length;
//         }
//         currentMicroTask++;
//       }
//     }
//     this.microTasks.splice(0, currentMicroTask);
//   }
//   runMicroTasks3(maxRuns:number = Infinity) {
//     let currentMicroTask = 0;
//     let numMicroTasks;
//     const notOverMaxRuns = () => currentMicroTask <= maxRuns
//     while (currentMicroTask < (numMicroTasks = this.microTasks.length) && notOverMaxRuns()) {
//       //console.log("running batch of microtasks")
//       while (currentMicroTask < numMicroTasks && notOverMaxRuns()) {
//         let microTask = this.microTasks3[currentMicroTask];
//         let done = microTask();
//         if(done===false) {
//           this.microTasks3.splice(0, currentMicroTask);
//           currentMicroTask = 0;
//           numMicroTasks = this.microTasks3.length
//         }
//         currentMicroTask++;
//       }
//     }
//     this.microTasks3.splice(0, currentMicroTask);
//     this._numMicroTasks = 0;
//     //this._numMicroTasks = this.microTasks3.length
//   }

// }

// let q = new taskQueue("test");
// let fifoArray = new functionQueueArray();
// let fifoSet = new functionQueueSet();


// // doTest(1);
// // doTest(1);
// // doTest(10);
// // doTest(100);
// // doTest(1000);
// // doTest(10000);
// // doTest(100000);
// // doTest(1000000);
// // doTest(10000000);

// let p = 4;

//  doTests(p, 0, 10, 0, 3, 0);
//  doTests(p, 0, 10, 0, 3, 2);
//  doTests(p, 0, 10, 0, 3, 10);
// //  doTests(p, 0, 10000, 0, 1, 0);
// //  doTests(p, 0, 10000, 0, 1, 2);
// //  doTests(p, 0, 10000, 0, 1, 10);
// // doTests(p, 10);
// // doTests(p, 100);
// // doTests(p, 1000);
// // doTests(p, 10000);
// // doTests(p, 100000);
// // doTests(p, 1000000);

// function doTests(powers:number, startsWith:number, base:number=10, offset:number=0, startPow=0, reRunFreqDiv=3) {
//   console.log("===============================starting test==============================")
//   let pow = startPow;
//   let numToMake = 1;
//   for(let power=0;power<powers;power++) {
//     numToMake = offset+Math.pow(base, pow);
//     //console.log("making ", numToMake);
//     console.log("------------------------------------begin Test------------------------------------------------", numToMake, reRunFreqDiv)
//     doTest(numToMake, startsWith, reRunFreqDiv)
//     pow++;
//   }
// }


// function doTest(numToMake = 10, startWith = 0, reRunFreqDiv=3, debug=true, complexTasksToMake = 0, subTasksToMake = 0, microTasksPerTask = 0) {
//   let tasksToMake = numToMake;
//   let microTasksToMake = numToMake;

//   let doTask1 = false;
//   let doTask2 = false;
//   let doTask3 = false;

//   let doMicro1 = false;
//   let doMicro2 = false;
//   let doMicro3 = false;


//   let dummy = 0;

//   let startCopy = startWith;
//   const clearTest = () => {
//     dummy = 0;
//     fifoArray = new functionQueueArray();
//     fifoSet = new functionQueueSet();
//     q.reset();
//     // q.tasks = Array(BUFFER_SIZE);
//     // q.microTasks = Array(BUFFER_SIZE);
//     // q.tasks2 = new Set();
//     // q.microTasks2 = new Set();
//     // q.tasks3 = Array(BUFFER_SIZE3);
//     // q.microTasks3 = Array(BUFFER_SIZE3);
//     // q._numMicroTasks = q._numTasks = 0;
//     for(let i=0;i<startCopy;i++) {
//       let thing = ()=>{
//         dummy *= 1
//       }
//       q.queueTask(thing)
//       q.queueTask2(thing)
//       q.queueMicroTask(thing)
//       q.queueMicroTask2(thing)
//     }
//   }
//   //@ts-ignore
//   startWith += "-" + reRunFreqDiv

//   if(complexTasksToMake) {
//     console.time("add complex tasks");
//     for (let i = 0; i < complexTasksToMake; i++) {
//       q.queueTask(() => {
//         dummy += i;
//         //console.log("Task", i);
//         for (let j = 0; j < microTasksPerTask; j++) {
//           q.queueMicroTask(() => {
//             dummy += j;
//             //console.log("microTask", j, i)
//           });
//         }
//         for (let j = 0; j < subTasksToMake; j++) {
//           q.queueTask(() => {
//             dummy /= 3;
//             //console.log("subTask", j, i)
//             for (let j = 0; j < microTasksPerTask; j++) {
//               q.queueMicroTask(() => {
//                 dummy += 2;
//                 //console.log("subTask-microTask", j, i)
//               });
//             }
//           });
//         }
//       });
//     }
//     console.timeEnd("add complex tasks");

//     console.time("run complex Tasks");
//     q.runTasks();
//     q.runMicroTasks();
//     //console.log("after runTasks dummy=", dummy)
//     console.timeEnd("run complex Tasks");

//     console.time("run complex Tasks2");
//     q.runTasks();
//     q.runMicroTasks();
//     //console.log("after runTasks dummy=", dummy)
//     console.timeEnd("run complex Tasks2");


//     console.time("run complex MicroTasks");
//     q.runMicroTasks();
//     //console.log("after runMicroTasks dummy=", dummy)
//     console.timeEnd("run complex MicroTasks");
//   }


//   const makeDummyTask=(useTwo=false)=>{
//     return ()=>{
//       dummy += 1;

//       if(dummy%4==0) {

//         q.queueTask(()=>{
//           dummy += 2;
//         })

//       }
//       return true;
//       // if(dummy%2==0)
//       //   return false;//task isn't done
//       // return true;
//     }
//   }
//   const makeDummyTaskArray=(withDone=false)=>{
//     return ()=>{
//       dummy += 1;


//       if(reRunFreqDiv > 0 && dummy%reRunFreqDiv>0) {
//         if(withDone) {
//           return false;
//         } else {
//           fifoArray.addFunc(makeDummyTaskArray())
//         }

//       }
//       return true;
//       // if(dummy%2==0)
//       //   return false;//task isn't done
//       // return true;
//     }
//   }
//   const makeDummyTaskSet=(withDone=false)=>{
//     return ()=>{
//       dummy += 1;

//       if(reRunFreqDiv > 0 && dummy%reRunFreqDiv>0) {
//         if(withDone) {
//           return false;
//         } else {
//           fifoSet.addFunc(makeDummyTaskSet())
//         }

//       }
//       return true;
//       // if(dummy%2==0)
//       //   return false;//task isn't done
//       // return true;
//     }
//   }


//   let name = "none";

//   if(doTask1) {
//     name = makeName("task 1", numToMake, startWith)
//     clearTest();
//     console.time(name);
//     debug && console.time("add tasks");
//     for (let i = 0; i < tasksToMake; i++) {
//       q.queueTask(makeDummyTask());
//     }
//     debug && console.timeEnd("add tasks");

//     debug && console.time("runTasks");
//     q.runTasks();
//     //console.log("after runTasks2 dummy=", dummy)
//     debug && console.timeEnd("runTasks");

//     debug && console.time("runTasks");
//     q.runTasks();
//     //console.log("after runTasks2 dummy=", dummy)
//     debug && console.timeEnd("runTasks");

//     console.timeEnd(name);
//     //console.log(name, "done");
//     console.log("res:", "made:", numToMake, "dummy =", dummy)
//   }


//   if(doTask2) {
//     name = makeName("task 2", numToMake, startWith)
//     clearTest();
//     console.time(name);
//     debug && console.time("add tasks2");
//     for (let i = 0; i < tasksToMake; i++) {
//       q.queueTask2(makeDummyTask());
//     }
//     debug && console.timeEnd("add tasks2");

//     debug && console.time("runTasks2");
//     q.runTasks2();
//     //console.log("after runTasks2 dummy=", dummy)
//     debug && console.timeEnd("runTasks2");

//     debug && console.time("runTasks2");
//     q.runTasks2();
//     //console.log("after runTasks2 dummy=", dummy)
//     debug && console.timeEnd("runTasks2");

//     console.timeEnd(name);
//     //console.log(name, "done");
//     console.log("res:", "made:", numToMake, "dummy =", dummy)
//   }


//   if(doTask3) {
//     name = makeName("task 3", numToMake, startWith)
//     clearTest();
//     console.time(name);
//     debug && console.time("add tasks3");
//     for (let i = 0; i < tasksToMake; i++) {
//       q.queueTask3(makeDummyTask());
//     }
//     debug && console.timeEnd("add tasks3");

//     debug && console.time("runTasks3");
//     q.runTasks3();
//     //console.log("after runTasks2 dummy=", dummy)
//     debug && console.timeEnd("runTasks3");

//     debug && console.time("runTasks3");
//     q.runTasks3();
//     //console.log("after runTasks2 dummy=", dummy)
//     debug && console.timeEnd("runTasks3");

//     console.timeEnd(name);
//     //console.log(name, "done");
//     console.log("res:", "made:", numToMake, "dummy =", dummy)
//   }


//   if(doMicro1) {
//     name = makeName("micro 1", numToMake, startWith)
//     clearTest();
//     console.time(name);
//     debug && console.time("add micro tasks");
//     for (let i = 0; i < microTasksToMake; i++) {
//       q.queueMicroTask(makeDummyTask());
//     }
//     debug && console.timeEnd("add micro tasks");

//     debug && console.time("runMicroTasks");
//     q.runMicroTasks();
//     //console.log("after runMicroTasks2 dummy=", dummy)
//     debug && console.timeEnd("runMicroTasks");

//     debug && console.time("runMicroTasks");
//     q.runMicroTasks();
//     //console.log("after runMicroTasks2 dummy=", dummy)
//     debug && console.timeEnd("runMicroTasks");

//     console.timeEnd(name);
//     //console.log(name, "done");
//     console.log("res:", "made:", numToMake, "dummy =", dummy)
//   }

//   if(doMicro2) {
//     name = makeName("micro 2", numToMake, startWith)
//     clearTest();
//     console.time(name);
//     debug && console.time("add micro tasks2");
//     for (let i = 0; i < microTasksToMake; i++) {
//       q.queueMicroTask2(makeDummyTask());
//     }
//     debug && console.timeEnd("add micro tasks2");

//     debug && console.time("runMicroTasks2");
//     q.runMicroTasks2();
//     //console.log("after runMicroTasks2 dummy=", dummy)
//     debug && console.timeEnd("runMicroTasks2");

//     debug && console.time("runMicroTasks2");
//     q.runMicroTasks2();
//     //console.log("after runMicroTasks2 dummy=", dummy)
//     debug && console.timeEnd("runMicroTasks2");

//     console.timeEnd(name);
//     //console.log(name, "done");
//     console.log("res:", "made:", numToMake, "dummy =", dummy)
//   }

//   if(doMicro3) {
//     name = makeName("micro 3", numToMake, startWith)
//     clearTest();
//     console.time(name);
//     debug && console.time("add micro tasks3");
//     for (let i = 0; i < microTasksToMake; i++) {
//       q.queueMicroTask3(makeDummyTask());
//     }
//     debug && console.timeEnd("add micro tasks3");

//     debug && console.time("runMicroTasks3");
//     q.runMicroTasks3();
//     //console.log("after runMicroTasks2 dummy=", dummy)
//     debug && console.timeEnd("runMicroTasks3");

//     debug && console.time("runMicroTasks3");
//     q.runMicroTasks3();
//     //console.log("after runMicroTasks2 dummy=", dummy)
//     debug && console.timeEnd("runMicroTasks3");

//     console.timeEnd(name);
//     //console.log(name, "done");
//     console.log("res:", "made:", numToMake, "dummy =", dummy)
//   }
//  //----------------------------------------------------------------------------
//   clearTest();
//   let testName = "tasks? - fifo array (current) with done-";
//   name = makeName(testName, numToMake, startWith)
//   console.time(name)
//   debug && console.time(testName+"add");
//   for(let i=0;i<tasksToMake;i++) {
//     fifoArray.addFunc(makeDummyTaskArray(true))
//   }
//   debug && console.timeEnd(testName+"add")

//   debug && console.time(testName+"run");
//   fifoArray.processCurrentQueueWithDone()
//   debug && console.timeEnd(testName+"run");

//   debug && console.time(testName+"run");
//   fifoArray.processCurrentQueueWithDone();
//   fifoArray.processCurrentQueueWithDone();
//   fifoArray.processCurrentQueueWithDone();
//   fifoArray.processCurrentQueueWithDone();
//   fifoArray.processCurrentQueueWithDone();
//   fifoArray.processCurrentQueueWithDone();
//   fifoArray.processCurrentQueueWithDone();
//   fifoArray.processCurrentQueueWithDone();
//   debug && console.timeEnd(testName+"run");
//   console.timeEnd(name)
//   //console.log(name, "done");
//   console.log("res:", "made:", numToMake, "dummy =", dummy)

//   clearTest();
//   testName = "fifo array (current)-";
//   name = makeName(testName, numToMake, startWith)
//   console.time(name)
//   debug && console.time(testName+"add");
//   for(let i=0;i<tasksToMake;i++) {
//     fifoArray.addFunc(makeDummyTaskArray())
//   }
//   debug && console.timeEnd(testName+"add")

//   debug && console.time(testName+"run");
//   fifoArray.processCurrentQueue()
//   debug && console.timeEnd(testName+"run");

//   debug && console.time(testName+"run");
//   fifoArray.processCurrentQueue();
//   fifoArray.processCurrentQueue();
//   fifoArray.processCurrentQueue();
//   fifoArray.processCurrentQueue();
//   fifoArray.processCurrentQueue();
//   fifoArray.processCurrentQueue();
//   fifoArray.processCurrentQueue();
//   fifoArray.processCurrentQueue();
//   debug && console.timeEnd(testName+"run");
//   console.timeEnd(name)
//   //console.log(name, "done");
//   console.log("res:", "made:", numToMake, "dummy =", dummy)


//   clearTest();
//   testName = "fifo set (current) with done-";
//   name = makeName(testName, numToMake, startWith)
//   console.time(name)
//   debug && console.time(testName+"add");
//   for(let i=0;i<tasksToMake;i++) {
//     fifoSet.addFunc(makeDummyTaskSet(true))
//   }
//   debug && console.timeEnd(testName+"add")

//   debug && console.time(testName+"run");
//   fifoSet.processCurrentQueueWithDone()
//   debug && console.timeEnd(testName+"run");

//   debug && console.time(testName+"run");
//   fifoSet.processCurrentQueueWithDone();
//   fifoSet.processCurrentQueueWithDone();
//   fifoSet.processCurrentQueueWithDone();
//   fifoSet.processCurrentQueueWithDone();
//   fifoSet.processCurrentQueueWithDone();
//   fifoSet.processCurrentQueueWithDone();
//   fifoSet.processCurrentQueueWithDone();
//   fifoSet.processCurrentQueueWithDone();
//   debug && console.timeEnd(testName+"run");

//   console.timeEnd(name)
//   //console.log(name, "done");
//   console.log("res:", "made:", numToMake, "dummy =", dummy)

//   clearTest();
//   testName = "fifo set (current)-";
//   name = makeName(testName, numToMake, startWith)

//   console.time(name)
//   debug && console.time(testName+"add");
//   for(let i=0;i<tasksToMake;i++) {
//     fifoSet.addFunc(makeDummyTaskSet())
//   }
//   debug && console.timeEnd(testName+"add")

//   debug && console.time(testName+"run");
//   fifoSet.processCurrentQueue()
//   debug && console.timeEnd(testName+"run");

//   debug && console.time(testName+"run");
//   fifoSet.processCurrentQueue();
//   fifoSet.processCurrentQueue();
//   fifoSet.processCurrentQueue();
//   fifoSet.processCurrentQueue();
//   fifoSet.processCurrentQueue();
//   fifoSet.processCurrentQueue();
//   fifoSet.processCurrentQueue();
//   fifoSet.processCurrentQueue();
//   debug && console.timeEnd(testName+"run");

//   console.timeEnd(name)
//   //console.log(name, "done");
//   console.log("res:", "made:", numToMake, "dummy =", dummy)


//   //---------------------------------------------------------------------------------------------------------
//   console.log("//---------------------------------------------------------------------------------------------------------")
//   clearTest();
//   testName = "fifo array (full) with done-";
//   name = makeName(testName, numToMake, startWith)
//   console.time(name)
//   debug && console.time(testName+"add");
//   for(let i=0;i<tasksToMake;i++) {
//     fifoArray.addFunc(makeDummyTaskArray(true))
//   }
//   debug && console.timeEnd(testName+"add")

//   debug && console.time(testName+"run");
//   fifoArray.processFullQueueWithDone()
//   debug && console.timeEnd(testName+"run");

//   debug && console.time(testName+"run");
//   fifoArray.processFullQueueWithDone();
//   fifoArray.processFullQueueWithDone();
//   fifoArray.processFullQueueWithDone();
//   fifoArray.processFullQueueWithDone();
//   fifoArray.processFullQueueWithDone();
//   fifoArray.processFullQueueWithDone();
//   fifoArray.processFullQueueWithDone();
//   fifoArray.processFullQueueWithDone();
//   debug && console.timeEnd(testName+"run");
//   console.timeEnd(name)
//   //console.log(name, "done");
//   console.log("res:", "made:", numToMake, "dummy =", dummy)

//   clearTest();
//   testName = "micros? - fifo array (full)-";
//   name = makeName(testName, numToMake, startWith)
//   console.time(name)
//   debug && console.time(testName+"add");
//   for(let i=0;i<tasksToMake;i++) {
//     fifoArray.addFunc(makeDummyTaskArray())
//   }
//   debug && console.timeEnd(testName+"add")

//   debug && console.time(testName+"run");
//   fifoArray.processFullQueue()
//   debug && console.timeEnd(testName+"run");

//   debug && console.time(testName+"run");
//   fifoArray.processFullQueue();
//   fifoArray.processFullQueue();
//   fifoArray.processFullQueue();
//   fifoArray.processFullQueue();
//   fifoArray.processFullQueue();
//   fifoArray.processFullQueue();
//   fifoArray.processFullQueue();
//   fifoArray.processFullQueue();
//   debug && console.timeEnd(testName+"run");
//   console.timeEnd(name)
//   //console.log(name, "done");
//   console.log("res:", "made:", numToMake, "dummy =", dummy)


//   clearTest();
//   testName = "fifo set (full) with done-";
//   name = makeName(testName, numToMake, startWith)

//   console.time(name)
//   debug && console.time(testName+"add");
//   for(let i=0;i<tasksToMake;i++) {
//     fifoSet.addFunc(makeDummyTaskSet(true))
//   }
//   debug && console.timeEnd(testName+"add")

//   debug && console.time(testName+"run");
//   fifoSet.processFullQueueWithDone()
//   debug && console.timeEnd(testName+"run");

//   debug && console.time(testName+"run");
//   fifoSet.processFullQueueWithDone();
//   fifoSet.processFullQueueWithDone();
//   fifoSet.processFullQueueWithDone();
//   fifoSet.processFullQueueWithDone();
//   fifoSet.processFullQueueWithDone();
//   fifoSet.processFullQueueWithDone();
//   fifoSet.processFullQueueWithDone();
//   fifoSet.processFullQueueWithDone();
//   debug && console.timeEnd(testName+"run");

//   console.timeEnd(name)
//   //console.log(name, "done");
//   console.log("res:", "made:", numToMake, "dummy =", dummy)

//   clearTest();
//   testName = "fifo set (full)-";
//   name = makeName(testName, numToMake, startWith)

//   console.time(name)
//   debug && console.time(testName+"add");
//   for(let i=0;i<tasksToMake;i++) {
//     fifoSet.addFunc(makeDummyTaskSet())
//   }
//   debug && console.timeEnd(testName+"add")

//   debug && console.time(testName+"run");
//   fifoSet.processFullQueue()
//   debug && console.timeEnd(testName+"run");

//   debug && console.time(testName+"run");
//   fifoSet.processFullQueue();
//   fifoSet.processFullQueue();
//   fifoSet.processFullQueue();
//   fifoSet.processFullQueue();
//   fifoSet.processFullQueue();
//   fifoSet.processFullQueue();
//   fifoSet.processFullQueue();
//   fifoSet.processFullQueue();
//   debug && console.timeEnd(testName+"run");

//   console.timeEnd(name)
//   //console.log(name, "done");
//   console.log("res:", "made:", numToMake, "dummy =", dummy)



// }

// function makeName(baseName:string, numToMake: number, startWith: number) {
//   let numStr = Array(9 - String(numToMake).length).join(" ") + numToMake;
//   let startStr = Array(9 - String(startWith).length).join(" ") + startWith
//   let name = Array(40 - baseName.length).join("-") + baseName;
//   return numStr + startStr + name;
// }

