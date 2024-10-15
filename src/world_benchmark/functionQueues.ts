
import benchmark, { benchmarkAsync } from "shared/utils/profiling/benchmark";
import sleep from "shared/polyfills/sleep";

import functionQueueArray from "shared/utils/queues/functionQueueArray";
import functionQueueSet from "shared/utils/queues/functionQueueSet";
import wasteCpu from "../shared/utils/profiling/wasteCPU";
import { profiler, profile, profileClass } from "shared/utils/profiling/profiler";


// TODO: add async benchmarks




export class baseBenchmark<QueueType extends functionQueueArray|functionQueueSet> {
    total:number;
    queue:QueueType;
    runQueue: (queue:QueueType) => void;
    tasksStayIn: boolean;

    constructor(public numFuncs:number, public cpuToWaste:number, queue:QueueType, tasksStayIn:boolean, runQueue: (queue:QueueType) => void) {
        this.numFuncs = numFuncs;
        this.cpuToWaste = cpuToWaste;
        this.queue = queue;
        this.total = 0;
        this.tasksStayIn = tasksStayIn;
        this.runQueue = runQueue;

        if (this.tasksStayIn) {
            for(let i = 0; i < this.numFuncs; i++) {
                this.queue.addFunc(()=>{
                    let waste = this.cpuToWaste;
                    // if (i % 10 === 0) {
                    //     waste = waste * 10;
                    // }
                    // profiler.pauseCall(this.queue.constructor.name)
                    // profiler.pauseCall();
                    this.total += wasteCpu(this.cpuToWaste);
                    // profiler.resumeCall();
                    // profiler.resumeCall(this.queue.constructor.name)
                    return false;
                })
            }
        }
    }

    run() {
        // console.log("running", this.queue.constructor.name);
        this.total = 0;
        if (this.tasksStayIn) {
            let currentSize = this.queue.funcs instanceof Set ? this.queue.funcs.size : this.queue.funcs.length;
            if (currentSize !== this.numFuncs) {
                throw new Error("Queue has the wrong number of functions");
                // queue didn't finish running last time it was run, let's finish it
            }
            // profiler.startCall(this.queue.constructor.name);
        } else {
            let currentSize = this.queue.funcs instanceof Set ? this.queue.funcs.size : this.queue.funcs.length;
            if (currentSize > 0) {
                throw new Error("Queue is not empty");
            }
            // profiler.startCall(this.queue.constructor.name);
            for(let i = 0; i < this.numFuncs; i++) {
                this.queue.addFunc(()=>{
                    // profiler.pauseCall(this.queue.constructor.name)
                    // profiler.pauseCall();
                    this.total += wasteCpu(this.cpuToWaste);
                    // profiler.resumeCall();
                    // profiler.resumeCall(this.queue.constructor.name)
                    return true;
                })
            }
        }
        this.runQueue(this.queue);
        // profiler.endCall(this.queue.constructor.name);
        return this.total;
    }

}

