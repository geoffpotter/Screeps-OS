
import Logger from "shared/utils/logger";
let logger = new Logger("profiler");
logger.color = COLOR_ORANGE;
logger.enabled = false;


declare global {
  interface console {
    //logs lines like the return from a logger command
    commandResult(...args: any): void;
  }
  interface Memory {
    profiler: ProfilerMemory;
  }
}
interface ProfilerMemory {
  data: { [name: string]: ProfilerData };
  start?: number;
  ticks: number;
  ticksToRun?: number;
}

interface ProfilerData {
  startCpu?: number;
  calls: number;
  time: number;
  selfTime: number; // New field to track self time
  hide: boolean;
  isAsyncCall: boolean; // New field
  asyncTime: number; // New field
  asyncCalls: number; // New field
}

const __PROFILER_ENABLED__: boolean = true;


let MemoryObject = Memory;
function init() {
  if (!MemoryObject.profiler) {
    resetMemory();
  }

}

function resetMemory(): void {
  MemoryObject.profiler = {
    data: {},
    ticks: 0,
  };
  logger.log(JSON.stringify(MemoryObject));
}

function updateTicks(): void {
  let currentTick = Game.time;
  let start = MemoryObject.profiler.start || currentTick
  let ticks = currentTick - start;
  MemoryObject.profiler.ticks += ticks;
  MemoryObject.profiler.start = currentTick;
}

function clearProfile(fullName: string) {
  if (MemoryObject.profiler.data[fullName]) {
    // delete MemoryObject.profiler.data[fullName];
    MemoryObject.profiler.data[fullName] = {
      calls: 0,
      time: 0,
      selfTime: 0,
      hide: false,
      isAsyncCall: false,
      asyncTime: 0,
      asyncCalls: 0,
    }
  }
}


function getProfile(name: string): ProfilerData {
  //@ts-ignore
  if (name === undefined) throw new Error("Error: Unable to profile function. Function name is undefined.");
  if (!MemoryObject.profiler) {
    //instead of complaining that init hasn't been called(I forgot to export it anyway lol)
    //let's just call it now eh?
    init();// that was EASY!
  }
  validateProfilerState();
  //logger.log("getting profile", MemoryObject.profiler)
  if (!MemoryObject.profiler.data[name]) {
    if (name == "wasteCpu") {
      throw new Error("wasteCpu called");
    }
    logger.log("creating profile", name, new Error().stack?.slice(0, 200))
    // logger.log("creating profile", name)
    MemoryObject.profiler.data[name] = {
      calls: 0,
      time: 0,
      selfTime: 0, // Initialize selfTime
      hide: false,
      isAsyncCall: false, // Initialize new field
      asyncTime: 0, // Initialize new field
      asyncCalls: 0, // Initialize new field
    }
  }
  return MemoryObject.profiler.data[name];
}

function isProfilingEnabled() {
  if (!__PROFILER_ENABLED__) return false;
  return MemoryObject.profiler.start ? true : false;
}


