import Thread from '../thread';
import Stat from 'shared/utils/stat';
import Logger from 'shared/utils/logger';

const logger = new Logger('INeRT.queue.base');
logger.color = 'grey';

export default class Queue {
  public threads: Thread[] = [];
  public cpuLimit: number | false = false;
  public cpuTickBucket: number = 0;
  public cpuUsed: Stat;
  public procsRun: Stat;
  public currentIndex: number = 0;
  public runEveryX: number = 1;

  constructor(public name: string) {
    this.cpuUsed = new Stat();
    this.procsRun = new Stat();
  }

  addThread(thread: Thread): void {
    if (!(thread instanceof Thread)) {
      throw new Error(`${this.name} adding invalid thread ${thread}`);
    }

    const proc = thread.process;
    if (proc.threads.indexOf(thread) !== -1) {
      throw new Error(`${proc.name} thread already running! ${thread}`);
    }
    proc.threads.push(thread);

    this.threads.push(thread);
  }

  removeThread(thread: Thread): void {
    if (!(thread instanceof Thread)) {
      throw new Error(`${this.name} removing invalid thread ${thread}`);
    }

    const proc = thread.process;
    if (proc.threads.indexOf(thread) === -1) {
      throw new Error(`${proc.name} thread not running! ${thread}`);
    }
    proc.threads = proc.threads.filter(t => t !== thread);

    this.threads = this.threads.filter(t => t !== thread);
  }

  getNextThread(): Thread | false {
    if (this.threads.length <= this.currentIndex) {
      return false;
    }

    if (this.cpuLimit !== false && this.cpuLimit <= this.cpuTickBucket) {
      logger.log(`${this.name} OVER QUEUE CPU LIMIT ${this.cpuTickBucket} ${this.cpuLimit}`);
      return false;
    }

    const thread = this.threads[this.currentIndex];
    this.currentIndex += this.runEveryX;
    if (thread && thread.suspend > 0) {
      thread.suspend--;
      return this.getNextThread();
    }
    return thread;
  }

  initTick(): void {
    this.currentIndex = Game.time % this.runEveryX;
    this.cpuTickBucket = 0;
  }

  endTick(): void {}

  getThreadNames(): string {
    return this.threads.map(thread =>
      `${thread.process.name}(${thread.process.cpuUsed.shortAvg})-${thread.method}`
    ).join(', ');
  }
}
