'use strict';

let usedOnStart = 0;
let enabled = true;
let depth = 0;

interface ProfilerMemory {
  map: { [key: string]: { time: number; calls: number } };
  totalTime: number;
  enabledTick: number;
  disableTick: number | false;
  type: string;
  filter?: string;
}

declare global {
  namespace NodeJS {
    interface Global {
      Game: any;
    }
  }
}

namespace Memory {
  export let profiler: ProfilerMemory | undefined;
}

class AlreadyWrappedError extends Error {
  constructor() {
    super('Error attempted to double wrap a function.');
    this.name = 'AlreadyWrappedError';
  }
}

function setupProfiler(): void {
  depth = 0;
  (global.Game as any).profiler = {
    stream(duration?: number, filter?: string) {
      setupMemory('stream', duration || 10, filter);
    },
    email(duration?: number, filter?: string) {
      setupMemory('email', duration || 100, filter);
    },
    profile(duration?: number, filter?: string) {
      setupMemory('profile', duration || 100, filter);
    },
    background(filter?: string) {
      setupMemory('background', false, filter);
    },
    restart() {
      if (Profiler.isProfiling()) {
        const filter = Memory.profiler?.filter;
        let duration: number | false = false;
        if (!!Memory.profiler?.disableTick) {
          duration = Memory.profiler.disableTick - Memory.profiler.enabledTick + 1;
        }
        const type = Memory.profiler?.type || "Profiler broken, No memory";
        setupMemory(type, duration, filter);
      }
    },
    reset: resetMemory,
    output: Profiler.output,
  };

  overloadCPUCalc();
}

function setupMemory(profileType: string, duration: number | false, filter?: string): void {
  resetMemory();
  const disableTick = Number.isInteger(duration) ? (global.Game as any).time + duration : false;
  if (!Memory.profiler) {
    Memory.profiler = {
      map: {},
      totalTime: 0,
      enabledTick: (global.Game as any).time + 1,
      disableTick,
      type: profileType,
      filter,
    };
  }
}

function resetMemory(): void {
  Memory.profiler = undefined;
}

function overloadCPUCalc(): void {
  if ((global.Game as any).rooms.sim) {
    usedOnStart = 0;
    (global.Game as any).cpu.getUsed = function getUsed() {
      // @ts-ignore
      return performance.now() - usedOnStart;
    };
  }
}

function getFilter(): string | undefined {
  return Memory.profiler?.filter;
}

const functionBlackList = [
  'getUsed',
  'constructor',
];

function wrapFunction(name: string, originalFunction: Function): Function {
  if ((originalFunction as any).profilerWrapped) { throw new AlreadyWrappedError(); }
  function wrappedFunction(this: any, ...args: any[]) {
    if (Profiler.isProfiling()) {
      const nameMatchesFilter = name === getFilter();
      const start = (global.Game as any).cpu.getUsed();
      if (nameMatchesFilter) {
        depth++;
      }
      const result = originalFunction.apply(this, args);
      if (depth > 0 || !getFilter()) {
        const end = (global.Game as any).cpu.getUsed();
        Profiler.record(name, end - start);
      }
      if (nameMatchesFilter) {
        depth--;
      }
      return result;
    }

    return originalFunction.apply(this, args);
  }

  (wrappedFunction as any).profilerWrapped = true;
  wrappedFunction.toString = () =>
    `// screeps-profiler wrapped function:\n${originalFunction.toString()}`;

  return wrappedFunction;
}

function hookUpPrototypes(): void {
  Profiler.prototypes.forEach(proto => {
    profileObjectFunctions(proto.val, proto.name);
  });
}

function profileObjectFunctions(object: any, label: string): any {
  const objectToWrap = object.prototype ? object.prototype : object;

  Object.getOwnPropertyNames(objectToWrap).forEach(functionName => {
    const extendedLabel = `${label}.${functionName}`;

    const isBlackListed = functionBlackList.indexOf(functionName) !== -1;
    if (isBlackListed) {
      return;
    }

    const descriptor = Object.getOwnPropertyDescriptor(objectToWrap, functionName);
    if (!descriptor) {
      return;
    }

    const hasAccessor = descriptor.get || descriptor.set;
    if (hasAccessor) {
      const configurable = descriptor.configurable;
      if (!configurable) {
        return;
      }

      const profileDescriptor: PropertyDescriptor = {};

      if (descriptor.get) {
        const extendedLabelGet = `${extendedLabel}:get`;
        // @ts-ignore
        profileDescriptor.get = profileFunction(descriptor.get, extendedLabelGet);
      }

      if (descriptor.set) {
        const extendedLabelSet = `${extendedLabel}:set`;
        // @ts-ignore
        profileDescriptor.set = profileFunction(descriptor.set, extendedLabelSet);
      }

      Object.defineProperty(objectToWrap, functionName, profileDescriptor);
      return;
    }

    const isFunction = typeof descriptor.value === 'function';
    if (!isFunction) {
      return;
    }
    const originalFunction = objectToWrap[functionName];
    objectToWrap[functionName] = profileFunction(originalFunction, extendedLabel);
  });

  return objectToWrap;
}

function profileFunction(fn: Function, functionName?: string): Function {
  const fnName = functionName || fn.name;
  if (!fnName) {
    console.log('Couldn\'t find a function name for - ', fn);
    console.log('Will not profile this function.');
    return fn;
  }

  return wrapFunction(fnName, fn);
}