//taken from typescript profiler
interface OutputData {
  name: string;
  calls: number;
  totalCpu: number;
  cpuPerCall: number;
  callsPerTick: number;
  cpuPerTick: number;
  selfCpuPerTick: number;
  selfCpuPercentage: number;
  asyncCalls: number;
  asyncCallsPerTick: number;
  selfCpu: number; // Added this line
  selfCpuPerCall: number; // Added this line
}
//taken from typescript profiler
function outputProfilerData(): string {
  if (!__PROFILER_ENABLED__) return 'Profiler disabled, set __PROFILER_ENABLED__ = true in your build system to profile.';

  validateProfilerState();
  let totalTicks = MemoryObject.profiler.ticks;
  if (MemoryObject.profiler.start) {
    totalTicks += Game.time - MemoryObject.profiler.start + 1;
  }

  ///////
  // Process data
  let totalCpu = 0;  // running count of average total CPU use per tick
  let calls: number;
  let time: number;
  let result: Partial<OutputData>;
  const data = Reflect.ownKeys(MemoryObject.profiler.data).map((inkey) => {
    let key = String(inkey);
    let data: ProfilerData = MemoryObject.profiler.data[key];
    if (data.hide) return null; // Skip hidden profiles
    calls = data.calls;
    time = data.time;
    result = {};
    result.name = `${key}`;
    result.calls = calls;
    result.totalCpu = time;
    result.cpuPerCall = time / calls;
    result.callsPerTick = calls / totalTicks;
    result.cpuPerTick = time / totalTicks;
    result.selfCpuPerTick = data.selfTime / totalTicks;
    result.selfCpuPercentage = (result.selfCpuPerTick / time) * 100;
    result.asyncCalls = data.asyncCalls;
    result.asyncCallsPerTick = data.asyncCalls / totalTicks;
    result.selfCpu = data.selfTime;
    result.selfCpuPerCall = data.selfTime / calls; // Add this line
    totalCpu += result.cpuPerTick;
    return result as OutputData;
  })
  .filter((item): item is OutputData => item !== null); // Filter out null entries

  data.sort((lhs, rhs) => rhs.totalCpu - lhs.totalCpu);

  ///////
  // Format data
  let output = "";
  //logger.log("in profile output:", JSON.stringify(data))
  // get function name max length
  let longestName = 0;
  data.forEach(d=>{
    if(longestName < d.name.length)
      longestName = d.name.length;
  })
  //// Header line
  const padHeader = (header:string, maxLength:number, left:boolean=true, customFill=" ") => {
    return left ? header.padStart(maxLength, customFill) : header.padEnd(maxLength, customFill);
  }

  output += padHeader("Function", longestName, false);
  output += padHeader("CPU/Call", 12);
  output += padHeader("Self CPU/Call", 15); // Add this line
  output += padHeader("Calls/Tick", 12);
  output += padHeader("CPU/Tick", 12);
  output += padHeader("Own CPU/Tick", 15);
  output += padHeader("Async/Tick", 16);
  output += padHeader("Tot CPU", 12);
  output += padHeader("Self CPU", 12);
  output += padHeader("Tot Calls", 12);
  output += padHeader("Tot Async Calls", 16);
  output += padHeader("% of Tot", 12);
  output += padHeader("Self CPU %\n", 12);

  ////  Data lines
  data.forEach((d) => {
    output += padHeader(`${d.name}`, longestName, false);
    output += padHeader(`${d.cpuPerCall.toFixed(2)}cpu`, 12);
    output += padHeader(`${d.selfCpuPerCall.toFixed(2)}cpu`, 15); // Add this line
    output += padHeader(`${d.callsPerTick.toFixed(2)}`, 12);
    output += padHeader(`${d.cpuPerTick.toFixed(2)}cpu`, 12);
    output += padHeader(`${d.selfCpuPerTick.toFixed(2)}cpu`, 15);
    output += padHeader(`${d.asyncCallsPerTick.toFixed(2)}`, 16);
    output += padHeader(`${d.totalCpu.toFixed(2)}cpu`, 12);
    output += padHeader(`${d.selfCpu.toFixed(2)}cpu`, 12);
    output += padHeader(`${d.calls}`, 12);
    output += padHeader(`${d.asyncCalls}`, 16);
    output += padHeader(`${(d.cpuPerTick / totalCpu * 100).toFixed(0)} %`, 12);
    output += padHeader(`${d.selfCpuPercentage.toFixed(1)}%\n`, 12);
  });

  //// Footer line
  output += `${totalTicks} total ticks measured`;
  output += `\t\t\t${totalCpu.toFixed(2)} average CPU profiled per tick`;
  return output;
}


class Profiler {

  stack: Array<string> = [];

