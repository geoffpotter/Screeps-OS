import Queue from './base';
import Thread from '../thread';
import Kernel from '../kernel';
import Logger from 'shared/utils/logger';

const logger = new Logger('INeRT.queue.types');
logger.color = 'green';

export default class INeRTQueues {
  private queueNames: string[];
  private queueMap: { [key: string]: Queue };
  private currentQueue: number = 0;

  constructor() {
    this.queueNames = [
      'init', 'military', 'empire', 'rooms', 'actionSearch',
      'creepAct', 'creepMove', 'pathing', 'work'
    ];
    this.queueMap = {};
    for (const name of this.queueNames) {
      this.queueMap[name] = new Queue(name);
    }
  }

  getQueue(name: string): Queue {
    const queue = this.queueMap[name];
    if (!queue) {
      throw new Error(`Getting invalid queue: ${name}`);
    }
    return queue;
  }

  addThread(thread: Thread): void {
    this.currentQueue = 0;
    if (!(thread instanceof Thread)) {
      throw new Error(`kernel adding invalid thread ${thread}`);
    }
    const queue = this.queueMap[thread.targetQueue];
    if (!queue) {
      throw new Error(`${thread.process.name} thinks it belongs to an invalid queue: ${thread.targetQueue}`);
    }
    queue.addThread(thread);
  }

  removeThread(thread: Thread): void {
    this.currentQueue = 0;
    if (!(thread instanceof Thread)) {
      throw new Error(`kernel removing invalid thread ${thread}`);
    }
    const queue = this.queueMap[thread.targetQueue];
    if (!queue) {
      throw new Error(`${thread.process.name} thinks it belongs to an invalid queue: ${thread.targetQueue}`);
    }
    queue.removeThread(thread);
  }

  getNextThread(): Thread | false {
    const queueName = this.queueNames[this.currentQueue];
    const queue = this.queueMap[queueName];
    if (!queue) {
      logger.log(JSON.stringify(this.queueMap));
      throw new Error(`${queueName} queue doesn't exist.. you broke somethin, dumbass.`);
    }

    const thread = queue.getNextThread();
    if (!thread) {
      if (this.currentQueue >= (this.queueNames.length - 1)) {
        return false;
      }
      this.currentQueue++;
      return this.getNextThread();
    }
    return thread;
  }

  initTick(kernel: Kernel): void {
    this.currentQueue = 0;
    logger.log(`setting cpu settings by defcon ${kernel.cpuDefcon}`);
    switch (kernel.cpuDefcon) {
      case 0:
      case 1:
      case 2:
        this.getQueue('pathing').cpuLimit = Game.cpu.limit * 0.05;
        this.getQueue('creepAct').cpuLimit = Game.cpu.limit * 0.1;
        break;
      case 3:
      case 4:
      case 5:
        this.getQueue('pathing').cpuLimit = Game.cpu.limit * 0.2;
        this.getQueue('creepAct').cpuLimit = Game.cpu.limit * 0.2;
        break;
      case 6:
      case 7:
      case 8:
        this.getQueue('pathing').cpuLimit = Game.cpu.limit * 0.3;
        this.getQueue('creepAct').cpuLimit = Game.cpu.tickLimit * 0.8;
        break;
      case 9:
      case 10:
      default:
        this.getQueue('creepAct').runEveryX = 1;
        this.getQueue('creepAct').cpuLimit = Game.cpu.limit * 0.8;
        break;
    }

    for (const queue of Object.values(this.queueMap)) {
      queue.initTick();
    }
  }

  endTick(): void {
    for (const queue of Object.values(this.queueMap)) {
      queue.endTick();
      queue.cpuUsed.update(queue.cpuTickBucket);
    }
  }

  displayQueueThreads(): void {
    for (const queue of Object.values(this.queueMap)) {
      logger.log(`${queue.name} (${queue.threads.length}) ${queue.cpuUsed.getShortAvg()}`);
    }
  }
}
