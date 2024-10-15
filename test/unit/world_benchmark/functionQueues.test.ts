import { expect } from 'chai';
import { baseBenchmark } from '../../../src/world_benchmark/functionQueues';
import functionQueueArray from '../../../src/shared/utils/queues/functionQueueArray';

describe('Function Queues', () => {
  describe('baseBenchmark', () => {
    it('should initialize correctly', () => {
      const queue = new functionQueueArray(0);
      const benchmark = new baseBenchmark(100, 1000, queue, true, (q) => q.processQueue_optimized_stayingInArray());

      expect(benchmark.numFuncs).to.equal(100);
      expect(benchmark.cpuToWaste).to.equal(1000);
      expect(benchmark.tasksStayIn).to.be.true;
    });

    // Add more test cases here
  });
});