  //helper functions
  wrapFunction(fn: Function, name: string | false = false, className: string | false = false): Function {
    if (!__PROFILER_ENABLED__) return fn;
    //@ts-ignore
    if (fn.profilerWrapped === true) {
      logger.error("function", name, "already wrapped!!! Skipping, but this is innefficent")
      return fn;
    }
    let funcName: string | false = false;
    let cName = "";
    if (name == false) {
      if (fn.name) {
        funcName = fn.name;
      } else if(className) {
        funcName = className;
      } else {
        let maybeFuncName = (new Error()).stack?.split("\n")[2]?.trim().split(" ")[1]
        logger.log("maybeFuncName", maybeFuncName)
        let ignoreFuncs = ["__module", "wrapFunction"]
        if(maybeFuncName && !ignoreFuncs.includes(maybeFuncName)) {
          funcName = maybeFuncName;
        }
        if(!funcName) {
          funcName = "anon";
          throw new Error("Error: Unable to profile function. Function name is undefined.");
        }
        //should be enough of that nonesense..
      }
    } else {
      funcName = name;
    }
    if (className == false) {
      //yeah, i dunno.. functions can belong to multiple classes, so I doubt you can go up..
    } else {
      cName = className;
    }
    let ourName = funcName;
    if (cName) {
      ourName = cName + "." + funcName;
    }
    let profiler_inst = this;
    function profilerWrapped(...args: any) {
      const fullName = ourName;
      profiler_inst.startCall(fullName);

      try {
        // @ts-ignore
        return fn.apply(this, args);
      } finally {
        profiler_inst.endCall(fullName);
      }
    };
    profilerWrapped.profilerWrapped = true;
    return profilerWrapped;
  }

  //Core functionality
  clear(): string {
    if (!__PROFILER_ENABLED__) return "Profiler disabled, set __PROFILER_ENABLED__ = true in your build system to profile.";
    resetMemory();
    return "Memory Reset"
  };
  getOutput(): string | false {
    if (!__PROFILER_ENABLED__) return false;
    updateTicks();
    return outputProfilerData();
  };
  output() {
    if (!__PROFILER_ENABLED__) return;
    console.log("\n" + this.getOutput());
  };
  start(ticksToProfile: number | boolean = false): string {
    if (!__PROFILER_ENABLED__) return "Profiler disabled, set __PROFILER_ENABLED__ = true in your build system to profile.";
    logger.log(MemoryObject);
    logger.log(JSON.stringify(MemoryObject))
    MemoryObject.profiler.start = Game.time;
    if (ticksToProfile) {
      MemoryObject.profiler.ticksToRun = Number(ticksToProfile);
      //TODO: setInterval with function to call stop after this many ticks
    }
    return "Started Profiling";
  };
  stop(doOutput = true): string {
    if (!__PROFILER_ENABLED__) return "Profiler disabled, set __PROFILER_ENABLED__ = true in your build system to profile.";
    updateTicks();
    delete MemoryObject.profiler.start;
    delete MemoryObject.profiler.ticksToRun;
    if (doOutput) {
      profiler.output();
    }
    return "Profiling Stopped"
  };
  status(): string {
    if (!__PROFILER_ENABLED__) return "Profiler disabled, set __PROFILER_ENABLED__ = true in your build system to profile.";
    return isProfilingEnabled() ? "Profiling is running" : "Profiling is stopped";
  };
  help(): string {
    if (!__PROFILER_ENABLED__) return "Profiler disabled, set __PROFILER_ENABLED__ = true in your build system to profile.";
    return "Profiler.start() - Starts profiling\n" +
      "Profiler.stop() - Stops profiling\n" +
      "Profiler.output() - print result\n" +
      "Profiler.clear() - reset profiling data\n" +
      "Profiler.status() - print status of profiling\n" +
      "Current Status: " + profiler.status();
  };



  clearProfilingTarget(fullName: string) {
    clearProfile(fullName);
  }
  getProfileTime(fullName: string) {
    return getProfile(fullName).time;
  }
  getProfileSelfTime(fullName: string) {
    return getProfile(fullName).selfTime;
  }

  //Actual profiling functions
  getCurrentProfileTarget(): string|false {
    if (!__PROFILER_ENABLED__) return false;
    if (this.stack.length == 0) {
      // logger.log("stack is empty", JSON.stringify(MemoryObject.profiler.data))
      return false;
    }
    // logger.log("grabbing top of stack:", this.stack)
    return this.stack[this.stack.length - 1];
  }

