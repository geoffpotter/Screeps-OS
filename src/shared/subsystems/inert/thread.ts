import Process from './process';
import Kernel from './kernel';
import Stat from 'shared/utils/stat';
import Logger from 'shared/utils/logger';

const logger = new Logger('INeRT.thread');
logger.enabled = false;
logger.color = 'grey';

export default class Thread {
  public cpuUsed: Stat;
  public lastTickRun: number | false;
  public suspend: number;
  public finished: boolean;

  constructor(
    public process: Process,
    public method: string,
    public targetQueue: string
  ) {
    this.cpuUsed = new Stat();
    this.lastTickRun = false;
    this.suspend = 0;
    this.finished = false;
  }

  static DONE = 'done';
  static TICKDONE = 'tickdone';
  static HUNGRY = 'hungry';

  run(kernel: Kernel): string | number {
    logger.log(`running ${this.process.name} -> ${this.method}`);
    if (!(this.method in this.process)) {
      throw new Error(`${this.process.name} has no method ${this.method}`);
    }
    const ret = (this.process as any)[this.method](kernel);
    logger.log(`${this.process.name} got ${ret}`);
    this.lastTickRun = Game.time;
    if (Number.isInteger(ret)) {
      this.suspend = ret as number;
    }
    return ret;
  }

  toString(): string {
    return `${this.process.name}-${this.method}`;
  }

  toJSON(): any {
    const obj:any = { ...this };
    obj.process = this.process.name;
    return obj;
  }
}
