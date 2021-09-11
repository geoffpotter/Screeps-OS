//import _ from "lodash";
import {getSettings} from "shared/utils/settings";
let settings = getSettings();

interface Memory {
  [profiler: string]: ProfilerMemory;
}
declare global {
  interface Console {
    //logs lines like the return from a console command
    commandResult(...args: any): void;
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
  startPauseCpu?: number;
  calls: number;
  time: number;
  pauseTime: number;
}

const __PROFILER_ENABLED__: boolean = true;


let MemoryObject: Memory;
function init() {
  MemoryObject = settings.getMemory();
  if (!MemoryObject.profiler) {
    resetMemory();
  }

}

function resetMemory(): void {
  MemoryObject = settings.getMemory();
  MemoryObject.profiler = {
    data: {},
    ticks: 0,
  };
  console.log(JSON.stringify(settings.getMemory()));
}

function updateTicks(): void {
  MemoryObject = settings.getMemory();
  let currentTick = settings.getTick();
  let start = MemoryObject.profiler.start || currentTick
  let ticks = currentTick - start;
  MemoryObject.profiler.ticks += ticks;
  MemoryObject.profiler.start = currentTick;
}

function getProfile(name: string): ProfilerData {
  MemoryObject = settings.getMemory();
  if (!MemoryObject.profiler) {
    //instead of complaining that init hasn't been called(I forgot to export it anyway lol)
    //let's just call it now eh?
    init();// that was EASY!
  }
  //console.log("getting profile", MemoryObject.profiler)
  if (!MemoryObject.profiler.data[name]) {
    MemoryObject.profiler.data[name] = {
      calls: 0,
      time: 0,
      pauseTime: 0,
    }
  }
  return MemoryObject.profiler.data[name];
}

function isProfilingEnabled() {
  if (!__PROFILER_ENABLED__) return false;
  MemoryObject = settings.getMemory();
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
  cpuPausedPerCall: number;
  cpuPausedPerTick: number;
}
//taken from typescript profiler
function outputProfilerData(): string {
  if (!__PROFILER_ENABLED__) return '';

  MemoryObject = settings.getMemory();
  let totalTicks = MemoryObject.profiler.ticks;
  if (MemoryObject.profiler.start) {
    totalTicks += Game.time - MemoryObject.profiler.start + 1;
  }

  ///////
  // Process data
  let totalCpu = 0;  // running count of average total CPU use per tick
  let calls: number;
  let time: number;
  let pauseTime: number;
  let result: Partial<OutputData>;
  const data = Reflect.ownKeys(MemoryObject.profiler.data).map((inkey) => {
    let key = String(inkey);
    let data: ProfilerData = MemoryObject.profiler.data[key];
    calls = data.calls;
    pauseTime = data.pauseTime;
    time = data.time - pauseTime;
    result = {};
    result.name = `${key}`;
    result.calls = calls;
    result.totalCpu = time;
    result.cpuPerCall = time / calls;
    result.callsPerTick = calls / totalTicks;
    result.cpuPerTick = time / totalTicks;
    result.cpuPausedPerCall = pauseTime / calls;
    result.cpuPausedPerTick = pauseTime / totalTicks;
    totalCpu += result.cpuPerTick;
    return result as OutputData;
  });

  data.sort((lhs, rhs) => rhs.cpuPerTick - lhs.cpuPerTick);

  ///////
  // Format data
  let output = "";
  //console.log("in profile output:", JSON.stringify(data))
  // get function name max length
  const longestName = (_.max(data, (d) => d.name.length)).name.length + 2;

  //// Header line
  output += _.padRight("Function", longestName);
  output += _.padLeft("Calls/Tick", 12);
  output += _.padLeft("CPU/Call", 12);
  output += _.padLeft("Ignore/Call", 12);
  output += _.padLeft("CPU/Tick", 12);
  output += _.padLeft("Ignore/Tick", 12);
  output += _.padLeft("Tot CPU", 12);
  output += _.padLeft("Tot Calls", 12);
  output += _.padLeft("% of Tot\n", 12);

  ////  Data lines
  data.forEach((d) => {
    output += _.padRight(`${d.name}`, longestName);
    output += _.padLeft(`${d.callsPerTick.toFixed(2)}`, 12);
    output += _.padLeft(`${d.cpuPerCall.toFixed(2)}ms`, 12);
    output += _.padLeft(`${d.cpuPausedPerCall.toFixed(2)}`, 12);
    output += _.padLeft(`${d.cpuPerTick.toFixed(2)}ms`, 12);
    output += _.padLeft(`${d.cpuPausedPerTick.toFixed(2)}`, 12);
    output += _.padLeft(`${d.totalCpu.toFixed(2)}ms`, 12);
    output += _.padLeft(`${d.calls}`, 12);
    output += _.padLeft(`${(d.cpuPerTick / totalCpu * 100).toFixed(0)} %\n`, 12);
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
      console.commandResult("function", name, "already wrapped!!! Skipping, but this is innefficent")
      return fn;
    }
    let funcName = "anon";
    let cName = "";
    if (name == false) {
      if (fn.name) {
        funcName = fn.name;
      } else if (Profiler.caller?.name) {
        funcName = Profiler.caller.name;
      } else if (Profiler?.caller?.caller?.name) {
        funcName = Profiler.caller.caller.name;
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
      ourName = cName + ":" + funcName;
    }
    let profiler_inst = this;
    function profilerWrapped(...args: any) {
      //console.log(ourName, "profile stack", profiler_inst.stack)
      profiler.startCall(ourName);
      //add this name to the stack
      profiler_inst.stack.push(ourName);
      //@ts-ignore
      fn.apply(this, args);
      profiler.endCall(ourName);
      let topOfStack = profiler_inst.stack.pop();
      if (topOfStack != ourName) {
        //whoops, someone fucked up.. maybe this doesn't work
        throw new Error("I might be retarded!  maybe this isn't so easy after all...")
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
  output(): string {
    if (!__PROFILER_ENABLED__) return "Profiler disabled, set __PROFILER_ENABLED__ = true in your build system to profile.";
    updateTicks();
    return outputProfilerData();
  };
  start(ticksToProfile: number | boolean = false): string {
    if (!__PROFILER_ENABLED__) return "Profiler disabled, set __PROFILER_ENABLED__ = true in your build system to profile.";
    MemoryObject = settings.getMemory();
    console.log(MemoryObject);
    console.log(JSON.stringify(settings.getMemory()))
    MemoryObject.profiler.start = settings.getTick();
    if (ticksToProfile) {
      MemoryObject.profiler.ticksToRun = Number(ticksToProfile);
      //TODO: setInterval with function to call stop after this many ticks
    }
    return "Started Profiling";
  };
  stop(doOutput = true): string {
    if (!__PROFILER_ENABLED__) return "Profiler disabled, set __PROFILER_ENABLED__ = true in your build system to profile.";
    MemoryObject = settings.getMemory();
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


  //Actual profiling functions
  getCurrentProfileTarget(): string {
    if (!__PROFILER_ENABLED__) return "";
    if (this.stack.length == 0) {
      return '';
    }
    console.log("grabbing top of stack:", this.stack)
    return this.stack[this.stack.length - 1];
  }

  startCall(name: string): void {
    if (!__PROFILER_ENABLED__) return;
    let data: ProfilerData = getProfile(name);
    data.startCpu = settings.getCpu();
  }

  pauseCall(name: string | false = false): void {
    if (!__PROFILER_ENABLED__) return;
    if (name == false) {
      name = this.getCurrentProfileTarget();
    }
    let data: ProfilerData = getProfile(name);
    if (!data.startCpu) {
      //umm.. start profiling, then pause it?  better than an error I guess
      //what if we're profiling a function called once but that runs on multiple ticks?
      throw new Error("Can't pause profiling on a call that hasn't started")
      //oh yeah, we'd just be updating the time part, but not calls, which makes sense.
      //profiler.startCall(name);
    }
    data.startPauseCpu = settings.getCpu();
  }

  resumeCall(name: string | false = false): void {
    if (!__PROFILER_ENABLED__) return;
    if (name == false) {
      name = this.getCurrentProfileTarget();
    }
    //wanna do the same as endCall, but use startPauseCpu
    let data: ProfilerData = getProfile(name);
    let pauseCpu = data.startPauseCpu;
    if (!pauseCpu) {
      //this call was never started...  so, never paused either
      //we have no start cpu to compare to.. with pause, we can assume it was at the start of the funciton,
      // or at least the start of what they want to profile for the tick.
      //I can't make any sense of calling this function in this state, error seems worth it here.
      throw new Error("Can't resume profiling on a call that hasn't started, that's just crazy talk.")
    }
    //add cpu to pauseTime, DO NOT increment calls
    data.pauseTime += settings.getCpu() - pauseCpu;
    delete data.startPauseCpu;
  }

  endCall(name: string): void {
    if (!__PROFILER_ENABLED__) return;
    let data: ProfilerData = getProfile(name);
    let startCpu = data.startCpu;
    if (!startCpu) {
      //this call was never started...  so, never paused either
      //we have no start cpu to compare to.. with pause, we can assume it was at the start of the funciton,
      // or at least the start of what they want to profile for the tick.
      //I can't make any sense of calling this function in this state, error seems worth it here.
      throw new Error(`Can't end profiling on a call to ${name} that hasn't started, that's just crazy talk.` +
        ` Are you using manual profiling in side a wrapped function?`)
    }

    if (data.startPauseCpu) {
      //if profiling is currently paused, resume it right quick to make sure pauseTime gets updated.
      profiler.resumeCall(name);
    }
    //add cpu to time, increment calls
    data.time += settings.getCpu() - startCpu;
    data.calls++;
    delete data.startCpu;
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
export function profile_test(target: any) {
  let { kind, key, placement, descriptor } = target;
  console.log('inProfile decorator', kind, key, placement, descriptor ? Object.keys(descriptor) : descriptor)
}
export function profile(
  className: string | false = false
): Function {
  return (target: decoratorArgs) => {
    let { kind, key, placement, descriptor, elements } = target;

    if (!__PROFILER_ENABLED__) return;
    if (!className) {
      className = "";
    }

    switch (target.kind) {
      case "class":
        //wrap all functions
        console.log('in class decorator', className, JSON.stringify(target), Object.keys(target));
        for (let i = 0; i < elements.length; i++) {
          const element = elements[i];
          if (!element.descriptor.value) {
            console.commandResult('trying to profile.. something...');
            continue;
          }
          element.descriptor.value = profiler.wrapFunction(element.descriptor.value, element.key, className)
          elements[i] = element;
        }
        return target;
      case "method":
        if (!descriptor.value) return;
        //wrap method
        console.log('in method decorator', descriptor.value.prototype.__class__, className, JSON.stringify(target), Object.getOwnPropertyNames(descriptor));

        descriptor.value = profiler.wrapFunction(descriptor.value, key, className);
        return target;
      case "getter":
      case "setter":
      case "field":
        //think I can handle all these at once
        console.log('in getter/setter/field decorator', className, JSON.stringify(target), JSON.stringify(target))
        break;
      case "auto-accessor":
        //this one is weird
        break;

    }
    return;
  }
}