  private getFullName(name: string, ignoreTop: boolean = false): string {
    let stack = this.stack.slice();
    if(ignoreTop && stack.length > 0) {
      stack = stack.slice(1);
    }
    let fullName = "";
    if (stack.length == 0) {
      return name;
    }
    for(let i = 0; i < stack.length; i++) {
      let item = stack[i];
      if(item == name) {
        return fullName += name;
      } else {
        fullName += item; //add the current item
      }
      if(i < stack.length - 1) {
        fullName += "."; //add a dot if it's not the last item
      }
    }
    fullName += "." + name;
    return fullName;
  }

  startCall(name: string, hide: boolean = false, isAsyncCall: boolean = false): number|void {
    if (!__PROFILER_ENABLED__) return;
    const fullName = this.getFullName(name);
    // logger.log("in startCall", name, "stack", this.stack, "fullName", fullName, new Error().stack?.slice(0, 200));
    logger.log("in startCall", name, "stack", this.stack, "fullName", fullName);
    this.stack.push(name);
    return this.startCallNoStack(fullName, hide, isAsyncCall);
    // logger.log("pushed", name, "stack", this.stack);
  }

  startCallNoStack(fullName: string, hide: boolean = false, isAsyncCall: boolean = false): number|void {
    if (!__PROFILER_ENABLED__) return;
    let data: ProfilerData = getProfile(fullName);
    if (data.startCpu) {
      logger.error("startCpu is already set", "fullName", fullName, "data", JSON.stringify(data))
      throw new Error(`Error: startCpu is already set for ${fullName}. Profiling data may be inconsistent.`);
    }
    data.startCpu = Game.cpu.getUsed();
    data.hide = hide;
    data.isAsyncCall = isAsyncCall;
    logger.log("end startCallNoStack", fullName, "stack", this.stack);
    return data.time;
  }

  endCall(name: string, dontIncrement: boolean = false): number|void {
    if (!__PROFILER_ENABLED__) return;
    // logger.log("in endCall", "name", name, "stack", this.stack, new Error().stack?.slice(0, 400));
    logger.log("in endCall", "name", name, "stack", this.stack);
    // logger.log("stack length", this.stack.length);
    // if (this.stack.length == 0) {
    //   logger.log("stack is empty", name);
    //   logger.log("stack", this.stack.pop())
    // }
    let stackContainsName = this.stack.includes(name);
    let currentTop = this.stack[this.stack.length - 1];
    // logger.log("currentTop", currentTop, "name", name);
    if (stackContainsName && (currentTop === undefined || currentTop !== name)) {
      logger.log("stack contains name but it's not on top", "name", name, "stack", this.stack);
      //stack contains the name, but it's not on top.  Stop everything "above" it.
      while (this.stack.length > 0 && this.stack[this.stack.length - 1] !== name) {
        let topOfStack = this.stack.pop();
        if (!topOfStack) {
          logger.error("topOfStack is undefined", "stack", this.stack, "name", name);
          throw new Error(`Error: Trying to end call for ${name} but it's got an error.`);
        }
        let topFullName = this.getFullName(topOfStack);
        this.endCallNoStack(topFullName, true, false);
      }
    } else if (currentTop === undefined || currentTop !== name) {
      logger.error("stack is not what we expected", "expected", name, "actual", currentTop, "stack", this.stack);
      throw new Error(`Error: Trying to end call for ${name} but it's not at the top of the stack.`);
    }

    const fullName = this.getFullName(name);
    // logger.log("end endCall", "name", name, "stack", this.stack);
    let ret = this.endCallNoStack(fullName, dontIncrement, false);
    this.stack.pop();
    return ret;
  }

