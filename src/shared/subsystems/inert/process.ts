import Kernel from './kernel';
import Thread from './thread';
import Stat from 'shared/utils/stat';
import Logger from 'shared/utils/logger';

const logger = new Logger('INeRT.process');
logger.enabled = false;
logger.color = 'grey';

export default class Process {
  public kernel: Kernel | undefined;
  public threads: Thread[] = [];
  public cpuUsed: Stat;
  public killed: boolean = false;
  public parentProc: Process | undefined;

  constructor(
    public name: string,
    public data: any = {}
  ) {
    this.cpuUsed = new Stat();
  }

  set memory(value: any) {
    value.lastTouch = Game.time;
    this.kernel!.memory.procMem[this.name] = value;
  }

  get memory(): any {
    if (!this.kernel!.memory.procMem[this.name]) {
      this.kernel!.memory.procMem[this.name] = {
        lastTouch: Game.time
      };
    }
    return this.kernel!.memory.procMem[this.name];
  }

  init(): void {
    logger.log(`${this.name} base init`);
  }

  initThreads(): Thread[] {
    logger.log(`${this.name} base init threads`);
    const defaultThreads: Thread[] = [];

    if ('initTick' in this) {
      defaultThreads.push(this.createThread('initTick', 'init'));
    }
    if ('run' in this) {
      defaultThreads.push(this.createThread('run', 'empire'));
    }
    if ('endTick' in this) {
      defaultThreads.push(this.createThread('endTick', 'work'));
    }
    return defaultThreads;
  }

  createThread(method: string, queueName: string): Thread {
    return new Thread(this, method, queueName);
  }

  getRoom(): Room | null {
    const roomName = this.data.roomName;
    const room = Game.rooms[roomName];
    return room || null;
  }
}
