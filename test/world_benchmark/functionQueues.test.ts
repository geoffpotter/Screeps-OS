import { expect } from 'chai';
import functionQueueArray from "../../src/shared/utils/queues/functionQueueArray";
import functionQueueSet from "../../src/shared/utils/queues/functionQueueSet";

import wasteCpu from "../../src/shared/utils/profiling/wasteCPU";
import { baseBenchmark } from "../../src/world_benchmark/functionQueues";
describe('Function Queues Benchmark', () => {
  const numFuncs = 100;
  const cpuToWaste = 1000;

  describe('baseBenchmark', () => {
    it('should initialize correctly with tasks staying in', () => {
      const queue = new functionQueueArray(0);
      const benchmark = new baseBenchmark(numFuncs, cpuToWaste, queue, true, (q) => q.processQueue_optimized_stayingInArray());

      expect(benchmark.numFuncs).to.equal(numFuncs);
      expect(benchmark.cpuToWaste).to.equal(cpuToWaste);
      expect(benchmark.tasksStayIn).to.be.true;
      expect(benchmark.queue.funcs.length).to.equal(numFuncs);
    });

    it('should initialize correctly with tasks leaving', () => {
      const queue = new functionQueueArray(0);
      const benchmark = new baseBenchmark(numFuncs, cpuToWaste, queue, false, (q) => q.processQueue_optimized_leavingArray());

      expect(benchmark.numFuncs).to.equal(numFuncs);
      expect(benchmark.cpuToWaste).to.equal(cpuToWaste);
      expect(benchmark.tasksStayIn).to.be.false;
      expect(benchmark.queue.funcs.length).to.equal(0);
    });

    it('should run correctly with tasks staying in', () => {
      const queue = new functionQueueArray(0);
      const benchmark = new baseBenchmark(numFuncs, cpuToWaste, queue, true, (q) => q.processQueue_optimized_stayingInArray());

      const result = benchmark.run();
      expect(result).to.be.above(0);
      expect(benchmark.queue.funcs.length).to.equal(numFuncs);
    });

    it('should run correctly with tasks leaving', () => {
      const queue = new functionQueueArray(0);
      const benchmark = new baseBenchmark(numFuncs, cpuToWaste, queue, false, (q) => q.processQueue_optimized_leavingArray());

      const result = benchmark.run();
      expect(result).to.be.above(0);
      expect(benchmark.queue.funcs.length).to.equal(0);
    });
  });

  describe('Benchmark functions', () => {
    it('should run constant benchmarks', () => {
      // This is a simplified test. In a real scenario, you'd want to mock the benchmark function
      // and assert that it's called with the correct parameters.
      const constantBenchmarks = [
        'testConstantStayIn',
        'testConstantLeave',
        'testConstantStayInSet',
        'testConstantLeaveSet'
      ];

      constantBenchmarks.forEach(benchmarkName => {
        expect(() => global[benchmarkName]()).to.not.throw();
      });
    });

    it('should run dynamic benchmarks', () => {
      // Similar to the constant benchmarks test
      const dynamicBenchmarks = [
        'testDynamicStayIn',
        'testDynamicLeave',
        'testDynamicStayInSet',
        'testDynamicLeaveSet'
      ];

      dynamicBenchmarks.forEach(benchmarkName => {
        expect(() => global[benchmarkName]()).to.not.throw();
      });
    });
  });
});