  endCallNoStack(fullName: string, dontIncrement: boolean = false, skipSubtract: boolean = true): number|void {
    if (!__PROFILER_ENABLED__) return;
    let data: ProfilerData = getProfile(fullName);
    let startCpu = data.startCpu;
    if (!startCpu) {
      logger.error("startCpu is undefined", "fullName", fullName, "data", JSON.stringify(data))
      // return;
      throw new Error(`Error: No start CPU time for ${fullName}. Profiling data may be inconsistent.`);
    }

    const endCpu = Game.cpu.getUsed();
    // logger.log("calc CPU", "startCpu", startCpu, "endCpu", endCpu, "fullName", fullName, "dontIncrement", dontIncrement, "skipSubtract", skipSubtract)
    this.calculateCPU(fullName, data, startCpu, endCpu, dontIncrement, skipSubtract);

    delete data.startCpu;
    logger.log("end endCallNoStack", fullName, "stack", this.stack);
    return data.time;
  }

  private calculateCPU(fullName: string, data: ProfilerData, startCpu: number, endCpu: number, dontIncrement: boolean = false, skipSubtract: boolean = false): void {
    const totalTime = endCpu - startCpu;
    // logger.log("calculateCPU", "totalTime", totalTime, "data", JSON.stringify(data))
    data.time += totalTime;
    data.selfTime += totalTime;
    if(!dontIncrement) {
      data.calls++;
    }

    if (data.isAsyncCall) {
      data.asyncTime += totalTime;
      data.asyncCalls++;
    }

    // subtract our time from our parent's time
    if (this.stack.length > 1 && !skipSubtract) {
      // logger.log('find parent', this.stack)
      const parentName = this.stack[this.stack.length - 2];
      const parentFullName = this.getFullName(parentName);
      const parentData = getProfile(parentFullName);
      // if (parentData.selfTime > 0 && totalTime > parentData.selfTime) {
      //   this.output()
      //   throw new Error(`Error: Total time is greater than self time for ${fullName}. Profiling data may be inconsistent.`);
      // }
      // logger.log("subtracting", totalTime, "from", parentName, JSON.stringify(parentData))
      parentData.selfTime -= totalTime;
    }
  }

  pauseContext(): Array<string> {
    this.stack.length > 0 && logger.log("in pauseContext Current stack", this.stack, "call stack", new Error().stack?.slice(0, 200))
    if (!__PROFILER_ENABLED__) return [];
    // copy the stack
    const savedStack = [...this.stack];

    // Stop profiling for all items in the current stack
    logger.log("pausing stack", this.stack, savedStack)
    while (this.stack.length > 0) {
      const name = this.getCurrentProfileTarget();
      logger.log("pausing", name)
      if (name) this.endCall(name, true);
    }

    return savedStack;
  }

  resumeContext(savedStack: Array<string>): void {
    savedStack.length > 0 && logger.log("in resumeContext", "savedStack", savedStack, "current stack", this.stack, new Error().stack?.slice(0, 300))
    if (!__PROFILER_ENABLED__) return;
    if (this.stack.length > 0) {
      logger.error("stack is not empty, pausing it", "stack", this.stack, "savedStack", savedStack);
      this.pauseContext();
    }

    // Start profiling for all items in the saved stack
    savedStack.forEach(name => {
      let fullName = this.getFullName(name);
      let profileInfo = getProfile(fullName);
      if(profileInfo) {
        // this.startCall(name, profileInfo.hide, profileInfo.isAsyncCall);
        this.startCall(name, false, true);
      } else {
        this.startCall(name, false, true);
      }
    });

  }

}

/**
 * kinds:
"class"
"method"
"getter"
"setter"
"field"
"auto-accessor"
 */
interface DecoratorContext {
  kind: string;
  key: string | symbol;
  access?: {
    get?(): unknown;
    set?(value: unknown): void;
  };
  isPrivate?: boolean;
  isStatic?: boolean;
  addInitializer?(initializer: () => void): void;
  getMetadata(key: symbol): any;
  setMetadata(key: symbol, value: unknown): void;
};

interface decoratorArgs {
  kind: string,
  key: string,
  placement: string,
  descriptor: TypedPropertyDescriptor<Function>,
  elements: Array<decoratorArgs>;
}

export let profiler = new Profiler();