export default async function(iter:number, numFuncs:number, cpuToWaste:number ) {
    let initialNumFuncs = 0;
    let maxCpu:number|false = false;
    let autoBenchmarks = [];
    for(let type of ["array", "set"]) {
        if (type === "array") {
            let taskStayInRunners = [
                function testStayIn1(queue:functionQueueArray) {
                    queue.processQueue_optimized_stayingInArray();
                    return 1;
                },
                function testStayIn2(queue:functionQueueArray) {
                    queue.processQueue_optimized_leavingArray();
                    return 1;
                },
                function testStayIn3(queue:functionQueueArray) {
                    queue.processCurrentQueueWithDone();
                    return 1;
                },
                function testStayIn4(queue:functionQueueArray) {
                    queue.processFullQueueWithDone();
                    return 1;
                }
            ]
            let taskLeaveRunners = [
                function testLeave1(queue:functionQueueArray) {
                    queue.processCurrentQueue();
                    return 1;
                },
                function testLeave2(queue:functionQueueArray) {
                    queue.processFullQueue();
                    return 1;
                }
            ];
            for(let stay of taskStayInRunners) {
                let queue = new functionQueueArray(initialNumFuncs, false, maxCpu);
                let benchmark = new baseBenchmark(numFuncs, cpuToWaste, queue, true, stay);
                let name = `stay_${stay.name}_${type}`;
                let benchFunc = ()=>{
                    return benchmark.run();
                }
                // @ts-ignore
                benchFunc.benchName = name;
                autoBenchmarks.push(benchFunc);
            }
            for(let leave of taskLeaveRunners) {
                let queue = new functionQueueArray(initialNumFuncs, false, maxCpu);
                let benchmark = new baseBenchmark(numFuncs, cpuToWaste, queue, false, leave);
                let name = `leave_${leave.name}_${type}`;
                let benchFunc = ()=>{
                    return benchmark.run();
                }
                // @ts-ignore
                benchFunc.benchName = name;
                autoBenchmarks.push(benchFunc);
            }
        } else {
            let taskStayInRunners = [
                function testStayIn1(queue:functionQueueSet) {
                    queue.processQueue_optimized_stayingInSet();
                    return 1;
                },
                function testStayIn2(queue:functionQueueSet) {
                    queue.processQueue_optimized_leavingSet();
                    return 1;
                },
                function testStayIn3(queue:functionQueueSet) {
                    queue.processCurrentQueueWithDone();
                    return 1;
                },
                function testStayIn4(queue:functionQueueSet) {
                    queue.processFullQueueWithDone();
                    return 1;
                }
            ]
            let taskLeaveRunners = [
                function testLeave1(queue:functionQueueSet) {
                    queue.processCurrentQueue();
                },
                function testLeave2(queue:functionQueueSet) {
                    queue.processFullQueue();
                }
            ]
            for(let stay of taskStayInRunners) {
                let queue = new functionQueueSet(false, maxCpu);
                let benchmark = new baseBenchmark(numFuncs, cpuToWaste, queue, true, stay);
                let name = `stay_${stay.name}_${type}`;
                let benchFunc = ()=>{
                    return benchmark.run();
                }
                // @ts-ignore
                benchFunc.benchName = name;
                autoBenchmarks.push(benchFunc);
            }
            for(let leave of taskLeaveRunners) {
                let queue = new functionQueueSet(false, maxCpu);
                let benchmark = new baseBenchmark(numFuncs, cpuToWaste, queue, false, leave);
                let name = `leave_${leave.name}_${type}`;
                let benchFunc = ()=>{
                    return benchmark.run();
                }
                // @ts-ignore
                benchFunc.benchName = name;
                autoBenchmarks.push(benchFunc);
            }
        }
    }
    await benchmarkAsync(autoBenchmarks, iter, true, 400);
    return;
    // let arr1 = new functionQueueArray(initialNumFuncs, false, maxCpu);
    // let arr2 = new functionQueueArray(initialNumFuncs, false, maxCpu);
    // let arr3 = new functionQueueArray(initialNumFuncs, false, maxCpu);
    // let arr4 = new functionQueueArray(initialNumFuncs, false, maxCpu);
    // let set1 = new functionQueueSet(false, maxCpu);
    // let set2 = new functionQueueSet(false, maxCpu);
    // let set3 = new functionQueueSet(false, maxCpu);
    // let set4 = new functionQueueSet(false, maxCpu);


    // let constant_stay = new baseBenchmark(numFuncs, cpuToWaste, arr1, true, (queue)=>{
    //     queue.processQueue_optimized_stayingInArray();
    // });
    // let constant_leave = new baseBenchmark(numFuncs, cpuToWaste, arr2, false, (queue)=>{
    //     queue.processQueue_optimized_leavingArray();
    // });
    // let dynamic_stay = new baseBenchmark(numFuncs, cpuToWaste, arr3, true, (queue)=>{
    //     queue.processQueue_optimized_stayingInArray();
    // });
    // let dynamic_leave = new baseBenchmark(numFuncs, cpuToWaste, arr4, false, (queue)=>{
    //     queue.processQueue_optimized_leavingArray();
    // });
    // let constant_stay_set = new baseBenchmark(numFuncs, cpuToWaste, set1, true, (queue)=>{
    //     queue.processQueue_optimized_stayingInSet();
    // });
    // let constant_leave_set = new baseBenchmark(numFuncs, cpuToWaste, set2, false, (queue)=>{
    //     queue.processQueue_optimized_leavingSet(); // 33
    //     // queue.processCurrentQueue();
    // });
    // let dynamic_stay_set = new baseBenchmark(numFuncs, cpuToWaste, set3, true, (queue)=>{
    //     queue.processQueue_optimized_stayingInSet();
    // });
    // let dynamic_leave_set = new baseBenchmark(numFuncs, cpuToWaste, set4, false, (queue)=>{
    //     queue.processQueue_optimized_leavingSet(); // 30
    //     // queue.processCurrentQueue();
    // });


    // let dynamic_benchmarks = [
    //     function testDynamicStayIn() {
    //         // profiler.startContext("testDynamicStayIn");
    //         let ret = dynamic_stay.run();
    //         // profiler.endContext("testDynamicStayIn");
    //         return ret;
    //     },
    //     function testDynamicLeave() {
    //         // profiler.startContext("testDynamicLeave");
    //         let ret = dynamic_leave.run();
    //         // profiler.endContext("testDynamicLeave");
    //         return ret;
    //     },
    //     function testDynamicStayInSet() {
    //         // profiler.startContext("testDynamicStayInSet");
    //         let ret = dynamic_stay_set.run();
    //         // profiler.endContext("testDynamicStayInSet");
    //         return ret;
    //     },
    //     function testDynamicLeaveSet() {
    //         // profiler.startContext("testDynamicLeaveSet");
    //         let ret = dynamic_leave_set.run();
    //         // profiler.endContext("testDynamicLeaveSet");
    //         return ret;
    //     }
    // ]
    // let constant_benchmarks = [
    //     function testConstantStayIn() {
    //         // profiler.startContext("testConstantStayIn");
    //         let ret = constant_stay.run();
    //         // profiler.endContext("testConstantStayIn");
    //         return ret;
    //     },
    //     function testConstantLeave() {
    //         // profiler.startContext("testConstantLeave");
    //         let ret = constant_leave.run();
    //         // profiler.endContext("testConstantLeave");
    //         return ret;
    //     },
    //     function testConstantStayInSet() {
    //         // profiler.startContext("testConstantStayInSet");
    //         let ret = constant_stay_set.run();
    //         // profiler.endContext("testConstantStayInSet");
    //         return ret;
    //     },
    //     function testConstantLeaveSet() {
    //         // profiler.startContext("testConstantLeaveSet");
    //         let ret = constant_leave_set.run();
    //         // profiler.endContext("testConstantLeaveSet");
    //         return ret;
    //     },
    // ]

    // let allBenchmarks = constant_benchmarks.concat(dynamic_benchmarks);
    // let numTests = allBenchmarks.length;
    // console.log("should be calling work function", iter * numFuncs * numTests, "times", numFuncs * numTests, "for per tick");
    // // benchmark(allBenchmarks, iter, false);
    // let profile = true;
    // await benchmarkAsync(constant_benchmarks, iter, profile, 400);
    // await benchmarkAsync(dynamic_benchmarks, iter, profile, 400);
    // // await benchmarkAsync([
    // //     async function testWasteCpu() {
    // //         let ret = wasteCpu(cpuToWaste);
    // //         await sleep(1);
    // //         return ret;
    // //     },
    // //     async function testWasteCpu2() {
    // //         let ret = wasteCpu(cpuToWaste);
    // //         await sleep(1);
    // //         return ret;
    // //     },
    // //     async function testWasteCpu3() {
    // //         let ret = wasteCpu(cpuToWaste);
    // //         await sleep(1);
    // //         return ret;
    // //     },
    // //     async function testWasteCpu4() {
    // //         let ret = wasteCpu(cpuToWaste);
    // //         await sleep(1);
    // //         return ret;
    // //     }
    // // ], iter, profile, 400);
    // return;
}