const Profiler = {
  printProfile() {
    console.log(Profiler.output());
  },

  emailProfile() {
    (global.Game as any).notify(Profiler.output(1000));
  },

  output(passedOutputLengthLimit?: number) {
    const outputLengthLimit = passedOutputLengthLimit || 1000;
    if (!Memory.profiler || !Memory.profiler.map) {
      return 'Profiler not active.';
    }

    const endTick = Math.min(Memory.profiler.disableTick || (global.Game as any).time, (global.Game as any).time);
    const startTick = Memory.profiler.enabledTick + 1;
    const elapsedTicks = endTick - startTick;
    const header = 'calls\t\ttime\t\tavg\t\tfunction';
    const footer = [
      `Avg: ${(Memory.profiler.totalTime / elapsedTicks).toFixed(2)}`,
      `Total: ${Memory.profiler.totalTime.toFixed(2)}`,
      `Ticks: ${elapsedTicks}`,
    ].join('\t');

    const lines = [header];
    let currentLength = header.length + 1 + footer.length;
    const allLines = Profiler.lines();
    let done = false;
    while (!done && allLines.length) {
      const line = allLines.shift();
      if (!line) {
        continue;
      }
      if (currentLength + line.length + 1 < outputLengthLimit) {
        lines.push(line);
        currentLength += line.length + 1;
      } else {
        done = true;
      }
    }
    lines.push(footer);
    return lines.join('\n');
  },

  lines() {
    if (!Memory.profiler) {
      return [];
    }
    const stats = Object.keys(Memory.profiler.map).map(functionName => {
      if (!Memory.profiler || !Memory.profiler.map[functionName]) {
        return {
          name: functionName,
          calls: 0,
          totalTime: 0,
          averageTime: 0,
        };
      }
      const functionCalls = Memory.profiler.map[functionName];
      return {
        name: functionName,
        calls: functionCalls.calls,
        totalTime: functionCalls.time,
        averageTime: functionCalls.time / functionCalls.calls,
      };
    }).sort((val1, val2) => {
      return val2.totalTime - val1.totalTime;
    });

    const lines = stats.map(data => {
      return [
        data.calls,
        data.totalTime.toFixed(1),
        data.averageTime.toFixed(3),
        data.name,
      ].join('\t\t');
    });

    return lines;
  },

  prototypes: [
    { name: 'Game', val: (global as any).Game },
    { name: 'Room', val: (global as any).Room },
    { name: 'Structure', val: (global as any).Structure },
    { name: 'Spawn', val: (global as any).Spawn },
    { name: 'Creep', val: (global as any).Creep },
    { name: 'RoomPosition', val: (global as any).RoomPosition },
    { name: 'Source', val: (global as any).Source },
    { name: 'Flag', val: (global as any).Flag },
  ],

  record(functionName: string, time: number) {
    if (!Memory.profiler || !Memory.profiler.map) {
      return;
    }
    if (!Memory.profiler.map[functionName]) {
      Memory.profiler.map[functionName] = {
        time: 0,
        calls: 0,
      };
    }
    Memory.profiler.map[functionName].calls++;
    Memory.profiler.map[functionName].time += time;
  },

  endTick() {
    if (!Memory.profiler) {
      return;
    }
    if ((global.Game as any).time >= Memory.profiler.enabledTick) {
      const cpuUsed = (global.Game as any).cpu.getUsed();
      Memory.profiler.totalTime += cpuUsed;
      Profiler.report();
    }
  },

  report() {
    if (Profiler.shouldPrint()) {
      Profiler.printProfile();
    } else if (Profiler.shouldEmail()) {
      Profiler.emailProfile();
    }
  },

  isProfiling() {
    if (!enabled || !Memory.profiler) {
      return false;
    }
    return !Memory.profiler.disableTick || (global.Game as any).time <= Memory.profiler.disableTick;
  },

  type() {
    return Memory.profiler?.type;
  },

  shouldPrint() {
    if (!Memory.profiler) {
      return false;
    }
    const streaming = Profiler.type() === 'stream';
    const profiling = Profiler.type() === 'profile';
    const onEndingTick = Memory.profiler.disableTick === (global.Game as any).time;
    return streaming || (profiling && onEndingTick);
  },

  shouldEmail() {
    if (!Memory.profiler) {
      return false;
    }
    return Profiler.type() === 'email' && Memory.profiler.disableTick === (global.Game as any).time;
  },
};

interface ProfilerModule {
  wrap(callback: () => any): any;
  enable(): void;
  output: typeof Profiler.output;
  registerObject: typeof profileObjectFunctions;
  registerFN: typeof profileFunction;
  registerClass: typeof profileObjectFunctions;
}

const profilerModule: ProfilerModule = {
  wrap(callback: () => any) {
    if (enabled) {
      setupProfiler();
    }

    if (Profiler.isProfiling()) {
      usedOnStart = (global.Game as any).cpu.getUsed();
      const returnVal = callback();
      Profiler.endTick();
      return returnVal;
    }

    return callback();
  },

  enable() {
    enabled = true;
    hookUpPrototypes();
  },

  output: Profiler.output,

  registerObject: profileObjectFunctions,
  registerFN: profileFunction,
  registerClass: profileObjectFunctions,
};

export default profilerModule;