export function profile(className:string|false=false, hide: boolean = false, noStack: boolean = false) {
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    if (!__PROFILER_ENABLED__) return;
    if(className == false) {
      // logger.log("using target name", Object.getOwnPropertyNames(target));
      className = target.constructor.name;
    }
    if(!className) {
      throw new Error("Error: Class name is undefined. Unable to profile.");
    }
    let name = className;
    const originalMethod = descriptor.value;
    descriptor.value = function (...args: any[]) {
      if(noStack) {
        profiler.startCallNoStack(name, hide);
      } else {
        profiler.startCall(name, hide);
      }
      // profiler.startCall(key);
      const result = originalMethod.apply(this, args);
      // profiler.endCall(key);
      if(noStack) {
        profiler.endCallNoStack(name);
      } else {
        profiler.endCall(name);
      }
      return result;
    };
    return descriptor;
    // return (...args:any) => {
    //   logger.log("in profile_function", args)
    //   return profiler.wrapFunction(key, descriptor);
    // }
  }
}

export function profileClass(className:string|false=false, noStack: boolean = false) {
  return (constructor: Function) => {
    if (!__PROFILER_ENABLED__) return;
    if (className == false) {
      className = constructor.name;
    }
    for (const key of Object.getOwnPropertyNames(constructor.prototype)) {
      const descriptor = Object.getOwnPropertyDescriptor(constructor.prototype, key);
      if (descriptor && descriptor.value instanceof Function) {
        // logger.log("in profileClass", key, descriptor.value)
        // constructor.prototype[key] = profiler.wrapFunction(descriptor.value, key, className);
        let t = className;
        let oldFunc = constructor.prototype[key]
        let pausedContext: Array<string>|false = false;
        function newFunc(...args:any) {
          if(noStack) {
            pausedContext = profiler.pauseContext();
            profiler.startCall(`${className}.${key}`);
          } else {
            profiler.startCall(`${className}.${key}`);
          }
          let ret;
          try {
            //@ts-ignore
            ret = oldFunc.apply(this, args);
            if (ret instanceof Promise) {
              ret.catch((e) => {
                logger.error("error in profiled function(promise)", e, "function", `${className}.${key}`, "args", args)
              })
            }
          } catch(e) {
            logger.error("error in profiled function", (e instanceof Error ? e.stack : e), "function", `${className}.${key}`, "args", args)
            ret = e;
          } finally {
            if(noStack) {
              profiler.endCall(`${className}.${key}`);
              if(pausedContext) {
                profiler.resumeContext(pausedContext);
              }
            } else {
              profiler.endCall(`${className}.${key}`);
            }
          }
          return ret;
        }
        constructor.prototype[key] = newFunc
      }
    }
    // logger.log("in profileClass", Object.getOwnPropertyNames(constructor.prototype) )

    // return profileObjectFunctions(target, className ? className : target.name);
  }
}


export function profileObjectFunctions(object: any, label: string): any {
  const objectToWrap = object.prototype ? object.prototype : object;

  Object.getOwnPropertyNames(objectToWrap).forEach(functionName => {
    const extendedLabel = `${label}.${functionName}`;

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

export function profileFunction(fn: Function, functionName?: string): Function {
  const fnName = functionName || fn.name;
  if (!fnName) {
    throw new Error('Error: Unable to profile function. Function name is undefined.');
  }

  return profiler.wrapFunction(fn, fnName);
}

// Add this new function for additional error checking
function validateProfilerState(): void {
  if (!MemoryObject.profiler) {
    throw new Error('Error: Profiler memory not initialized. Call init() before using the profiler.');
  }
  if (!MemoryObject.profiler.data) {
    throw new Error('Error: Profiler data is missing. Memory might be corrupted.');
  }
}


let stackAtEndOfLastTick:Array<string> = [];
export function process_start_tick() {
  console.log("in process_start_tick", stackAtEndOfLastTick);
  profiler.resumeContext(stackAtEndOfLastTick);
}
export function process_end_tick() {
  stackAtEndOfLastTick = profiler.pauseContext();
  console.log("in process_end_tick", stackAtEndOfLastTick);
}
