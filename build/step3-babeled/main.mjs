import { searchPath } from '/game/path-finder';
import { getCpuTime, getTicks, getRange, getTerrainAt, getObjectById, getObjectsByPrototype } from '/game/utils';
import { text } from '/game/visual';
import { RESOURCE_ENERGY, BODYPART_COST, MOVE, TOUGH, ATTACK, RANGED_ATTACK, HEAL, CARRY, WORK } from '/game/constants';
import { Creep, StructureContainer, StructureSpawn, Structure, OwnedStructure } from '/game/prototypes';

class defaultSettings {
    constructor() {
        this.allResourceConstants = [RESOURCE_ENERGY];
        this.creepInjuredThreshold = 0.55;
        this.creepClassCacheTicks = 1;
        this.intelUpdateFrequency = 1;
        overrideSettings(this);
    }
    getPathCost(obj1, obj2) {
        let path = getSettings().getPath(obj1, obj2);
        if (path.incomplete)
            return Infinity;
        return path.cost;
    }
    getRangeByPath(obj1, obj2) {
        let path = getSettings().getPath(obj1, obj2);
        if (path.incomplete)
            return Infinity;
        return path.path.length;
    }
    toGoals(objs, range) {
        let goals = [];
        let index = 0;
        for (let obj of objs) {
            let goal = {
                pos: obj,
                range: !Array.isArray(range) ? range : range[Math.min(index, range.length)]
            };
            goals.push(goal);
            index++;
        }
        return goals;
    }
}
class holder {
    constructor() {
        this.settings = false;
    }
}
let settingsHolder = new holder();
function getSettings() {
    if (!settingsHolder.settings) {
        throw new Error("trying to get settings that haven't been set, move your settings import to the top of main");
    }
    return settingsHolder.settings;
}
function overrideSettings(newSettingsObj) {
    console.log("---------------------------------------using Custom settings!!!------------------------");
    settingsHolder.settings = newSettingsObj;
}

let mem = {};
class settings extends defaultSettings {
    getCpu() {
        return getCpuTime();
    }
    getTick() {
        return getTicks();
    }
    getMemory() {
        return mem;
    }
    getRange(obj1, obj2) {
        return getRange(obj1, obj2);
    }
    drawText(txt, pos, style = {}) {
        if (!style.font) {
            style.font = 1;
        }
        text(txt, pos, style);
    }
    getPath(obj1, obj2, opts) {
        return searchPath(obj1, obj2, opts);
    }
    getTerrainAt(pos) {
        return getTerrainAt(pos);
    }
    getObjectById(id) {
        return getObjectById(id);
    }
}
let runtimeSettings = new settings();

function addInPriorityOrder(arr, item) {
    for (let index in arr) {
        let existingItem = arr[index];
        if (existingItem.priority < item.priority) {
            arr.splice(Number(index), 0, item);
            return;
        }
    }
    arr.push(item);
    return;
}

class functionQueueArray {
    constructor(initialSize = 10000) {
        this.initialSize = initialSize;
        this.funcs = Array(initialSize);
        this.numFuncs = 0;
        this.doneFuncs = new WeakSet();
        this.numDoneFuncs = 0;
    }
    resetArray() {
        this.funcs = Array(this.initialSize);
        this.numFuncs = 0;
    }
    addFunc(func) {
        this.funcs[this.numFuncs] = func;
        this.numFuncs++;
    }
    processCurrentQueue() {
        if (this.numFuncs == 0)
            return;
        let currentQueue = this.funcs;
        let numFuncs = this.numFuncs;
        this.resetArray();
        let currentFunc = 0;
        let func;
        while (currentFunc < numFuncs) {
            func = currentQueue[currentFunc++];
            func();
        }
    }
    processCurrentQueueWithDone() {
        if (this.numFuncs == 0)
            return;
        let currentQueue = this.funcs;
        let numFuncs = this.numFuncs;
        this.resetArray();
        let currentFunc = 0;
        let func;
        while (currentFunc < numFuncs) {
            func = currentQueue[currentFunc++];
            let done = func();
            if (done === false) {
                this.addFunc(func);
            }
        }
    }
    processFullQueueWithDone() {
        if (this.numDoneFuncs > Math.min(Math.max(this.numFuncs * 0.2, 0), 10000000)) {
            let oldFuncs = this.funcs;
            let total = this.numFuncs;
            let current = 0;
            this.resetArray();
            while (current < total) {
                let func = oldFuncs[current];
                if (!this.doneFuncs.has(func)) {
                    this.addFunc(func);
                }
                current++;
            }
            this.doneFuncs = new WeakSet();
            this.numDoneFuncs = 0;
        }
        if (this.numFuncs == 0)
            return;
        let currentFunc = 0;
        let func;
        let doneFuncs = this.doneFuncs;
        let funcs = this.funcs;
        while (currentFunc < this.numFuncs) {
            func = funcs[currentFunc];
            if (!doneFuncs.has(func)) {
                if (func() !== false) {
                    doneFuncs.add(func);
                    this.numDoneFuncs++;
                }
            }
            currentFunc++;
        }
    }
    processFullQueue() {
        if (this.numFuncs == 0)
            return;
        let currentFunc = 0;
        let func;
        let funcs = this.funcs;
        while (currentFunc < this.numFuncs) {
            func = funcs[currentFunc++];
            func();
        }
        this.resetArray();
    }
}

class functionQueueSet {
    constructor() {
        this.funcs = new Set();
        this.addFunc = this.funcs.add.bind(this.funcs);
    }
    resetSet() {
        this.funcs = new Set();
        this.addFunc = this.funcs.add.bind(this.funcs);
    }
    processCurrentQueueWithDone() {
        if (this.funcs.size == 0)
            return;
        let funcs = this.funcs;
        this.resetSet();
        funcs.forEach((func) => {
            let done = func();
            if (done === false) {
                this.addFunc(func);
            }
        });
    }
    processCurrentQueue() {
        if (this.funcs.size == 0)
            return;
        let funcs = this.funcs;
        this.resetSet();
        funcs.forEach((func) => {
            func();
        });
    }
    processFullQueueWithDone() {
        if (this.funcs.size == 0)
            return;
        this.funcs.forEach((func) => {
            let done = func();
            if (done !== false) {
                this.funcs.delete(func);
            }
        });
    }
    processFullQueue() {
        if (this.funcs.size == 0)
            return;
        this.funcs.forEach((func) => {
            func();
        });
        this.funcs.clear();
    }
}

var tickPhases;
(function (tickPhases) {
    tickPhases[tickPhases["PRE_TICK"] = 0] = "PRE_TICK";
    tickPhases[tickPhases["POST_TICK"] = 1] = "POST_TICK";
})(tickPhases || (tickPhases = {}));
class taskQueue {
    constructor(name, priority = 0, tickPhase = tickPhases.POST_TICK) {
        this.tasks = new functionQueueArray();
        this.microTasks = new functionQueueSet();
        this.priority = 0;
        this.name = name;
        this.tickPhase = tickPhase;
        this.priority = priority;
        addQueue(this);
    }
    queueTask(task) {
        this.tasks.addFunc(task);
    }
    queueMicroTask(microTask) {
        this.microTasks.addFunc(microTask);
    }
    run() {
        console.log("running queue", this.name);
        this.runTasks();
        this.runMicroTasks();
    }
    runTasks() {
        this.tasks.processCurrentQueueWithDone();
    }
    runMicroTasks() {
        this.microTasks.processFullQueue();
    }
}
let preTickQueues = new Array();
let postTickQueues = new Array();
let queueLookup = new Map();
var builtInQueues;
(function (builtInQueues) {
    builtInQueues["TICK_INIT"] = "tickInit";
    builtInQueues["UPDATE"] = "update";
    builtInQueues["BEFORE_MAIN"] = "beforeMain";
    builtInQueues["AFTER_MAIN"] = "afterMain";
    builtInQueues["ACTIONS"] = "actions";
    builtInQueues["MOVEMENT"] = "movement";
    builtInQueues["TICK_DONE"] = "tickDone";
})(builtInQueues || (builtInQueues = {}));
var TaskPriorities;
(function (TaskPriorities) {
    TaskPriorities[TaskPriorities["FIRST"] = 10000] = "FIRST";
    TaskPriorities[TaskPriorities["DEFAULT"] = 0] = "DEFAULT";
    TaskPriorities[TaskPriorities["LAST"] = -10000] = "LAST";
})(TaskPriorities || (TaskPriorities = {}));
new taskQueue(builtInQueues.TICK_INIT, TaskPriorities.FIRST, tickPhases.PRE_TICK);
new taskQueue(builtInQueues.UPDATE, TaskPriorities.LAST, tickPhases.PRE_TICK);
new taskQueue(builtInQueues.BEFORE_MAIN, TaskPriorities.LAST, tickPhases.PRE_TICK);
new taskQueue(builtInQueues.AFTER_MAIN, TaskPriorities.FIRST, tickPhases.POST_TICK);
new taskQueue(builtInQueues.ACTIONS, TaskPriorities.DEFAULT, tickPhases.POST_TICK);
new taskQueue(builtInQueues.MOVEMENT, TaskPriorities.DEFAULT - 10, tickPhases.POST_TICK);
let tickDoneQueue = new taskQueue(builtInQueues.TICK_DONE, TaskPriorities.LAST, tickPhases.POST_TICK);
let currentQueue = false;
function queueMicroTask(microTask, queue = false) {
    if (queue === false) {
        if (currentQueue) {
            queue = currentQueue;
        }
        else {
            queue = tickDoneQueue;
        }
    }
    else if (!(queue instanceof taskQueue)) {
        queue = getQueue(queue);
    }
    queue.queueMicroTask(microTask);
}
function queueTask(task, queue = false) {
    if (queue === false) {
        if (currentQueue) {
            queue = currentQueue;
        }
        else {
            queue = tickDoneQueue;
        }
    }
    else if (!(queue instanceof taskQueue)) {
        queue = getQueue(queue);
    }
    queue.queueTask(task);
}
function addQueue(queue) {
    if (queueLookup.has(queue.name)) {
        throw new Error("Queue names must be unique!" + queue.name);
    }
    queueLookup.set(queue.name, queue);
    if (queue.tickPhase == tickPhases.PRE_TICK) {
        addInPriorityOrder(preTickQueues, queue);
    }
    else {
        addInPriorityOrder(postTickQueues, queue);
    }
}
function getQueue(queueName) {
    if (!queueLookup.has(queueName)) {
        throw new Error("Trying to add func to non-existant queue");
    }
    return queueLookup.get(queueName);
}
function runPreTickQueues() {
    for (let queue of preTickQueues) {
        currentQueue = queue;
        queue.run();
        currentQueue = false;
    }
}
function runPostTickQueues() {
    for (let queue of postTickQueues) {
        currentQueue = queue;
        queue.run();
        currentQueue = false;
    }
}

function startTick$1() {
    runPreTickQueues();
}
function endTick$1() {
    runPostTickQueues();
}

/**
 * a cheapo "good enough for now" uuid function, not a real one.
 * uses math.random, so colisions are possible.
 * @returns string
 */
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0,
        v = c == 'x' ? r : r & 0x3 | 0x8;
    return v.toString(16);
  });
}

let intervals = new Map();
function processIntervals() {
    let settings = getSettings();
    let currentTick = settings.getTick();
    intervals.forEach((interval) => {
        if (!(interval.startTick >= 0)) {
            interval.startTick = 0;
        }
        let ticksSinceStart = currentTick - interval.startTick;
        if (ticksSinceStart >= interval.ticks) {
            queueMicroTask(interval.func, interval.queueName);
            interval.startTick = currentTick;
        }
    });
    return false;
}
queueTask(processIntervals, builtInQueues.TICK_INIT);
function clearInterval$1(intervalId) {
    if (intervals.has(intervalId)) {
        console.log("deleting interval:", intervalId);
        intervals.delete(intervalId);
    }
}
function setInterval$1(callback, ticks, queueName = "default") {
    if (!(ticks > 0)) {
        throw new Error("Interval ticks must be greater than 0!");
    }
    let intervalId = uuid();
    intervals.set(intervalId, {
        id: intervalId,
        func: callback,
        ticks: ticks,
        startTick: getSettings().getTick(),
        cpuUsed: 0,
        queueName: queueName
    });
    return intervalId;
}

let timeouts = new Map();
function processTimeouts() {
    let settings = getSettings();
    let currentTick = settings.getTick();
    timeouts.forEach((timeout) => {
        if (!(timeout.startTick >= 0)) {
            timeout.startTick = 0;
        }
        let ticksSinceStart = currentTick - timeout.startTick;
        if (ticksSinceStart >= timeout.ticks) {
            queueMicroTask(timeout.func, timeout.queueName);
            timeouts.delete(timeout.id);
        }
    });
    return false;
}
queueTask(processTimeouts, builtInQueues.TICK_INIT);

/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
function __decorate(decorators, target, key, desc) {
  var c = arguments.length,
      r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc,
      d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function __awaiter(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function (resolve) {
      resolve(value);
    });
  }

  return new (P || (P = Promise))(function (resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }

    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }

    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }

    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
}

getSettings();
class Profiler {
    constructor() {
        this.stack = [];
    }
    wrapFunction(fn, name = false, className = false) {
        return fn;
    }
    clear() {
        return "Profiler disabled, set __PROFILER_ENABLED__ = true in your build system to profile.";
    }
    ;
    output() {
        return "Profiler disabled, set __PROFILER_ENABLED__ = true in your build system to profile.";
    }
    ;
    start(ticksToProfile = false) {
        return "Profiler disabled, set __PROFILER_ENABLED__ = true in your build system to profile.";
    }
    ;
    stop(doOutput = true) {
        return "Profiler disabled, set __PROFILER_ENABLED__ = true in your build system to profile.";
    }
    ;
    status() {
        return "Profiler disabled, set __PROFILER_ENABLED__ = true in your build system to profile.";
    }
    ;
    help() {
        return "Profiler disabled, set __PROFILER_ENABLED__ = true in your build system to profile.";
    }
    ;
    getCurrentProfileTarget() {
        return "";
    }
    startCall(name) {
        return;
    }
    pauseCall(name = false) {
        return;
    }
    resumeCall(name = false) {
        return;
    }
    endCall(name) {
        return;
    }
}
let profiler = new Profiler();
function profile(className = false) {
    return (target) => {
        return;
    };
}

var PromiseState;
(function (PromiseState) {
    PromiseState[PromiseState["Pending"] = 0] = "Pending";
    PromiseState[PromiseState["Resolved"] = 1] = "Resolved";
    PromiseState[PromiseState["Rejected"] = 2] = "Rejected";
})(PromiseState || (PromiseState = {}));
class Promise$2 {
    constructor(executor) {
        this.callbacks = [];
        this.state = PromiseState.Pending;
        let lastProfiledName = profiler.getCurrentProfileTarget();
        if (!lastProfiledName) {
            lastProfiledName = "global";
        }
        profiler.startCall("Promise:construct:" + lastProfiledName);
        executor(this.resolveHandler.bind(this), this.rejectHandler.bind(this));
        profiler.endCall("Promise:construct:" + lastProfiledName);
    }
    static resolve(value) {
        return new Promise$2((resolve) => {
            resolve(value);
        });
    }
    static reject(value) {
        return new Promise$2((_, reject) => {
            reject(value);
        });
    }
    then(onSuccess, onFailure) {
        let lastProfiledName = profiler.getCurrentProfileTarget();
        if (!lastProfiledName) {
            lastProfiledName = "global";
        }
        profiler.startCall("Promise:then");
        let thenPromise = new Promise$2((resolve, reject) => {
            this.callbacks.push(() => {
                profiler.startCall("Promise:callback:" + lastProfiledName);
                try {
                    let callbackResult = undefined;
                    try {
                        if (this.state == PromiseState.Resolved) {
                            if (onSuccess)
                                callbackResult = onSuccess(this.reasonOrValue);
                            else
                                callbackResult = this.reasonOrValue;
                        }
                        else if (this.state == PromiseState.Rejected) {
                            if (onFailure)
                                callbackResult = onFailure(this.reasonOrValue);
                            else
                                callbackResult = this.reasonOrValue;
                        }
                        else {
                            throw new TypeError("Processing callbacks on unresolved Promise, that seems wrong..");
                        }
                    }
                    catch (e2) {
                        reject(e2);
                    }
                    if (this === callbackResult) {
                        throw new TypeError("A promsie can't resolve to itself");
                    }
                    if (callbackResult instanceof Promise$2) {
                        while ((callbackResult instanceof Promise$2) && callbackResult.state !== PromiseState.Pending) {
                            callbackResult = callbackResult.reasonOrValue;
                        }
                        callbackResult.then(resolve, reject);
                    }
                    else if ((typeof callbackResult === "object" || typeof callbackResult === "function") && typeof callbackResult.next === "function") {
                        callbackResult.then(resolve, reject);
                    }
                    else {
                        queueMicroTask(() => {
                            resolve(callbackResult);
                        });
                    }
                }
                catch (e) {
                    throw e;
                }
                profiler.endCall("Promise:callback:" + lastProfiledName);
            });
        });
        if (this.state != PromiseState.Pending) {
            this.resolvePromise();
        }
        profiler.endCall("Promise:then");
        return thenPromise;
    }
    resolveHandler(value) {
        if (this.state != PromiseState.Pending)
            return;
        this.state = PromiseState.Resolved;
        this.reasonOrValue = value;
        this.resolvePromise();
    }
    rejectHandler(reason) {
        if (this.state != PromiseState.Pending)
            return;
        this.state = PromiseState.Rejected;
        this.reasonOrValue = reason;
        this.resolvePromise();
    }
    resolvePromise() {
        if (this.state == PromiseState.Pending)
            return;
        queueMicroTask(() => {
            let nextCallback;
            while (nextCallback = this.callbacks.shift()) {
                nextCallback();
            }
        });
    }
}
__decorate([
    profile("Promise")
], Promise$2.prototype, "resolveHandler", null);
__decorate([
    profile("Promise")
], Promise$2.prototype, "rejectHandler", null);
__decorate([
    profile("Promise")
], Promise$2.prototype, "resolvePromise", null);

let setInterval = setInterval$1;
let clearInterval = clearInterval$1;
let startTick = startTick$1;
let endTick = endTick$1;
let Promise$1 = Promise$2;

class CachedValue {
    constructor(refreshFN, cacheTTL = 1, refreshNow = false) {
        this.nextClearTick = 0;
        this.currentValue = null;
        this.cacheTTL = cacheTTL;
        this.refreshFN = refreshFN;
        if (refreshNow) {
            this.currentValue = this.getNewValue();
        }
        if (cacheTTL == Infinity) {
            this._hasValue = this.hasCachedValue;
            this.get = this.getCachedValue;
        }
    }
    checkClearCache() {
        let currentTick = getSettings().getTick();
        if (this.hasCachedValue() && currentTick >= this.nextClearTick) {
            this.clearValue();
        }
    }
    getNewValue() {
        let currentTick = getSettings().getTick();
        this.nextClearTick = currentTick + this.cacheTTL;
        return this.currentValue = this.refreshFN();
    }
    hasCachedValue() {
        return this.currentValue !== null;
    }
    _hasValue() {
        this.checkClearCache();
        return this.hasCachedValue();
    }
    getCachedValue() {
        if (!this.currentValue) {
            this.currentValue = this.getNewValue();
        }
        return this.currentValue;
    }
    get() {
        this.checkClearCache();
        return this.getCachedValue();
    }
    get hasValue() {
        return this._hasValue();
    }
    get value() {
        return this.get();
    }
    set value(newValue) {
        this.currentValue = newValue;
    }
    clearValue() {
        this.currentValue = null;
    }
}

const COLOR_WHITE = 10;
class logger$1 {
    constructor(module, color = "white") {
        this.module = module;
        this.enabled = true;
        this.color = color ? color : COLOR_WHITE;
    }
    log() {
        if (!this.enabled)
            return;
        var line = this.module + " ";
        for (var i in arguments) {
            if (typeof arguments[i] == "object")
                line += JSON.stringify(arguments[i]) + " ";
            else
                line += arguments[i] + " ";
        }
        console.log(this.colorize(line, this.color));
    }
    colorize(line, color) {
        return line;
    }
}

new logger$1("fakeDash");

var base64Vlq = {};

var base64$1 = {};

/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var intToCharMap = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split('');
/**
 * Encode an integer in the range of 0 to 63 to a single base 64 digit.
 */

base64$1.encode = function (number) {
  if (0 <= number && number < intToCharMap.length) {
    return intToCharMap[number];
  }

  throw new TypeError("Must be between 0 and 63: " + number);
};
/**
 * Decode a single base 64 character code digit to an integer. Returns -1 on
 * failure.
 */


base64$1.decode = function (charCode) {
  var bigA = 65; // 'A'

  var bigZ = 90; // 'Z'

  var littleA = 97; // 'a'

  var littleZ = 122; // 'z'

  var zero = 48; // '0'

  var nine = 57; // '9'

  var plus = 43; // '+'

  var slash = 47; // '/'

  var littleOffset = 26;
  var numberOffset = 52; // 0 - 25: ABCDEFGHIJKLMNOPQRSTUVWXYZ

  if (bigA <= charCode && charCode <= bigZ) {
    return charCode - bigA;
  } // 26 - 51: abcdefghijklmnopqrstuvwxyz


  if (littleA <= charCode && charCode <= littleZ) {
    return charCode - littleA + littleOffset;
  } // 52 - 61: 0123456789


  if (zero <= charCode && charCode <= nine) {
    return charCode - zero + numberOffset;
  } // 62: +


  if (charCode == plus) {
    return 62;
  } // 63: /


  if (charCode == slash) {
    return 63;
  } // Invalid base64 digit.


  return -1;
};

/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 *
 * Based on the Base 64 VLQ implementation in Closure Compiler:
 * https://code.google.com/p/closure-compiler/source/browse/trunk/src/com/google/debugging/sourcemap/Base64VLQ.java
 *
 * Copyright 2011 The Closure Compiler Authors. All rights reserved.
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *  * Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above
 *    copyright notice, this list of conditions and the following
 *    disclaimer in the documentation and/or other materials provided
 *    with the distribution.
 *  * Neither the name of Google Inc. nor the names of its
 *    contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

var base64 = base64$1; // A single base 64 digit can contain 6 bits of data. For the base 64 variable
// length quantities we use in the source map spec, the first bit is the sign,
// the next four bits are the actual value, and the 6th bit is the
// continuation bit. The continuation bit tells us whether there are more
// digits in this value following this digit.
//
//   Continuation
//   |    Sign
//   |    |
//   V    V
//   101011

var VLQ_BASE_SHIFT = 5; // binary: 100000

var VLQ_BASE = 1 << VLQ_BASE_SHIFT; // binary: 011111

var VLQ_BASE_MASK = VLQ_BASE - 1; // binary: 100000

var VLQ_CONTINUATION_BIT = VLQ_BASE;
/**
 * Converts from a two-complement value to a value where the sign bit is
 * placed in the least significant bit.  For example, as decimals:
 *   1 becomes 2 (10 binary), -1 becomes 3 (11 binary)
 *   2 becomes 4 (100 binary), -2 becomes 5 (101 binary)
 */

function toVLQSigned(aValue) {
  return aValue < 0 ? (-aValue << 1) + 1 : (aValue << 1) + 0;
}
/**
 * Converts to a two-complement value from a value where the sign bit is
 * placed in the least significant bit.  For example, as decimals:
 *   2 (10 binary) becomes 1, 3 (11 binary) becomes -1
 *   4 (100 binary) becomes 2, 5 (101 binary) becomes -2
 */


function fromVLQSigned(aValue) {
  var isNegative = (aValue & 1) === 1;
  var shifted = aValue >> 1;
  return isNegative ? -shifted : shifted;
}
/**
 * Returns the base 64 VLQ encoded value.
 */


base64Vlq.encode = function base64VLQ_encode(aValue) {
  var encoded = "";
  var digit;
  var vlq = toVLQSigned(aValue);

  do {
    digit = vlq & VLQ_BASE_MASK;
    vlq >>>= VLQ_BASE_SHIFT;

    if (vlq > 0) {
      // There are still more digits in this value, so we must make sure the
      // continuation bit is marked.
      digit |= VLQ_CONTINUATION_BIT;
    }

    encoded += base64.encode(digit);
  } while (vlq > 0);

  return encoded;
};
/**
 * Decodes the next base 64 VLQ value from the given string and returns the
 * value and the rest of the string via the out parameter.
 */


base64Vlq.decode = function base64VLQ_decode(aStr, aIndex, aOutParam) {
  var strLen = aStr.length;
  var result = 0;
  var shift = 0;
  var continuation, digit;

  do {
    if (aIndex >= strLen) {
      throw new Error("Expected more digits in base 64 VLQ value.");
    }

    digit = base64.decode(aStr.charCodeAt(aIndex++));

    if (digit === -1) {
      throw new Error("Invalid base64 digit: " + aStr.charAt(aIndex - 1));
    }

    continuation = !!(digit & VLQ_CONTINUATION_BIT);
    digit &= VLQ_BASE_MASK;
    result = result + (digit << shift);
    shift += VLQ_BASE_SHIFT;
  } while (continuation);

  aOutParam.value = fromVLQSigned(result);
  aOutParam.rest = aIndex;
};

var util$5 = {};

/* -*- Mode: js; js-indent-level: 2; -*- */

(function (exports) {
  /*
   * Copyright 2011 Mozilla Foundation and contributors
   * Licensed under the New BSD license. See LICENSE or:
   * http://opensource.org/licenses/BSD-3-Clause
   */

  /**
   * This is a helper function for getting values from parameter/options
   * objects.
   *
   * @param args The object we are extracting values from
   * @param name The name of the property we are getting.
   * @param defaultValue An optional value to return if the property is missing
   * from the object. If this is not specified and the property is missing, an
   * error will be thrown.
   */
  function getArg(aArgs, aName, aDefaultValue) {
    if (aName in aArgs) {
      return aArgs[aName];
    } else if (arguments.length === 3) {
      return aDefaultValue;
    } else {
      throw new Error('"' + aName + '" is a required argument.');
    }
  }

  exports.getArg = getArg;
  var urlRegexp = /^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.-]*)(?::(\d+))?(.*)$/;
  var dataUrlRegexp = /^data:.+\,.+$/;

  function urlParse(aUrl) {
    var match = aUrl.match(urlRegexp);

    if (!match) {
      return null;
    }

    return {
      scheme: match[1],
      auth: match[2],
      host: match[3],
      port: match[4],
      path: match[5]
    };
  }

  exports.urlParse = urlParse;

  function urlGenerate(aParsedUrl) {
    var url = '';

    if (aParsedUrl.scheme) {
      url += aParsedUrl.scheme + ':';
    }

    url += '//';

    if (aParsedUrl.auth) {
      url += aParsedUrl.auth + '@';
    }

    if (aParsedUrl.host) {
      url += aParsedUrl.host;
    }

    if (aParsedUrl.port) {
      url += ":" + aParsedUrl.port;
    }

    if (aParsedUrl.path) {
      url += aParsedUrl.path;
    }

    return url;
  }

  exports.urlGenerate = urlGenerate;
  /**
   * Normalizes a path, or the path portion of a URL:
   *
   * - Replaces consecutive slashes with one slash.
   * - Removes unnecessary '.' parts.
   * - Removes unnecessary '<dir>/..' parts.
   *
   * Based on code in the Node.js 'path' core module.
   *
   * @param aPath The path or url to normalize.
   */

  function normalize(aPath) {
    var path = aPath;
    var url = urlParse(aPath);

    if (url) {
      if (!url.path) {
        return aPath;
      }

      path = url.path;
    }

    var isAbsolute = exports.isAbsolute(path);
    var parts = path.split(/\/+/);

    for (var part, up = 0, i = parts.length - 1; i >= 0; i--) {
      part = parts[i];

      if (part === '.') {
        parts.splice(i, 1);
      } else if (part === '..') {
        up++;
      } else if (up > 0) {
        if (part === '') {
          // The first part is blank if the path is absolute. Trying to go
          // above the root is a no-op. Therefore we can remove all '..' parts
          // directly after the root.
          parts.splice(i + 1, up);
          up = 0;
        } else {
          parts.splice(i, 2);
          up--;
        }
      }
    }

    path = parts.join('/');

    if (path === '') {
      path = isAbsolute ? '/' : '.';
    }

    if (url) {
      url.path = path;
      return urlGenerate(url);
    }

    return path;
  }

  exports.normalize = normalize;
  /**
   * Joins two paths/URLs.
   *
   * @param aRoot The root path or URL.
   * @param aPath The path or URL to be joined with the root.
   *
   * - If aPath is a URL or a data URI, aPath is returned, unless aPath is a
   *   scheme-relative URL: Then the scheme of aRoot, if any, is prepended
   *   first.
   * - Otherwise aPath is a path. If aRoot is a URL, then its path portion
   *   is updated with the result and aRoot is returned. Otherwise the result
   *   is returned.
   *   - If aPath is absolute, the result is aPath.
   *   - Otherwise the two paths are joined with a slash.
   * - Joining for example 'http://' and 'www.example.com' is also supported.
   */

  function join(aRoot, aPath) {
    if (aRoot === "") {
      aRoot = ".";
    }

    if (aPath === "") {
      aPath = ".";
    }

    var aPathUrl = urlParse(aPath);
    var aRootUrl = urlParse(aRoot);

    if (aRootUrl) {
      aRoot = aRootUrl.path || '/';
    } // `join(foo, '//www.example.org')`


    if (aPathUrl && !aPathUrl.scheme) {
      if (aRootUrl) {
        aPathUrl.scheme = aRootUrl.scheme;
      }

      return urlGenerate(aPathUrl);
    }

    if (aPathUrl || aPath.match(dataUrlRegexp)) {
      return aPath;
    } // `join('http://', 'www.example.com')`


    if (aRootUrl && !aRootUrl.host && !aRootUrl.path) {
      aRootUrl.host = aPath;
      return urlGenerate(aRootUrl);
    }

    var joined = aPath.charAt(0) === '/' ? aPath : normalize(aRoot.replace(/\/+$/, '') + '/' + aPath);

    if (aRootUrl) {
      aRootUrl.path = joined;
      return urlGenerate(aRootUrl);
    }

    return joined;
  }

  exports.join = join;

  exports.isAbsolute = function (aPath) {
    return aPath.charAt(0) === '/' || urlRegexp.test(aPath);
  };
  /**
   * Make a path relative to a URL or another path.
   *
   * @param aRoot The root path or URL.
   * @param aPath The path or URL to be made relative to aRoot.
   */


  function relative(aRoot, aPath) {
    if (aRoot === "") {
      aRoot = ".";
    }

    aRoot = aRoot.replace(/\/$/, ''); // It is possible for the path to be above the root. In this case, simply
    // checking whether the root is a prefix of the path won't work. Instead, we
    // need to remove components from the root one by one, until either we find
    // a prefix that fits, or we run out of components to remove.

    var level = 0;

    while (aPath.indexOf(aRoot + '/') !== 0) {
      var index = aRoot.lastIndexOf("/");

      if (index < 0) {
        return aPath;
      } // If the only part of the root that is left is the scheme (i.e. http://,
      // file:///, etc.), one or more slashes (/), or simply nothing at all, we
      // have exhausted all components, so the path is not relative to the root.


      aRoot = aRoot.slice(0, index);

      if (aRoot.match(/^([^\/]+:\/)?\/*$/)) {
        return aPath;
      }

      ++level;
    } // Make sure we add a "../" for each component we removed from the root.


    return Array(level + 1).join("../") + aPath.substr(aRoot.length + 1);
  }

  exports.relative = relative;

  var supportsNullProto = function () {
    var obj = Object.create(null);
    return !('__proto__' in obj);
  }();

  function identity(s) {
    return s;
  }
  /**
   * Because behavior goes wacky when you set `__proto__` on objects, we
   * have to prefix all the strings in our set with an arbitrary character.
   *
   * See https://github.com/mozilla/source-map/pull/31 and
   * https://github.com/mozilla/source-map/issues/30
   *
   * @param String aStr
   */


  function toSetString(aStr) {
    if (isProtoString(aStr)) {
      return '$' + aStr;
    }

    return aStr;
  }

  exports.toSetString = supportsNullProto ? identity : toSetString;

  function fromSetString(aStr) {
    if (isProtoString(aStr)) {
      return aStr.slice(1);
    }

    return aStr;
  }

  exports.fromSetString = supportsNullProto ? identity : fromSetString;

  function isProtoString(s) {
    if (!s) {
      return false;
    }

    var length = s.length;

    if (length < 9
    /* "__proto__".length */
    ) {
      return false;
    }

    if (s.charCodeAt(length - 1) !== 95
    /* '_' */
    || s.charCodeAt(length - 2) !== 95
    /* '_' */
    || s.charCodeAt(length - 3) !== 111
    /* 'o' */
    || s.charCodeAt(length - 4) !== 116
    /* 't' */
    || s.charCodeAt(length - 5) !== 111
    /* 'o' */
    || s.charCodeAt(length - 6) !== 114
    /* 'r' */
    || s.charCodeAt(length - 7) !== 112
    /* 'p' */
    || s.charCodeAt(length - 8) !== 95
    /* '_' */
    || s.charCodeAt(length - 9) !== 95
    /* '_' */
    ) {
      return false;
    }

    for (var i = length - 10; i >= 0; i--) {
      if (s.charCodeAt(i) !== 36
      /* '$' */
      ) {
        return false;
      }
    }

    return true;
  }
  /**
   * Comparator between two mappings where the original positions are compared.
   *
   * Optionally pass in `true` as `onlyCompareGenerated` to consider two
   * mappings with the same original source/line/column, but different generated
   * line and column the same. Useful when searching for a mapping with a
   * stubbed out mapping.
   */


  function compareByOriginalPositions(mappingA, mappingB, onlyCompareOriginal) {
    var cmp = strcmp(mappingA.source, mappingB.source);

    if (cmp !== 0) {
      return cmp;
    }

    cmp = mappingA.originalLine - mappingB.originalLine;

    if (cmp !== 0) {
      return cmp;
    }

    cmp = mappingA.originalColumn - mappingB.originalColumn;

    if (cmp !== 0 || onlyCompareOriginal) {
      return cmp;
    }

    cmp = mappingA.generatedColumn - mappingB.generatedColumn;

    if (cmp !== 0) {
      return cmp;
    }

    cmp = mappingA.generatedLine - mappingB.generatedLine;

    if (cmp !== 0) {
      return cmp;
    }

    return strcmp(mappingA.name, mappingB.name);
  }

  exports.compareByOriginalPositions = compareByOriginalPositions;
  /**
   * Comparator between two mappings with deflated source and name indices where
   * the generated positions are compared.
   *
   * Optionally pass in `true` as `onlyCompareGenerated` to consider two
   * mappings with the same generated line and column, but different
   * source/name/original line and column the same. Useful when searching for a
   * mapping with a stubbed out mapping.
   */

  function compareByGeneratedPositionsDeflated(mappingA, mappingB, onlyCompareGenerated) {
    var cmp = mappingA.generatedLine - mappingB.generatedLine;

    if (cmp !== 0) {
      return cmp;
    }

    cmp = mappingA.generatedColumn - mappingB.generatedColumn;

    if (cmp !== 0 || onlyCompareGenerated) {
      return cmp;
    }

    cmp = strcmp(mappingA.source, mappingB.source);

    if (cmp !== 0) {
      return cmp;
    }

    cmp = mappingA.originalLine - mappingB.originalLine;

    if (cmp !== 0) {
      return cmp;
    }

    cmp = mappingA.originalColumn - mappingB.originalColumn;

    if (cmp !== 0) {
      return cmp;
    }

    return strcmp(mappingA.name, mappingB.name);
  }

  exports.compareByGeneratedPositionsDeflated = compareByGeneratedPositionsDeflated;

  function strcmp(aStr1, aStr2) {
    if (aStr1 === aStr2) {
      return 0;
    }

    if (aStr1 === null) {
      return 1; // aStr2 !== null
    }

    if (aStr2 === null) {
      return -1; // aStr1 !== null
    }

    if (aStr1 > aStr2) {
      return 1;
    }

    return -1;
  }
  /**
   * Comparator between two mappings with inflated source and name strings where
   * the generated positions are compared.
   */


  function compareByGeneratedPositionsInflated(mappingA, mappingB) {
    var cmp = mappingA.generatedLine - mappingB.generatedLine;

    if (cmp !== 0) {
      return cmp;
    }

    cmp = mappingA.generatedColumn - mappingB.generatedColumn;

    if (cmp !== 0) {
      return cmp;
    }

    cmp = strcmp(mappingA.source, mappingB.source);

    if (cmp !== 0) {
      return cmp;
    }

    cmp = mappingA.originalLine - mappingB.originalLine;

    if (cmp !== 0) {
      return cmp;
    }

    cmp = mappingA.originalColumn - mappingB.originalColumn;

    if (cmp !== 0) {
      return cmp;
    }

    return strcmp(mappingA.name, mappingB.name);
  }

  exports.compareByGeneratedPositionsInflated = compareByGeneratedPositionsInflated;
  /**
   * Strip any JSON XSSI avoidance prefix from the string (as documented
   * in the source maps specification), and then parse the string as
   * JSON.
   */

  function parseSourceMapInput(str) {
    return JSON.parse(str.replace(/^\)]}'[^\n]*\n/, ''));
  }

  exports.parseSourceMapInput = parseSourceMapInput;
  /**
   * Compute the URL of a source given the the source root, the source's
   * URL, and the source map's URL.
   */

  function computeSourceURL(sourceRoot, sourceURL, sourceMapURL) {
    sourceURL = sourceURL || '';

    if (sourceRoot) {
      // This follows what Chrome does.
      if (sourceRoot[sourceRoot.length - 1] !== '/' && sourceURL[0] !== '/') {
        sourceRoot += '/';
      } // The spec says:
      //   Line 4: An optional source root, useful for relocating source
      //   files on a server or removing repeated values in the
      //   “sources” entry.  This value is prepended to the individual
      //   entries in the “source” field.


      sourceURL = sourceRoot + sourceURL;
    } // Historically, SourceMapConsumer did not take the sourceMapURL as
    // a parameter.  This mode is still somewhat supported, which is why
    // this code block is conditional.  However, it's preferable to pass
    // the source map URL to SourceMapConsumer, so that this function
    // can implement the source URL resolution algorithm as outlined in
    // the spec.  This block is basically the equivalent of:
    //    new URL(sourceURL, sourceMapURL).toString()
    // ... except it avoids using URL, which wasn't available in the
    // older releases of node still supported by this library.
    //
    // The spec says:
    //   If the sources are not absolute URLs after prepending of the
    //   “sourceRoot”, the sources are resolved relative to the
    //   SourceMap (like resolving script src in a html document).


    if (sourceMapURL) {
      var parsed = urlParse(sourceMapURL);

      if (!parsed) {
        throw new Error("sourceMapURL could not be parsed");
      }

      if (parsed.path) {
        // Strip the last path component, but keep the "/".
        var index = parsed.path.lastIndexOf('/');

        if (index >= 0) {
          parsed.path = parsed.path.substring(0, index + 1);
        }
      }

      sourceURL = join(urlGenerate(parsed), sourceURL);
    }

    return normalize(sourceURL);
  }

  exports.computeSourceURL = computeSourceURL;
})(util$5);

var arraySet = {};

/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var util$4 = util$5;
var has = Object.prototype.hasOwnProperty;
var hasNativeMap = typeof Map !== "undefined";
/**
 * A data structure which is a combination of an array and a set. Adding a new
 * member is O(1), testing for membership is O(1), and finding the index of an
 * element is O(1). Removing elements from the set is not supported. Only
 * strings are supported for membership.
 */

function ArraySet$2() {
  this._array = [];
  this._set = hasNativeMap ? new Map() : Object.create(null);
}
/**
 * Static method for creating ArraySet instances from an existing array.
 */


ArraySet$2.fromArray = function ArraySet_fromArray(aArray, aAllowDuplicates) {
  var set = new ArraySet$2();

  for (var i = 0, len = aArray.length; i < len; i++) {
    set.add(aArray[i], aAllowDuplicates);
  }

  return set;
};
/**
 * Return how many unique items are in this ArraySet. If duplicates have been
 * added, than those do not count towards the size.
 *
 * @returns Number
 */


ArraySet$2.prototype.size = function ArraySet_size() {
  return hasNativeMap ? this._set.size : Object.getOwnPropertyNames(this._set).length;
};
/**
 * Add the given string to this set.
 *
 * @param String aStr
 */


ArraySet$2.prototype.add = function ArraySet_add(aStr, aAllowDuplicates) {
  var sStr = hasNativeMap ? aStr : util$4.toSetString(aStr);
  var isDuplicate = hasNativeMap ? this.has(aStr) : has.call(this._set, sStr);
  var idx = this._array.length;

  if (!isDuplicate || aAllowDuplicates) {
    this._array.push(aStr);
  }

  if (!isDuplicate) {
    if (hasNativeMap) {
      this._set.set(aStr, idx);
    } else {
      this._set[sStr] = idx;
    }
  }
};
/**
 * Is the given string a member of this set?
 *
 * @param String aStr
 */


ArraySet$2.prototype.has = function ArraySet_has(aStr) {
  if (hasNativeMap) {
    return this._set.has(aStr);
  } else {
    var sStr = util$4.toSetString(aStr);
    return has.call(this._set, sStr);
  }
};
/**
 * What is the index of the given string in the array?
 *
 * @param String aStr
 */


ArraySet$2.prototype.indexOf = function ArraySet_indexOf(aStr) {
  if (hasNativeMap) {
    var idx = this._set.get(aStr);

    if (idx >= 0) {
      return idx;
    }
  } else {
    var sStr = util$4.toSetString(aStr);

    if (has.call(this._set, sStr)) {
      return this._set[sStr];
    }
  }

  throw new Error('"' + aStr + '" is not in the set.');
};
/**
 * What is the element at the given index?
 *
 * @param Number aIdx
 */


ArraySet$2.prototype.at = function ArraySet_at(aIdx) {
  if (aIdx >= 0 && aIdx < this._array.length) {
    return this._array[aIdx];
  }

  throw new Error('No element indexed by ' + aIdx);
};
/**
 * Returns the array representation of this set (which has the proper indices
 * indicated by indexOf). Note that this is a copy of the internal array used
 * for storing the members so that no one can mess with internal state.
 */


ArraySet$2.prototype.toArray = function ArraySet_toArray() {
  return this._array.slice();
};

arraySet.ArraySet = ArraySet$2;

var mappingList = {};

/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2014 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var util$3 = util$5;
/**
 * Determine whether mappingB is after mappingA with respect to generated
 * position.
 */

function generatedPositionAfter(mappingA, mappingB) {
  // Optimized for most common case
  var lineA = mappingA.generatedLine;
  var lineB = mappingB.generatedLine;
  var columnA = mappingA.generatedColumn;
  var columnB = mappingB.generatedColumn;
  return lineB > lineA || lineB == lineA && columnB >= columnA || util$3.compareByGeneratedPositionsInflated(mappingA, mappingB) <= 0;
}
/**
 * A data structure to provide a sorted view of accumulated mappings in a
 * performance conscious manner. It trades a neglibable overhead in general
 * case for a large speedup in case of mappings being added in order.
 */


function MappingList$1() {
  this._array = [];
  this._sorted = true; // Serves as infimum

  this._last = {
    generatedLine: -1,
    generatedColumn: 0
  };
}
/**
 * Iterate through internal items. This method takes the same arguments that
 * `Array.prototype.forEach` takes.
 *
 * NOTE: The order of the mappings is NOT guaranteed.
 */


MappingList$1.prototype.unsortedForEach = function MappingList_forEach(aCallback, aThisArg) {
  this._array.forEach(aCallback, aThisArg);
};
/**
 * Add the given source mapping.
 *
 * @param Object aMapping
 */


MappingList$1.prototype.add = function MappingList_add(aMapping) {
  if (generatedPositionAfter(this._last, aMapping)) {
    this._last = aMapping;

    this._array.push(aMapping);
  } else {
    this._sorted = false;

    this._array.push(aMapping);
  }
};
/**
 * Returns the flat, sorted array of mappings. The mappings are sorted by
 * generated position.
 *
 * WARNING: This method returns internal data without copying, for
 * performance. The return value must NOT be mutated, and should be treated as
 * an immutable borrow. If you want to take ownership, you must make your own
 * copy.
 */


MappingList$1.prototype.toArray = function MappingList_toArray() {
  if (!this._sorted) {
    this._array.sort(util$3.compareByGeneratedPositionsInflated);

    this._sorted = true;
  }

  return this._array;
};

mappingList.MappingList = MappingList$1;

/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var base64VLQ$1 = base64Vlq;
var util$2 = util$5;
var ArraySet$1 = arraySet.ArraySet;
var MappingList = mappingList.MappingList;
/**
 * An instance of the SourceMapGenerator represents a source map which is
 * being built incrementally. You may pass an object with the following
 * properties:
 *
 *   - file: The filename of the generated source.
 *   - sourceRoot: A root for all relative URLs in this source map.
 */

function SourceMapGenerator$1(aArgs) {
  if (!aArgs) {
    aArgs = {};
  }

  this._file = util$2.getArg(aArgs, 'file', null);
  this._sourceRoot = util$2.getArg(aArgs, 'sourceRoot', null);
  this._skipValidation = util$2.getArg(aArgs, 'skipValidation', false);
  this._sources = new ArraySet$1();
  this._names = new ArraySet$1();
  this._mappings = new MappingList();
  this._sourcesContents = null;
}

SourceMapGenerator$1.prototype._version = 3;
/**
 * Creates a new SourceMapGenerator based on a SourceMapConsumer
 *
 * @param aSourceMapConsumer The SourceMap.
 */

SourceMapGenerator$1.fromSourceMap = function SourceMapGenerator_fromSourceMap(aSourceMapConsumer) {
  var sourceRoot = aSourceMapConsumer.sourceRoot;
  var generator = new SourceMapGenerator$1({
    file: aSourceMapConsumer.file,
    sourceRoot: sourceRoot
  });
  aSourceMapConsumer.eachMapping(function (mapping) {
    var newMapping = {
      generated: {
        line: mapping.generatedLine,
        column: mapping.generatedColumn
      }
    };

    if (mapping.source != null) {
      newMapping.source = mapping.source;

      if (sourceRoot != null) {
        newMapping.source = util$2.relative(sourceRoot, newMapping.source);
      }

      newMapping.original = {
        line: mapping.originalLine,
        column: mapping.originalColumn
      };

      if (mapping.name != null) {
        newMapping.name = mapping.name;
      }
    }

    generator.addMapping(newMapping);
  });
  aSourceMapConsumer.sources.forEach(function (sourceFile) {
    var sourceRelative = sourceFile;

    if (sourceRoot !== null) {
      sourceRelative = util$2.relative(sourceRoot, sourceFile);
    }

    if (!generator._sources.has(sourceRelative)) {
      generator._sources.add(sourceRelative);
    }

    var content = aSourceMapConsumer.sourceContentFor(sourceFile);

    if (content != null) {
      generator.setSourceContent(sourceFile, content);
    }
  });
  return generator;
};
/**
 * Add a single mapping from original source line and column to the generated
 * source's line and column for this source map being created. The mapping
 * object should have the following properties:
 *
 *   - generated: An object with the generated line and column positions.
 *   - original: An object with the original line and column positions.
 *   - source: The original source file (relative to the sourceRoot).
 *   - name: An optional original token name for this mapping.
 */


SourceMapGenerator$1.prototype.addMapping = function SourceMapGenerator_addMapping(aArgs) {
  var generated = util$2.getArg(aArgs, 'generated');
  var original = util$2.getArg(aArgs, 'original', null);
  var source = util$2.getArg(aArgs, 'source', null);
  var name = util$2.getArg(aArgs, 'name', null);

  if (!this._skipValidation) {
    this._validateMapping(generated, original, source, name);
  }

  if (source != null) {
    source = String(source);

    if (!this._sources.has(source)) {
      this._sources.add(source);
    }
  }

  if (name != null) {
    name = String(name);

    if (!this._names.has(name)) {
      this._names.add(name);
    }
  }

  this._mappings.add({
    generatedLine: generated.line,
    generatedColumn: generated.column,
    originalLine: original != null && original.line,
    originalColumn: original != null && original.column,
    source: source,
    name: name
  });
};
/**
 * Set the source content for a source file.
 */


SourceMapGenerator$1.prototype.setSourceContent = function SourceMapGenerator_setSourceContent(aSourceFile, aSourceContent) {
  var source = aSourceFile;

  if (this._sourceRoot != null) {
    source = util$2.relative(this._sourceRoot, source);
  }

  if (aSourceContent != null) {
    // Add the source content to the _sourcesContents map.
    // Create a new _sourcesContents map if the property is null.
    if (!this._sourcesContents) {
      this._sourcesContents = Object.create(null);
    }

    this._sourcesContents[util$2.toSetString(source)] = aSourceContent;
  } else if (this._sourcesContents) {
    // Remove the source file from the _sourcesContents map.
    // If the _sourcesContents map is empty, set the property to null.
    delete this._sourcesContents[util$2.toSetString(source)];

    if (Object.keys(this._sourcesContents).length === 0) {
      this._sourcesContents = null;
    }
  }
};
/**
 * Applies the mappings of a sub-source-map for a specific source file to the
 * source map being generated. Each mapping to the supplied source file is
 * rewritten using the supplied source map. Note: The resolution for the
 * resulting mappings is the minimium of this map and the supplied map.
 *
 * @param aSourceMapConsumer The source map to be applied.
 * @param aSourceFile Optional. The filename of the source file.
 *        If omitted, SourceMapConsumer's file property will be used.
 * @param aSourceMapPath Optional. The dirname of the path to the source map
 *        to be applied. If relative, it is relative to the SourceMapConsumer.
 *        This parameter is needed when the two source maps aren't in the same
 *        directory, and the source map to be applied contains relative source
 *        paths. If so, those relative source paths need to be rewritten
 *        relative to the SourceMapGenerator.
 */


SourceMapGenerator$1.prototype.applySourceMap = function SourceMapGenerator_applySourceMap(aSourceMapConsumer, aSourceFile, aSourceMapPath) {
  var sourceFile = aSourceFile; // If aSourceFile is omitted, we will use the file property of the SourceMap

  if (aSourceFile == null) {
    if (aSourceMapConsumer.file == null) {
      throw new Error('SourceMapGenerator.prototype.applySourceMap requires either an explicit source file, ' + 'or the source map\'s "file" property. Both were omitted.');
    }

    sourceFile = aSourceMapConsumer.file;
  }

  var sourceRoot = this._sourceRoot; // Make "sourceFile" relative if an absolute Url is passed.

  if (sourceRoot != null) {
    sourceFile = util$2.relative(sourceRoot, sourceFile);
  } // Applying the SourceMap can add and remove items from the sources and
  // the names array.


  var newSources = new ArraySet$1();
  var newNames = new ArraySet$1(); // Find mappings for the "sourceFile"

  this._mappings.unsortedForEach(function (mapping) {
    if (mapping.source === sourceFile && mapping.originalLine != null) {
      // Check if it can be mapped by the source map, then update the mapping.
      var original = aSourceMapConsumer.originalPositionFor({
        line: mapping.originalLine,
        column: mapping.originalColumn
      });

      if (original.source != null) {
        // Copy mapping
        mapping.source = original.source;

        if (aSourceMapPath != null) {
          mapping.source = util$2.join(aSourceMapPath, mapping.source);
        }

        if (sourceRoot != null) {
          mapping.source = util$2.relative(sourceRoot, mapping.source);
        }

        mapping.originalLine = original.line;
        mapping.originalColumn = original.column;

        if (original.name != null) {
          mapping.name = original.name;
        }
      }
    }

    var source = mapping.source;

    if (source != null && !newSources.has(source)) {
      newSources.add(source);
    }

    var name = mapping.name;

    if (name != null && !newNames.has(name)) {
      newNames.add(name);
    }
  }, this);

  this._sources = newSources;
  this._names = newNames; // Copy sourcesContents of applied map.

  aSourceMapConsumer.sources.forEach(function (sourceFile) {
    var content = aSourceMapConsumer.sourceContentFor(sourceFile);

    if (content != null) {
      if (aSourceMapPath != null) {
        sourceFile = util$2.join(aSourceMapPath, sourceFile);
      }

      if (sourceRoot != null) {
        sourceFile = util$2.relative(sourceRoot, sourceFile);
      }

      this.setSourceContent(sourceFile, content);
    }
  }, this);
};
/**
 * A mapping can have one of the three levels of data:
 *
 *   1. Just the generated position.
 *   2. The Generated position, original position, and original source.
 *   3. Generated and original position, original source, as well as a name
 *      token.
 *
 * To maintain consistency, we validate that any new mapping being added falls
 * in to one of these categories.
 */


SourceMapGenerator$1.prototype._validateMapping = function SourceMapGenerator_validateMapping(aGenerated, aOriginal, aSource, aName) {
  // When aOriginal is truthy but has empty values for .line and .column,
  // it is most likely a programmer error. In this case we throw a very
  // specific error message to try to guide them the right way.
  // For example: https://github.com/Polymer/polymer-bundler/pull/519
  if (aOriginal && typeof aOriginal.line !== 'number' && typeof aOriginal.column !== 'number') {
    throw new Error('original.line and original.column are not numbers -- you probably meant to omit ' + 'the original mapping entirely and only map the generated position. If so, pass ' + 'null for the original mapping instead of an object with empty or null values.');
  }

  if (aGenerated && 'line' in aGenerated && 'column' in aGenerated && aGenerated.line > 0 && aGenerated.column >= 0 && !aOriginal && !aSource && !aName) {
    // Case 1.
    return;
  } else if (aGenerated && 'line' in aGenerated && 'column' in aGenerated && aOriginal && 'line' in aOriginal && 'column' in aOriginal && aGenerated.line > 0 && aGenerated.column >= 0 && aOriginal.line > 0 && aOriginal.column >= 0 && aSource) {
    // Cases 2 and 3.
    return;
  } else {
    throw new Error('Invalid mapping: ' + JSON.stringify({
      generated: aGenerated,
      source: aSource,
      original: aOriginal,
      name: aName
    }));
  }
};
/**
 * Serialize the accumulated mappings in to the stream of base 64 VLQs
 * specified by the source map format.
 */


SourceMapGenerator$1.prototype._serializeMappings = function SourceMapGenerator_serializeMappings() {
  var previousGeneratedColumn = 0;
  var previousGeneratedLine = 1;
  var previousOriginalColumn = 0;
  var previousOriginalLine = 0;
  var previousName = 0;
  var previousSource = 0;
  var result = '';
  var next;
  var mapping;
  var nameIdx;
  var sourceIdx;

  var mappings = this._mappings.toArray();

  for (var i = 0, len = mappings.length; i < len; i++) {
    mapping = mappings[i];
    next = '';

    if (mapping.generatedLine !== previousGeneratedLine) {
      previousGeneratedColumn = 0;

      while (mapping.generatedLine !== previousGeneratedLine) {
        next += ';';
        previousGeneratedLine++;
      }
    } else {
      if (i > 0) {
        if (!util$2.compareByGeneratedPositionsInflated(mapping, mappings[i - 1])) {
          continue;
        }

        next += ',';
      }
    }

    next += base64VLQ$1.encode(mapping.generatedColumn - previousGeneratedColumn);
    previousGeneratedColumn = mapping.generatedColumn;

    if (mapping.source != null) {
      sourceIdx = this._sources.indexOf(mapping.source);
      next += base64VLQ$1.encode(sourceIdx - previousSource);
      previousSource = sourceIdx; // lines are stored 0-based in SourceMap spec version 3

      next += base64VLQ$1.encode(mapping.originalLine - 1 - previousOriginalLine);
      previousOriginalLine = mapping.originalLine - 1;
      next += base64VLQ$1.encode(mapping.originalColumn - previousOriginalColumn);
      previousOriginalColumn = mapping.originalColumn;

      if (mapping.name != null) {
        nameIdx = this._names.indexOf(mapping.name);
        next += base64VLQ$1.encode(nameIdx - previousName);
        previousName = nameIdx;
      }
    }

    result += next;
  }

  return result;
};

SourceMapGenerator$1.prototype._generateSourcesContent = function SourceMapGenerator_generateSourcesContent(aSources, aSourceRoot) {
  return aSources.map(function (source) {
    if (!this._sourcesContents) {
      return null;
    }

    if (aSourceRoot != null) {
      source = util$2.relative(aSourceRoot, source);
    }

    var key = util$2.toSetString(source);
    return Object.prototype.hasOwnProperty.call(this._sourcesContents, key) ? this._sourcesContents[key] : null;
  }, this);
};
/**
 * Externalize the source map.
 */


SourceMapGenerator$1.prototype.toJSON = function SourceMapGenerator_toJSON() {
  var map = {
    version: this._version,
    sources: this._sources.toArray(),
    names: this._names.toArray(),
    mappings: this._serializeMappings()
  };

  if (this._file != null) {
    map.file = this._file;
  }

  if (this._sourceRoot != null) {
    map.sourceRoot = this._sourceRoot;
  }

  if (this._sourcesContents) {
    map.sourcesContent = this._generateSourcesContent(map.sources, map.sourceRoot);
  }

  return map;
};
/**
 * Render the source map being generated to a string.
 */


SourceMapGenerator$1.prototype.toString = function SourceMapGenerator_toString() {
  return JSON.stringify(this.toJSON());
};

var binarySearch$1 = {};

/* -*- Mode: js; js-indent-level: 2; -*- */

(function (exports) {
  /*
   * Copyright 2011 Mozilla Foundation and contributors
   * Licensed under the New BSD license. See LICENSE or:
   * http://opensource.org/licenses/BSD-3-Clause
   */
  exports.GREATEST_LOWER_BOUND = 1;
  exports.LEAST_UPPER_BOUND = 2;
  /**
   * Recursive implementation of binary search.
   *
   * @param aLow Indices here and lower do not contain the needle.
   * @param aHigh Indices here and higher do not contain the needle.
   * @param aNeedle The element being searched for.
   * @param aHaystack The non-empty array being searched.
   * @param aCompare Function which takes two elements and returns -1, 0, or 1.
   * @param aBias Either 'binarySearch.GREATEST_LOWER_BOUND' or
   *     'binarySearch.LEAST_UPPER_BOUND'. Specifies whether to return the
   *     closest element that is smaller than or greater than the one we are
   *     searching for, respectively, if the exact element cannot be found.
   */

  function recursiveSearch(aLow, aHigh, aNeedle, aHaystack, aCompare, aBias) {
    // This function terminates when one of the following is true:
    //
    //   1. We find the exact element we are looking for.
    //
    //   2. We did not find the exact element, but we can return the index of
    //      the next-closest element.
    //
    //   3. We did not find the exact element, and there is no next-closest
    //      element than the one we are searching for, so we return -1.
    var mid = Math.floor((aHigh - aLow) / 2) + aLow;
    var cmp = aCompare(aNeedle, aHaystack[mid], true);

    if (cmp === 0) {
      // Found the element we are looking for.
      return mid;
    } else if (cmp > 0) {
      // Our needle is greater than aHaystack[mid].
      if (aHigh - mid > 1) {
        // The element is in the upper half.
        return recursiveSearch(mid, aHigh, aNeedle, aHaystack, aCompare, aBias);
      } // The exact needle element was not found in this haystack. Determine if
      // we are in termination case (3) or (2) and return the appropriate thing.


      if (aBias == exports.LEAST_UPPER_BOUND) {
        return aHigh < aHaystack.length ? aHigh : -1;
      } else {
        return mid;
      }
    } else {
      // Our needle is less than aHaystack[mid].
      if (mid - aLow > 1) {
        // The element is in the lower half.
        return recursiveSearch(aLow, mid, aNeedle, aHaystack, aCompare, aBias);
      } // we are in termination case (3) or (2) and return the appropriate thing.


      if (aBias == exports.LEAST_UPPER_BOUND) {
        return mid;
      } else {
        return aLow < 0 ? -1 : aLow;
      }
    }
  }
  /**
   * This is an implementation of binary search which will always try and return
   * the index of the closest element if there is no exact hit. This is because
   * mappings between original and generated line/col pairs are single points,
   * and there is an implicit region between each of them, so a miss just means
   * that you aren't on the very start of a region.
   *
   * @param aNeedle The element you are looking for.
   * @param aHaystack The array that is being searched.
   * @param aCompare A function which takes the needle and an element in the
   *     array and returns -1, 0, or 1 depending on whether the needle is less
   *     than, equal to, or greater than the element, respectively.
   * @param aBias Either 'binarySearch.GREATEST_LOWER_BOUND' or
   *     'binarySearch.LEAST_UPPER_BOUND'. Specifies whether to return the
   *     closest element that is smaller than or greater than the one we are
   *     searching for, respectively, if the exact element cannot be found.
   *     Defaults to 'binarySearch.GREATEST_LOWER_BOUND'.
   */


  exports.search = function search(aNeedle, aHaystack, aCompare, aBias) {
    if (aHaystack.length === 0) {
      return -1;
    }

    var index = recursiveSearch(-1, aHaystack.length, aNeedle, aHaystack, aCompare, aBias || exports.GREATEST_LOWER_BOUND);

    if (index < 0) {
      return -1;
    } // We have found either the exact element, or the next-closest element than
    // the one we are searching for. However, there may be more than one such
    // element. Make sure we always return the smallest of these.


    while (index - 1 >= 0) {
      if (aCompare(aHaystack[index], aHaystack[index - 1], true) !== 0) {
        break;
      }

      --index;
    }

    return index;
  };
})(binarySearch$1);

var quickSort$1 = {};

/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
// It turns out that some (most?) JavaScript engines don't self-host
// `Array.prototype.sort`. This makes sense because C++ will likely remain
// faster than JS when doing raw CPU-intensive sorting. However, when using a
// custom comparator function, calling back and forth between the VM's C++ and
// JIT'd JS is rather slow *and* loses JIT type information, resulting in
// worse generated code for the comparator function than would be optimal. In
// fact, when sorting with a comparator, these costs outweigh the benefits of
// sorting in C++. By using our own JS-implemented Quick Sort (below), we get
// a ~3500ms mean speed-up in `bench/bench.html`.

/**
 * Swap the elements indexed by `x` and `y` in the array `ary`.
 *
 * @param {Array} ary
 *        The array.
 * @param {Number} x
 *        The index of the first item.
 * @param {Number} y
 *        The index of the second item.
 */

function swap(ary, x, y) {
  var temp = ary[x];
  ary[x] = ary[y];
  ary[y] = temp;
}
/**
 * Returns a random integer within the range `low .. high` inclusive.
 *
 * @param {Number} low
 *        The lower bound on the range.
 * @param {Number} high
 *        The upper bound on the range.
 */


function randomIntInRange(low, high) {
  return Math.round(low + Math.random() * (high - low));
}
/**
 * The Quick Sort algorithm.
 *
 * @param {Array} ary
 *        An array to sort.
 * @param {function} comparator
 *        Function to use to compare two items.
 * @param {Number} p
 *        Start index of the array
 * @param {Number} r
 *        End index of the array
 */


function doQuickSort(ary, comparator, p, r) {
  // If our lower bound is less than our upper bound, we (1) partition the
  // array into two pieces and (2) recurse on each half. If it is not, this is
  // the empty array and our base case.
  if (p < r) {
    // (1) Partitioning.
    //
    // The partitioning chooses a pivot between `p` and `r` and moves all
    // elements that are less than or equal to the pivot to the before it, and
    // all the elements that are greater than it after it. The effect is that
    // once partition is done, the pivot is in the exact place it will be when
    // the array is put in sorted order, and it will not need to be moved
    // again. This runs in O(n) time.
    // Always choose a random pivot so that an input array which is reverse
    // sorted does not cause O(n^2) running time.
    var pivotIndex = randomIntInRange(p, r);
    var i = p - 1;
    swap(ary, pivotIndex, r);
    var pivot = ary[r]; // Immediately after `j` is incremented in this loop, the following hold
    // true:
    //
    //   * Every element in `ary[p .. i]` is less than or equal to the pivot.
    //
    //   * Every element in `ary[i+1 .. j-1]` is greater than the pivot.

    for (var j = p; j < r; j++) {
      if (comparator(ary[j], pivot) <= 0) {
        i += 1;
        swap(ary, i, j);
      }
    }

    swap(ary, i + 1, j);
    var q = i + 1; // (2) Recurse on each half.

    doQuickSort(ary, comparator, p, q - 1);
    doQuickSort(ary, comparator, q + 1, r);
  }
}
/**
 * Sort the given array in-place with the given comparator function.
 *
 * @param {Array} ary
 *        An array to sort.
 * @param {function} comparator
 *        Function to use to compare two items.
 */


quickSort$1.quickSort = function (ary, comparator) {
  doQuickSort(ary, comparator, 0, ary.length - 1);
};

/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var util$1 = util$5;
var binarySearch = binarySearch$1;
var ArraySet = arraySet.ArraySet;
var base64VLQ = base64Vlq;
var quickSort = quickSort$1.quickSort;

function SourceMapConsumer(aSourceMap, aSourceMapURL) {
  var sourceMap = aSourceMap;

  if (typeof aSourceMap === 'string') {
    sourceMap = util$1.parseSourceMapInput(aSourceMap);
  }

  return sourceMap.sections != null ? new IndexedSourceMapConsumer(sourceMap, aSourceMapURL) : new BasicSourceMapConsumer(sourceMap, aSourceMapURL);
}

SourceMapConsumer.fromSourceMap = function (aSourceMap, aSourceMapURL) {
  return BasicSourceMapConsumer.fromSourceMap(aSourceMap, aSourceMapURL);
};
/**
 * The version of the source mapping spec that we are consuming.
 */


SourceMapConsumer.prototype._version = 3; // `__generatedMappings` and `__originalMappings` are arrays that hold the
// parsed mapping coordinates from the source map's "mappings" attribute. They
// are lazily instantiated, accessed via the `_generatedMappings` and
// `_originalMappings` getters respectively, and we only parse the mappings
// and create these arrays once queried for a source location. We jump through
// these hoops because there can be many thousands of mappings, and parsing
// them is expensive, so we only want to do it if we must.
//
// Each object in the arrays is of the form:
//
//     {
//       generatedLine: The line number in the generated code,
//       generatedColumn: The column number in the generated code,
//       source: The path to the original source file that generated this
//               chunk of code,
//       originalLine: The line number in the original source that
//                     corresponds to this chunk of generated code,
//       originalColumn: The column number in the original source that
//                       corresponds to this chunk of generated code,
//       name: The name of the original symbol which generated this chunk of
//             code.
//     }
//
// All properties except for `generatedLine` and `generatedColumn` can be
// `null`.
//
// `_generatedMappings` is ordered by the generated positions.
//
// `_originalMappings` is ordered by the original positions.

SourceMapConsumer.prototype.__generatedMappings = null;
Object.defineProperty(SourceMapConsumer.prototype, '_generatedMappings', {
  configurable: true,
  enumerable: true,
  get: function () {
    if (!this.__generatedMappings) {
      this._parseMappings(this._mappings, this.sourceRoot);
    }

    return this.__generatedMappings;
  }
});
SourceMapConsumer.prototype.__originalMappings = null;
Object.defineProperty(SourceMapConsumer.prototype, '_originalMappings', {
  configurable: true,
  enumerable: true,
  get: function () {
    if (!this.__originalMappings) {
      this._parseMappings(this._mappings, this.sourceRoot);
    }

    return this.__originalMappings;
  }
});

SourceMapConsumer.prototype._charIsMappingSeparator = function SourceMapConsumer_charIsMappingSeparator(aStr, index) {
  var c = aStr.charAt(index);
  return c === ";" || c === ",";
};
/**
 * Parse the mappings in a string in to a data structure which we can easily
 * query (the ordered arrays in the `this.__generatedMappings` and
 * `this.__originalMappings` properties).
 */


SourceMapConsumer.prototype._parseMappings = function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
  throw new Error("Subclasses must implement _parseMappings");
};

SourceMapConsumer.GENERATED_ORDER = 1;
SourceMapConsumer.ORIGINAL_ORDER = 2;
SourceMapConsumer.GREATEST_LOWER_BOUND = 1;
SourceMapConsumer.LEAST_UPPER_BOUND = 2;
/**
 * Iterate over each mapping between an original source/line/column and a
 * generated line/column in this source map.
 *
 * @param Function aCallback
 *        The function that is called with each mapping.
 * @param Object aContext
 *        Optional. If specified, this object will be the value of `this` every
 *        time that `aCallback` is called.
 * @param aOrder
 *        Either `SourceMapConsumer.GENERATED_ORDER` or
 *        `SourceMapConsumer.ORIGINAL_ORDER`. Specifies whether you want to
 *        iterate over the mappings sorted by the generated file's line/column
 *        order or the original's source/line/column order, respectively. Defaults to
 *        `SourceMapConsumer.GENERATED_ORDER`.
 */

SourceMapConsumer.prototype.eachMapping = function SourceMapConsumer_eachMapping(aCallback, aContext, aOrder) {
  var context = aContext || null;
  var order = aOrder || SourceMapConsumer.GENERATED_ORDER;
  var mappings;

  switch (order) {
    case SourceMapConsumer.GENERATED_ORDER:
      mappings = this._generatedMappings;
      break;

    case SourceMapConsumer.ORIGINAL_ORDER:
      mappings = this._originalMappings;
      break;

    default:
      throw new Error("Unknown order of iteration.");
  }

  var sourceRoot = this.sourceRoot;
  mappings.map(function (mapping) {
    var source = mapping.source === null ? null : this._sources.at(mapping.source);
    source = util$1.computeSourceURL(sourceRoot, source, this._sourceMapURL);
    return {
      source: source,
      generatedLine: mapping.generatedLine,
      generatedColumn: mapping.generatedColumn,
      originalLine: mapping.originalLine,
      originalColumn: mapping.originalColumn,
      name: mapping.name === null ? null : this._names.at(mapping.name)
    };
  }, this).forEach(aCallback, context);
};
/**
 * Returns all generated line and column information for the original source,
 * line, and column provided. If no column is provided, returns all mappings
 * corresponding to a either the line we are searching for or the next
 * closest line that has any mappings. Otherwise, returns all mappings
 * corresponding to the given line and either the column we are searching for
 * or the next closest column that has any offsets.
 *
 * The only argument is an object with the following properties:
 *
 *   - source: The filename of the original source.
 *   - line: The line number in the original source.  The line number is 1-based.
 *   - column: Optional. the column number in the original source.
 *    The column number is 0-based.
 *
 * and an array of objects is returned, each with the following properties:
 *
 *   - line: The line number in the generated source, or null.  The
 *    line number is 1-based.
 *   - column: The column number in the generated source, or null.
 *    The column number is 0-based.
 */


SourceMapConsumer.prototype.allGeneratedPositionsFor = function SourceMapConsumer_allGeneratedPositionsFor(aArgs) {
  var line = util$1.getArg(aArgs, 'line'); // When there is no exact match, BasicSourceMapConsumer.prototype._findMapping
  // returns the index of the closest mapping less than the needle. By
  // setting needle.originalColumn to 0, we thus find the last mapping for
  // the given line, provided such a mapping exists.

  var needle = {
    source: util$1.getArg(aArgs, 'source'),
    originalLine: line,
    originalColumn: util$1.getArg(aArgs, 'column', 0)
  };
  needle.source = this._findSourceIndex(needle.source);

  if (needle.source < 0) {
    return [];
  }

  var mappings = [];

  var index = this._findMapping(needle, this._originalMappings, "originalLine", "originalColumn", util$1.compareByOriginalPositions, binarySearch.LEAST_UPPER_BOUND);

  if (index >= 0) {
    var mapping = this._originalMappings[index];

    if (aArgs.column === undefined) {
      var originalLine = mapping.originalLine; // Iterate until either we run out of mappings, or we run into
      // a mapping for a different line than the one we found. Since
      // mappings are sorted, this is guaranteed to find all mappings for
      // the line we found.

      while (mapping && mapping.originalLine === originalLine) {
        mappings.push({
          line: util$1.getArg(mapping, 'generatedLine', null),
          column: util$1.getArg(mapping, 'generatedColumn', null),
          lastColumn: util$1.getArg(mapping, 'lastGeneratedColumn', null)
        });
        mapping = this._originalMappings[++index];
      }
    } else {
      var originalColumn = mapping.originalColumn; // Iterate until either we run out of mappings, or we run into
      // a mapping for a different line than the one we were searching for.
      // Since mappings are sorted, this is guaranteed to find all mappings for
      // the line we are searching for.

      while (mapping && mapping.originalLine === line && mapping.originalColumn == originalColumn) {
        mappings.push({
          line: util$1.getArg(mapping, 'generatedLine', null),
          column: util$1.getArg(mapping, 'generatedColumn', null),
          lastColumn: util$1.getArg(mapping, 'lastGeneratedColumn', null)
        });
        mapping = this._originalMappings[++index];
      }
    }
  }

  return mappings;
};
/**
 * A BasicSourceMapConsumer instance represents a parsed source map which we can
 * query for information about the original file positions by giving it a file
 * position in the generated source.
 *
 * The first parameter is the raw source map (either as a JSON string, or
 * already parsed to an object). According to the spec, source maps have the
 * following attributes:
 *
 *   - version: Which version of the source map spec this map is following.
 *   - sources: An array of URLs to the original source files.
 *   - names: An array of identifiers which can be referrenced by individual mappings.
 *   - sourceRoot: Optional. The URL root from which all sources are relative.
 *   - sourcesContent: Optional. An array of contents of the original source files.
 *   - mappings: A string of base64 VLQs which contain the actual mappings.
 *   - file: Optional. The generated file this source map is associated with.
 *
 * Here is an example source map, taken from the source map spec[0]:
 *
 *     {
 *       version : 3,
 *       file: "out.js",
 *       sourceRoot : "",
 *       sources: ["foo.js", "bar.js"],
 *       names: ["src", "maps", "are", "fun"],
 *       mappings: "AA,AB;;ABCDE;"
 *     }
 *
 * The second parameter, if given, is a string whose value is the URL
 * at which the source map was found.  This URL is used to compute the
 * sources array.
 *
 * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit?pli=1#
 */

function BasicSourceMapConsumer(aSourceMap, aSourceMapURL) {
  var sourceMap = aSourceMap;

  if (typeof aSourceMap === 'string') {
    sourceMap = util$1.parseSourceMapInput(aSourceMap);
  }

  var version = util$1.getArg(sourceMap, 'version');
  var sources = util$1.getArg(sourceMap, 'sources'); // Sass 3.3 leaves out the 'names' array, so we deviate from the spec (which
  // requires the array) to play nice here.

  var names = util$1.getArg(sourceMap, 'names', []);
  var sourceRoot = util$1.getArg(sourceMap, 'sourceRoot', null);
  var sourcesContent = util$1.getArg(sourceMap, 'sourcesContent', null);
  var mappings = util$1.getArg(sourceMap, 'mappings');
  var file = util$1.getArg(sourceMap, 'file', null); // Once again, Sass deviates from the spec and supplies the version as a
  // string rather than a number, so we use loose equality checking here.

  if (version != this._version) {
    throw new Error('Unsupported version: ' + version);
  }

  if (sourceRoot) {
    sourceRoot = util$1.normalize(sourceRoot);
  }

  sources = sources.map(String) // Some source maps produce relative source paths like "./foo.js" instead of
  // "foo.js".  Normalize these first so that future comparisons will succeed.
  // See bugzil.la/1090768.
  .map(util$1.normalize) // Always ensure that absolute sources are internally stored relative to
  // the source root, if the source root is absolute. Not doing this would
  // be particularly problematic when the source root is a prefix of the
  // source (valid, but why??). See github issue #199 and bugzil.la/1188982.
  .map(function (source) {
    return sourceRoot && util$1.isAbsolute(sourceRoot) && util$1.isAbsolute(source) ? util$1.relative(sourceRoot, source) : source;
  }); // Pass `true` below to allow duplicate names and sources. While source maps
  // are intended to be compressed and deduplicated, the TypeScript compiler
  // sometimes generates source maps with duplicates in them. See Github issue
  // #72 and bugzil.la/889492.

  this._names = ArraySet.fromArray(names.map(String), true);
  this._sources = ArraySet.fromArray(sources, true);
  this._absoluteSources = this._sources.toArray().map(function (s) {
    return util$1.computeSourceURL(sourceRoot, s, aSourceMapURL);
  });
  this.sourceRoot = sourceRoot;
  this.sourcesContent = sourcesContent;
  this._mappings = mappings;
  this._sourceMapURL = aSourceMapURL;
  this.file = file;
}

BasicSourceMapConsumer.prototype = Object.create(SourceMapConsumer.prototype);
BasicSourceMapConsumer.prototype.consumer = SourceMapConsumer;
/**
 * Utility function to find the index of a source.  Returns -1 if not
 * found.
 */

BasicSourceMapConsumer.prototype._findSourceIndex = function (aSource) {
  var relativeSource = aSource;

  if (this.sourceRoot != null) {
    relativeSource = util$1.relative(this.sourceRoot, relativeSource);
  }

  if (this._sources.has(relativeSource)) {
    return this._sources.indexOf(relativeSource);
  } // Maybe aSource is an absolute URL as returned by |sources|.  In
  // this case we can't simply undo the transform.


  var i;

  for (i = 0; i < this._absoluteSources.length; ++i) {
    if (this._absoluteSources[i] == aSource) {
      return i;
    }
  }

  return -1;
};
/**
 * Create a BasicSourceMapConsumer from a SourceMapGenerator.
 *
 * @param SourceMapGenerator aSourceMap
 *        The source map that will be consumed.
 * @param String aSourceMapURL
 *        The URL at which the source map can be found (optional)
 * @returns BasicSourceMapConsumer
 */


BasicSourceMapConsumer.fromSourceMap = function SourceMapConsumer_fromSourceMap(aSourceMap, aSourceMapURL) {
  var smc = Object.create(BasicSourceMapConsumer.prototype);
  var names = smc._names = ArraySet.fromArray(aSourceMap._names.toArray(), true);
  var sources = smc._sources = ArraySet.fromArray(aSourceMap._sources.toArray(), true);
  smc.sourceRoot = aSourceMap._sourceRoot;
  smc.sourcesContent = aSourceMap._generateSourcesContent(smc._sources.toArray(), smc.sourceRoot);
  smc.file = aSourceMap._file;
  smc._sourceMapURL = aSourceMapURL;
  smc._absoluteSources = smc._sources.toArray().map(function (s) {
    return util$1.computeSourceURL(smc.sourceRoot, s, aSourceMapURL);
  }); // Because we are modifying the entries (by converting string sources and
  // names to indices into the sources and names ArraySets), we have to make
  // a copy of the entry or else bad things happen. Shared mutable state
  // strikes again! See github issue #191.

  var generatedMappings = aSourceMap._mappings.toArray().slice();

  var destGeneratedMappings = smc.__generatedMappings = [];
  var destOriginalMappings = smc.__originalMappings = [];

  for (var i = 0, length = generatedMappings.length; i < length; i++) {
    var srcMapping = generatedMappings[i];
    var destMapping = new Mapping();
    destMapping.generatedLine = srcMapping.generatedLine;
    destMapping.generatedColumn = srcMapping.generatedColumn;

    if (srcMapping.source) {
      destMapping.source = sources.indexOf(srcMapping.source);
      destMapping.originalLine = srcMapping.originalLine;
      destMapping.originalColumn = srcMapping.originalColumn;

      if (srcMapping.name) {
        destMapping.name = names.indexOf(srcMapping.name);
      }

      destOriginalMappings.push(destMapping);
    }

    destGeneratedMappings.push(destMapping);
  }

  quickSort(smc.__originalMappings, util$1.compareByOriginalPositions);
  return smc;
};
/**
 * The version of the source mapping spec that we are consuming.
 */


BasicSourceMapConsumer.prototype._version = 3;
/**
 * The list of original sources.
 */

Object.defineProperty(BasicSourceMapConsumer.prototype, 'sources', {
  get: function () {
    return this._absoluteSources.slice();
  }
});
/**
 * Provide the JIT with a nice shape / hidden class.
 */

function Mapping() {
  this.generatedLine = 0;
  this.generatedColumn = 0;
  this.source = null;
  this.originalLine = null;
  this.originalColumn = null;
  this.name = null;
}
/**
 * Parse the mappings in a string in to a data structure which we can easily
 * query (the ordered arrays in the `this.__generatedMappings` and
 * `this.__originalMappings` properties).
 */


BasicSourceMapConsumer.prototype._parseMappings = function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
  var generatedLine = 1;
  var previousGeneratedColumn = 0;
  var previousOriginalLine = 0;
  var previousOriginalColumn = 0;
  var previousSource = 0;
  var previousName = 0;
  var length = aStr.length;
  var index = 0;
  var cachedSegments = {};
  var temp = {};
  var originalMappings = [];
  var generatedMappings = [];
  var mapping, str, segment, end, value;

  while (index < length) {
    if (aStr.charAt(index) === ';') {
      generatedLine++;
      index++;
      previousGeneratedColumn = 0;
    } else if (aStr.charAt(index) === ',') {
      index++;
    } else {
      mapping = new Mapping();
      mapping.generatedLine = generatedLine; // Because each offset is encoded relative to the previous one,
      // many segments often have the same encoding. We can exploit this
      // fact by caching the parsed variable length fields of each segment,
      // allowing us to avoid a second parse if we encounter the same
      // segment again.

      for (end = index; end < length; end++) {
        if (this._charIsMappingSeparator(aStr, end)) {
          break;
        }
      }

      str = aStr.slice(index, end);
      segment = cachedSegments[str];

      if (segment) {
        index += str.length;
      } else {
        segment = [];

        while (index < end) {
          base64VLQ.decode(aStr, index, temp);
          value = temp.value;
          index = temp.rest;
          segment.push(value);
        }

        if (segment.length === 2) {
          throw new Error('Found a source, but no line and column');
        }

        if (segment.length === 3) {
          throw new Error('Found a source and line, but no column');
        }

        cachedSegments[str] = segment;
      } // Generated column.


      mapping.generatedColumn = previousGeneratedColumn + segment[0];
      previousGeneratedColumn = mapping.generatedColumn;

      if (segment.length > 1) {
        // Original source.
        mapping.source = previousSource + segment[1];
        previousSource += segment[1]; // Original line.

        mapping.originalLine = previousOriginalLine + segment[2];
        previousOriginalLine = mapping.originalLine; // Lines are stored 0-based

        mapping.originalLine += 1; // Original column.

        mapping.originalColumn = previousOriginalColumn + segment[3];
        previousOriginalColumn = mapping.originalColumn;

        if (segment.length > 4) {
          // Original name.
          mapping.name = previousName + segment[4];
          previousName += segment[4];
        }
      }

      generatedMappings.push(mapping);

      if (typeof mapping.originalLine === 'number') {
        originalMappings.push(mapping);
      }
    }
  }

  quickSort(generatedMappings, util$1.compareByGeneratedPositionsDeflated);
  this.__generatedMappings = generatedMappings;
  quickSort(originalMappings, util$1.compareByOriginalPositions);
  this.__originalMappings = originalMappings;
};
/**
 * Find the mapping that best matches the hypothetical "needle" mapping that
 * we are searching for in the given "haystack" of mappings.
 */


BasicSourceMapConsumer.prototype._findMapping = function SourceMapConsumer_findMapping(aNeedle, aMappings, aLineName, aColumnName, aComparator, aBias) {
  // To return the position we are searching for, we must first find the
  // mapping for the given position and then return the opposite position it
  // points to. Because the mappings are sorted, we can use binary search to
  // find the best mapping.
  if (aNeedle[aLineName] <= 0) {
    throw new TypeError('Line must be greater than or equal to 1, got ' + aNeedle[aLineName]);
  }

  if (aNeedle[aColumnName] < 0) {
    throw new TypeError('Column must be greater than or equal to 0, got ' + aNeedle[aColumnName]);
  }

  return binarySearch.search(aNeedle, aMappings, aComparator, aBias);
};
/**
 * Compute the last column for each generated mapping. The last column is
 * inclusive.
 */


BasicSourceMapConsumer.prototype.computeColumnSpans = function SourceMapConsumer_computeColumnSpans() {
  for (var index = 0; index < this._generatedMappings.length; ++index) {
    var mapping = this._generatedMappings[index]; // Mappings do not contain a field for the last generated columnt. We
    // can come up with an optimistic estimate, however, by assuming that
    // mappings are contiguous (i.e. given two consecutive mappings, the
    // first mapping ends where the second one starts).

    if (index + 1 < this._generatedMappings.length) {
      var nextMapping = this._generatedMappings[index + 1];

      if (mapping.generatedLine === nextMapping.generatedLine) {
        mapping.lastGeneratedColumn = nextMapping.generatedColumn - 1;
        continue;
      }
    } // The last mapping for each line spans the entire line.


    mapping.lastGeneratedColumn = Infinity;
  }
};
/**
 * Returns the original source, line, and column information for the generated
 * source's line and column positions provided. The only argument is an object
 * with the following properties:
 *
 *   - line: The line number in the generated source.  The line number
 *     is 1-based.
 *   - column: The column number in the generated source.  The column
 *     number is 0-based.
 *   - bias: Either 'SourceMapConsumer.GREATEST_LOWER_BOUND' or
 *     'SourceMapConsumer.LEAST_UPPER_BOUND'. Specifies whether to return the
 *     closest element that is smaller than or greater than the one we are
 *     searching for, respectively, if the exact element cannot be found.
 *     Defaults to 'SourceMapConsumer.GREATEST_LOWER_BOUND'.
 *
 * and an object is returned with the following properties:
 *
 *   - source: The original source file, or null.
 *   - line: The line number in the original source, or null.  The
 *     line number is 1-based.
 *   - column: The column number in the original source, or null.  The
 *     column number is 0-based.
 *   - name: The original identifier, or null.
 */


BasicSourceMapConsumer.prototype.originalPositionFor = function SourceMapConsumer_originalPositionFor(aArgs) {
  var needle = {
    generatedLine: util$1.getArg(aArgs, 'line'),
    generatedColumn: util$1.getArg(aArgs, 'column')
  };

  var index = this._findMapping(needle, this._generatedMappings, "generatedLine", "generatedColumn", util$1.compareByGeneratedPositionsDeflated, util$1.getArg(aArgs, 'bias', SourceMapConsumer.GREATEST_LOWER_BOUND));

  if (index >= 0) {
    var mapping = this._generatedMappings[index];

    if (mapping.generatedLine === needle.generatedLine) {
      var source = util$1.getArg(mapping, 'source', null);

      if (source !== null) {
        source = this._sources.at(source);
        source = util$1.computeSourceURL(this.sourceRoot, source, this._sourceMapURL);
      }

      var name = util$1.getArg(mapping, 'name', null);

      if (name !== null) {
        name = this._names.at(name);
      }

      return {
        source: source,
        line: util$1.getArg(mapping, 'originalLine', null),
        column: util$1.getArg(mapping, 'originalColumn', null),
        name: name
      };
    }
  }

  return {
    source: null,
    line: null,
    column: null,
    name: null
  };
};
/**
 * Return true if we have the source content for every source in the source
 * map, false otherwise.
 */


BasicSourceMapConsumer.prototype.hasContentsOfAllSources = function BasicSourceMapConsumer_hasContentsOfAllSources() {
  if (!this.sourcesContent) {
    return false;
  }

  return this.sourcesContent.length >= this._sources.size() && !this.sourcesContent.some(function (sc) {
    return sc == null;
  });
};
/**
 * Returns the original source content. The only argument is the url of the
 * original source file. Returns null if no original source content is
 * available.
 */


BasicSourceMapConsumer.prototype.sourceContentFor = function SourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
  if (!this.sourcesContent) {
    return null;
  }

  var index = this._findSourceIndex(aSource);

  if (index >= 0) {
    return this.sourcesContent[index];
  }

  var relativeSource = aSource;

  if (this.sourceRoot != null) {
    relativeSource = util$1.relative(this.sourceRoot, relativeSource);
  }

  var url;

  if (this.sourceRoot != null && (url = util$1.urlParse(this.sourceRoot))) {
    // XXX: file:// URIs and absolute paths lead to unexpected behavior for
    // many users. We can help them out when they expect file:// URIs to
    // behave like it would if they were running a local HTTP server. See
    // https://bugzilla.mozilla.org/show_bug.cgi?id=885597.
    var fileUriAbsPath = relativeSource.replace(/^file:\/\//, "");

    if (url.scheme == "file" && this._sources.has(fileUriAbsPath)) {
      return this.sourcesContent[this._sources.indexOf(fileUriAbsPath)];
    }

    if ((!url.path || url.path == "/") && this._sources.has("/" + relativeSource)) {
      return this.sourcesContent[this._sources.indexOf("/" + relativeSource)];
    }
  } // This function is used recursively from
  // IndexedSourceMapConsumer.prototype.sourceContentFor. In that case, we
  // don't want to throw if we can't find the source - we just want to
  // return null, so we provide a flag to exit gracefully.


  if (nullOnMissing) {
    return null;
  } else {
    throw new Error('"' + relativeSource + '" is not in the SourceMap.');
  }
};
/**
 * Returns the generated line and column information for the original source,
 * line, and column positions provided. The only argument is an object with
 * the following properties:
 *
 *   - source: The filename of the original source.
 *   - line: The line number in the original source.  The line number
 *     is 1-based.
 *   - column: The column number in the original source.  The column
 *     number is 0-based.
 *   - bias: Either 'SourceMapConsumer.GREATEST_LOWER_BOUND' or
 *     'SourceMapConsumer.LEAST_UPPER_BOUND'. Specifies whether to return the
 *     closest element that is smaller than or greater than the one we are
 *     searching for, respectively, if the exact element cannot be found.
 *     Defaults to 'SourceMapConsumer.GREATEST_LOWER_BOUND'.
 *
 * and an object is returned with the following properties:
 *
 *   - line: The line number in the generated source, or null.  The
 *     line number is 1-based.
 *   - column: The column number in the generated source, or null.
 *     The column number is 0-based.
 */


BasicSourceMapConsumer.prototype.generatedPositionFor = function SourceMapConsumer_generatedPositionFor(aArgs) {
  var source = util$1.getArg(aArgs, 'source');
  source = this._findSourceIndex(source);

  if (source < 0) {
    return {
      line: null,
      column: null,
      lastColumn: null
    };
  }

  var needle = {
    source: source,
    originalLine: util$1.getArg(aArgs, 'line'),
    originalColumn: util$1.getArg(aArgs, 'column')
  };

  var index = this._findMapping(needle, this._originalMappings, "originalLine", "originalColumn", util$1.compareByOriginalPositions, util$1.getArg(aArgs, 'bias', SourceMapConsumer.GREATEST_LOWER_BOUND));

  if (index >= 0) {
    var mapping = this._originalMappings[index];

    if (mapping.source === needle.source) {
      return {
        line: util$1.getArg(mapping, 'generatedLine', null),
        column: util$1.getArg(mapping, 'generatedColumn', null),
        lastColumn: util$1.getArg(mapping, 'lastGeneratedColumn', null)
      };
    }
  }

  return {
    line: null,
    column: null,
    lastColumn: null
  };
};
/**
 * An IndexedSourceMapConsumer instance represents a parsed source map which
 * we can query for information. It differs from BasicSourceMapConsumer in
 * that it takes "indexed" source maps (i.e. ones with a "sections" field) as
 * input.
 *
 * The first parameter is a raw source map (either as a JSON string, or already
 * parsed to an object). According to the spec for indexed source maps, they
 * have the following attributes:
 *
 *   - version: Which version of the source map spec this map is following.
 *   - file: Optional. The generated file this source map is associated with.
 *   - sections: A list of section definitions.
 *
 * Each value under the "sections" field has two fields:
 *   - offset: The offset into the original specified at which this section
 *       begins to apply, defined as an object with a "line" and "column"
 *       field.
 *   - map: A source map definition. This source map could also be indexed,
 *       but doesn't have to be.
 *
 * Instead of the "map" field, it's also possible to have a "url" field
 * specifying a URL to retrieve a source map from, but that's currently
 * unsupported.
 *
 * Here's an example source map, taken from the source map spec[0], but
 * modified to omit a section which uses the "url" field.
 *
 *  {
 *    version : 3,
 *    file: "app.js",
 *    sections: [{
 *      offset: {line:100, column:10},
 *      map: {
 *        version : 3,
 *        file: "section.js",
 *        sources: ["foo.js", "bar.js"],
 *        names: ["src", "maps", "are", "fun"],
 *        mappings: "AAAA,E;;ABCDE;"
 *      }
 *    }],
 *  }
 *
 * The second parameter, if given, is a string whose value is the URL
 * at which the source map was found.  This URL is used to compute the
 * sources array.
 *
 * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit#heading=h.535es3xeprgt
 */

function IndexedSourceMapConsumer(aSourceMap, aSourceMapURL) {
  var sourceMap = aSourceMap;

  if (typeof aSourceMap === 'string') {
    sourceMap = util$1.parseSourceMapInput(aSourceMap);
  }

  var version = util$1.getArg(sourceMap, 'version');
  var sections = util$1.getArg(sourceMap, 'sections');

  if (version != this._version) {
    throw new Error('Unsupported version: ' + version);
  }

  this._sources = new ArraySet();
  this._names = new ArraySet();
  var lastOffset = {
    line: -1,
    column: 0
  };
  this._sections = sections.map(function (s) {
    if (s.url) {
      // The url field will require support for asynchronicity.
      // See https://github.com/mozilla/source-map/issues/16
      throw new Error('Support for url field in sections not implemented.');
    }

    var offset = util$1.getArg(s, 'offset');
    var offsetLine = util$1.getArg(offset, 'line');
    var offsetColumn = util$1.getArg(offset, 'column');

    if (offsetLine < lastOffset.line || offsetLine === lastOffset.line && offsetColumn < lastOffset.column) {
      throw new Error('Section offsets must be ordered and non-overlapping.');
    }

    lastOffset = offset;
    return {
      generatedOffset: {
        // The offset fields are 0-based, but we use 1-based indices when
        // encoding/decoding from VLQ.
        generatedLine: offsetLine + 1,
        generatedColumn: offsetColumn + 1
      },
      consumer: new SourceMapConsumer(util$1.getArg(s, 'map'), aSourceMapURL)
    };
  });
}

IndexedSourceMapConsumer.prototype = Object.create(SourceMapConsumer.prototype);
IndexedSourceMapConsumer.prototype.constructor = SourceMapConsumer;
/**
 * The version of the source mapping spec that we are consuming.
 */

IndexedSourceMapConsumer.prototype._version = 3;
/**
 * The list of original sources.
 */

Object.defineProperty(IndexedSourceMapConsumer.prototype, 'sources', {
  get: function () {
    var sources = [];

    for (var i = 0; i < this._sections.length; i++) {
      for (var j = 0; j < this._sections[i].consumer.sources.length; j++) {
        sources.push(this._sections[i].consumer.sources[j]);
      }
    }

    return sources;
  }
});
/**
 * Returns the original source, line, and column information for the generated
 * source's line and column positions provided. The only argument is an object
 * with the following properties:
 *
 *   - line: The line number in the generated source.  The line number
 *     is 1-based.
 *   - column: The column number in the generated source.  The column
 *     number is 0-based.
 *
 * and an object is returned with the following properties:
 *
 *   - source: The original source file, or null.
 *   - line: The line number in the original source, or null.  The
 *     line number is 1-based.
 *   - column: The column number in the original source, or null.  The
 *     column number is 0-based.
 *   - name: The original identifier, or null.
 */

IndexedSourceMapConsumer.prototype.originalPositionFor = function IndexedSourceMapConsumer_originalPositionFor(aArgs) {
  var needle = {
    generatedLine: util$1.getArg(aArgs, 'line'),
    generatedColumn: util$1.getArg(aArgs, 'column')
  }; // Find the section containing the generated position we're trying to map
  // to an original position.

  var sectionIndex = binarySearch.search(needle, this._sections, function (needle, section) {
    var cmp = needle.generatedLine - section.generatedOffset.generatedLine;

    if (cmp) {
      return cmp;
    }

    return needle.generatedColumn - section.generatedOffset.generatedColumn;
  });
  var section = this._sections[sectionIndex];

  if (!section) {
    return {
      source: null,
      line: null,
      column: null,
      name: null
    };
  }

  return section.consumer.originalPositionFor({
    line: needle.generatedLine - (section.generatedOffset.generatedLine - 1),
    column: needle.generatedColumn - (section.generatedOffset.generatedLine === needle.generatedLine ? section.generatedOffset.generatedColumn - 1 : 0),
    bias: aArgs.bias
  });
};
/**
 * Return true if we have the source content for every source in the source
 * map, false otherwise.
 */


IndexedSourceMapConsumer.prototype.hasContentsOfAllSources = function IndexedSourceMapConsumer_hasContentsOfAllSources() {
  return this._sections.every(function (s) {
    return s.consumer.hasContentsOfAllSources();
  });
};
/**
 * Returns the original source content. The only argument is the url of the
 * original source file. Returns null if no original source content is
 * available.
 */


IndexedSourceMapConsumer.prototype.sourceContentFor = function IndexedSourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
  for (var i = 0; i < this._sections.length; i++) {
    var section = this._sections[i];
    var content = section.consumer.sourceContentFor(aSource, true);

    if (content) {
      return content;
    }
  }

  if (nullOnMissing) {
    return null;
  } else {
    throw new Error('"' + aSource + '" is not in the SourceMap.');
  }
};
/**
 * Returns the generated line and column information for the original source,
 * line, and column positions provided. The only argument is an object with
 * the following properties:
 *
 *   - source: The filename of the original source.
 *   - line: The line number in the original source.  The line number
 *     is 1-based.
 *   - column: The column number in the original source.  The column
 *     number is 0-based.
 *
 * and an object is returned with the following properties:
 *
 *   - line: The line number in the generated source, or null.  The
 *     line number is 1-based. 
 *   - column: The column number in the generated source, or null.
 *     The column number is 0-based.
 */


IndexedSourceMapConsumer.prototype.generatedPositionFor = function IndexedSourceMapConsumer_generatedPositionFor(aArgs) {
  for (var i = 0; i < this._sections.length; i++) {
    var section = this._sections[i]; // Only consider this section if the requested source is in the list of
    // sources of the consumer.

    if (section.consumer._findSourceIndex(util$1.getArg(aArgs, 'source')) === -1) {
      continue;
    }

    var generatedPosition = section.consumer.generatedPositionFor(aArgs);

    if (generatedPosition) {
      var ret = {
        line: generatedPosition.line + (section.generatedOffset.generatedLine - 1),
        column: generatedPosition.column + (section.generatedOffset.generatedLine === generatedPosition.line ? section.generatedOffset.generatedColumn - 1 : 0)
      };
      return ret;
    }
  }

  return {
    line: null,
    column: null
  };
};
/**
 * Parse the mappings in a string in to a data structure which we can easily
 * query (the ordered arrays in the `this.__generatedMappings` and
 * `this.__originalMappings` properties).
 */


IndexedSourceMapConsumer.prototype._parseMappings = function IndexedSourceMapConsumer_parseMappings(aStr, aSourceRoot) {
  this.__generatedMappings = [];
  this.__originalMappings = [];

  for (var i = 0; i < this._sections.length; i++) {
    var section = this._sections[i];
    var sectionMappings = section.consumer._generatedMappings;

    for (var j = 0; j < sectionMappings.length; j++) {
      var mapping = sectionMappings[j];

      var source = section.consumer._sources.at(mapping.source);

      source = util$1.computeSourceURL(section.consumer.sourceRoot, source, this._sourceMapURL);

      this._sources.add(source);

      source = this._sources.indexOf(source);
      var name = null;

      if (mapping.name) {
        name = section.consumer._names.at(mapping.name);

        this._names.add(name);

        name = this._names.indexOf(name);
      } // The mappings coming from the consumer for the section have
      // generated positions relative to the start of the section, so we
      // need to offset them to be relative to the start of the concatenated
      // generated file.


      var adjustedMapping = {
        source: source,
        generatedLine: mapping.generatedLine + (section.generatedOffset.generatedLine - 1),
        generatedColumn: mapping.generatedColumn + (section.generatedOffset.generatedLine === mapping.generatedLine ? section.generatedOffset.generatedColumn - 1 : 0),
        originalLine: mapping.originalLine,
        originalColumn: mapping.originalColumn,
        name: name
      };

      this.__generatedMappings.push(adjustedMapping);

      if (typeof adjustedMapping.originalLine === 'number') {
        this.__originalMappings.push(adjustedMapping);
      }
    }
  }

  quickSort(this.__generatedMappings, util$1.compareByGeneratedPositionsDeflated);
  quickSort(this.__originalMappings, util$1.compareByOriginalPositions);
};

getSettings();

new logger$1("indexingCollection");

let locationMap = new Map();
function getLocationId(x, y) {
    return `${x}-${y}`;
}
class Location {
    constructor(x, y, id) {
        this._id = id || getLocationId(x, y);
        this._x = x;
        this._y = y;
    }
    static getLocationFromObj(loc) {
        return Location.getLocation(loc.x, loc.y);
    }
    static getLocation(x, y) {
        let locId = getLocationId(x, y);
        if (locationMap.has(locId)) {
            return locationMap.get(locId);
        }
        let location = new Location(x, y);
        locationMap.set(locId, location);
        return location;
    }
    get id() {
        return this._id;
    }
    get x() {
        return this._x;
    }
    get y() {
        return this._y;
    }
}

new logger$1("util.actions");
let actions = new Map();
function findClosestAction(obj, types) {
    let closestAction = false;
    let closestActionDist = Infinity;
    let settings = getSettings();
    for (let action of actions.values()) {
        if (!action.canDo(obj)) {
            continue;
        }
        let validType = false;
        for (let type of types) {
            if (action instanceof type) {
                validType = true;
                break;
            }
        }
        if (!validType)
            continue;
        let actionDist = settings.getRange(action, obj);
        console.log("wtf", action.x, action.y, obj.x, obj.y);
        console.log(obj.id, "checking action", action.id, actionDist, closestActionDist);
        if (actionDist < closestActionDist) {
            console.log(obj.id, "found closer action", action.id, actionDist);
            closestAction = action;
            closestActionDist = actionDist;
        }
    }
    console.log('found closest Action:', closestAction && closestAction.id, "at range", closestActionDist);
    return closestAction;
}
function deleteAction(action) {
    actions.delete(action.id);
}
class ActionAssignment {
    constructor(action, assigned, priority = 0) {
        this._distanceToTarget = new CachedValue(() => {
            return getSettings().getRange(this.action.target, this.assigned);
        });
        this.action = action;
        this.assigned = assigned;
        this.priority = priority;
        this._id = this.action.id + "-" + this.assigned.id;
    }
    get distanceToTarget() {
        return this._distanceToTarget.get();
    }
    get id() {
        return this._id;
    }
}
class BaseAction extends Location {
    constructor(actionType = "not implemented!!!", assignmentConstructor, target) {
        super(target.x, target.y, `${actionType}-${target.id}`);
        this.assignments = new Map();
        this.maxRange = 1;
        this.maxAssignments = Infinity;
        this.displayTask = false;
        this.target = target;
        this.actionType = actionType;
        this.assignmentConstructor = assignmentConstructor;
        if (!actions.has(this.id)) {
            actions.set(this.id, this);
        }
        else {
            throw new Error("action id already exists!!" + this.id);
        }
    }
    get x() {
        return this.target.x;
    }
    get y() {
        return this.target.y;
    }
    display() {
        getSettings().drawText(this.actionType + "(" + this.assignments.size + ")", this.target.location);
    }
    isAssigned(obj) {
        return this.assignments.has(obj.id);
    }
    valid() {
        return this.target.get().exists;
    }
    assign(obj, priority = 1) {
        console.log("assigning", obj.id, "to", this.id);
        let settings = getSettings();
        this.clearLosers(settings, obj, priority);
        let assignment = new this.assignmentConstructor(this, obj, priority);
        this.assignments.set(obj.id, assignment);
        console.log("assigned", obj.id, "to", this.id, this.assignments.size);
        return true;
    }
    clearLosers(settings, obj, priority) {
        let newObjRange = settings.getRange(obj, this.target.location);
        let loserAssignments = Array.from(this.assignments.values()).filter((assignment) => {
            let newObjCloser = assignment.distanceToTarget > newObjRange;
            let samePriority = priority == assignment.priority;
            let higherPriority = priority > assignment.priority;
            if (higherPriority || newObjCloser && samePriority) {
                return true;
            }
            return false;
        }).sort((a, b) => {
            if (a.priority != b.priority) {
                return a.priority - b.priority;
            }
            return a.distanceToTarget - b.distanceToTarget;
        });
        while (this.overAllowedAssignments()) {
            let loser = loserAssignments.shift();
            if (!loser)
                break;
            this.unassign(loser.assigned);
        }
    }
    overAllowedAssignments() {
        return this.assignments.size >= (this.maxAssignments);
    }
    unassign(obj) {
        console.log("-----------------------unassigning------------------------------------------");
        if (!this.assignments.has(obj.id)) {
            throw new Error("trying to unassign object that isn't assigned. " + this.id + " " + obj.id);
        }
        this.assignments.delete(obj.id);
        console.log("unassigned", obj.id, "from", this.id, this.assignments.size);
    }
    canDo(object) {
        if (object.id == this.target.id)
            return false;
        if (this.assignments.size >= (this.maxAssignments))
            return false;
        return true;
    }
    predictedDoneTick(object) {
        let settings = getSettings();
        let currentTick = settings.getTick();
        let pathToTarget = settings.getPath(this.target.location, object);
        let ticksFromTarget = pathToTarget.cost;
        return currentTick + ticksFromTarget;
    }
}

class TypeInfo {
    constructor(type) {
        this.amount = 0;
        this.type = type;
    }
}
class TypeInfoCollection {
    constructor(infoConstructor) {
        this.types = new Map();
        this.infoConstructor = infoConstructor;
    }
    get total() {
        let amt = 0;
        this.types.forEach((type) => {
            amt += type.amount;
        });
        return amt;
    }
    getInfos() {
        return Array.from(this.types.values());
    }
    getTypes() {
        return Array.from(this.types.keys());
    }
    getAmount(type) {
        let itemType = this.get(type);
        return itemType.amount;
    }
    setAmount(type, amt) {
        let itemType = this.get(type);
        itemType.amount = amt;
    }
    addAmount(type, amt) {
        let itemType = this.get(type);
        itemType.amount += amt;
    }
    has(type) {
        return this.types.has(type);
    }
    get(type) {
        let typeInfo;
        if (this.types.has(type)) {
            typeInfo = this.types.get(type);
        }
        else {
            typeInfo = new this.infoConstructor(type);
            this.types.set(type, typeInfo);
        }
        return typeInfo;
    }
    getByAmount() {
        let byAmount = [];
        let validSortedTypes = Array.from(this.types.values()).filter(r => r.amount > 0).sort((a, b) => a.amount - b.amount);
        validSortedTypes.forEach(type => {
            let info = new this.infoConstructor(type.type);
            info.amount = type.amount;
            byAmount.push(info);
        });
        return byAmount;
    }
    delete(type) {
        this.types.delete(type);
    }
    diff(otherCollection, allowNegitive = true) {
        let diff = new TypeInfoCollection(this.infoConstructor);
        let allTypes = [...this.getTypes(), ...otherCollection.getTypes()];
        for (let type of allTypes) {
            let ourVal = 0;
            let theirVal = 0;
            if (this.has(type)) {
                ourVal = this.get(type).amount;
            }
            if (otherCollection.has(type)) {
                theirVal = otherCollection.get(type).amount;
            }
            let newVal = ourVal - theirVal;
            if (newVal < 0 && !allowNegitive) {
                newVal = 0;
            }
            diff.setAmount(type, newVal);
        }
        return diff;
    }
    sub(otherCollection) {
        let typesToSub = otherCollection.getTypes();
        for (let type of typesToSub) {
            let otherAmt = otherCollection.get(type).amount;
            this.addAmount(type, -otherAmt);
        }
    }
    add(otherCollection) {
        let typesToAdd = otherCollection.getTypes();
        for (let type of typesToAdd) {
            let otherAmt = otherCollection.get(type).amount;
            this.addAmount(type, otherAmt);
        }
    }
    updateFromCollection(types) {
        let unUpdatedType = new Set(this.getTypes());
        let keys = types.getTypes();
        keys.forEach(key => {
            let type = types.get(key);
            this.setAmount(type.type, type.amount);
            unUpdatedType.delete(type.type);
        });
        unUpdatedType.forEach(type => {
            this.types.delete(type);
        });
    }
    updateFromArray(types) {
        let unUpdatedType = new Set(this.getTypes());
        types.forEach(type => {
            this.setAmount(type.type, type.amount);
            unUpdatedType.delete(type.type);
        });
        unUpdatedType.forEach(type => {
            this.types.delete(type);
        });
    }
    updateFromStore(store) {
        let unUpdatedType = new Set(this.getTypes());
        for (let resourceName in store) {
            let typeName = resourceName;
            let typeAmt = store[typeName];
            if (typeAmt > 0) {
                this.setAmount(typeName, typeAmt);
                unUpdatedType.delete(typeName);
            }
        }
        unUpdatedType.forEach(type => {
            this.types.delete(type);
        });
    }
}

class RequiredInfo extends TypeInfo {
    constructor(item) {
        super(item);
        this.min = 0;
        this.max = 0;
    }
    get amountAllowed() {
        return Math.max(this.max - this.amount, 0);
    }
    get amountRequired() {
        return Math.max(this.min - this.amount, 0);
    }
    get amountAvailable() {
        return Math.max(this.amount - this.min, 0);
    }
    get amountOverMax() {
        return Math.max(this.amount - this.max, 0);
    }
}
class RequiredInfoCollection extends TypeInfoCollection {
    constructor(infoConstructor, store = false, maxTotalAmount = false) {
        super(infoConstructor);
        this.maxTotalAmount = false;
        this.maxTotalAmount = maxTotalAmount;
        if (store instanceof RequiredInfoCollection) {
            this.updateFromCollection(store);
        }
        else if (store) {
            this.updateFromStore(store);
        }
    }
    getTypesByAmountRequired() {
        let typesRequired = new RequiredInfoCollection(this.infoConstructor);
        let validTypes = Array.from(this.types.values()).filter(r => r.amountRequired > 0).sort((a, b) => a.amountRequired - b.amountRequired);
        validTypes.forEach(type => {
            typesRequired.setAmount(type.type, type.amountRequired);
        });
        return typesRequired;
    }
    getTypesByAmountOverMax() {
        let typesOverMax = new RequiredInfoCollection(this.infoConstructor);
        let validTypes = Array.from(this.types.values()).filter(r => r.amountOverMax > 0).sort((a, b) => a.amountOverMax - b.amountOverMax);
        validTypes.forEach(type => {
            typesOverMax.setAmount(type.type, type.amountOverMax);
        });
        return typesOverMax;
    }
    getTypesByAmountAllowed() {
        let typesAllowed = new RequiredInfoCollection(this.infoConstructor);
        let validTypes = Array.from(this.types.values()).filter(r => r.amountAllowed > 0).sort((a, b) => a.amountAllowed - b.amountAllowed);
        validTypes.forEach(type => {
            typesAllowed.setAmount(type.type, type.amountAllowed);
        });
        return typesAllowed;
    }
    getTypesByAmountAvailable() {
        let typesAvailable = new RequiredInfoCollection(this.infoConstructor);
        let validTypes = Array.from(this.types.values()).filter(r => r.amountAvailable > 0).sort((a, b) => a.amountAvailable - b.amountAvailable);
        validTypes.forEach(type => {
            typesAvailable.setAmount(type.type, type.amountAvailable);
        });
        return typesAvailable;
    }
    setMaxTotal(newMax) {
        this.maxTotalAmount = newMax;
    }
    get maxTotal() {
        if (this.maxTotalAmount)
            return this.maxTotalAmount;
        return 0;
    }
    get totalFree() {
        return this.maxTotal - this.total;
    }
    updateMaxTotal(newTotal) {
        this.maxTotalAmount = newTotal;
    }
    getConflictingAmounts(otherCollection) {
        let conflictingAmounts = new RequiredInfoCollection(this.infoConstructor);
        let typeInOtherCollection = otherCollection.getTypes();
        for (let type of typeInOtherCollection) {
            let ourTypeInfo = this.get(type);
            let theirTypeInfo = otherCollection.get(type);
            console.log("checking for conflict", ourTypeInfo, theirTypeInfo);
            if ((theirTypeInfo.amount + ourTypeInfo.amount) > ourTypeInfo.amountAllowed) {
                let conflictAmt = theirTypeInfo.amount - ourTypeInfo.amountAllowed;
                conflictingAmounts.setAmount(type, conflictAmt);
            }
        }
        return conflictingAmounts;
    }
    getMin(type) {
        if (!this.has(type))
            return 0;
        let tInfo = this.get(type);
        return tInfo.min;
    }
    getMax(type) {
        if (!this.has(type))
            return 0;
        let tInfo = this.get(type);
        return tInfo.max;
    }
    setMin(type, amount) {
        let tInfo = this.get(type);
        tInfo.min = amount;
    }
    setMax(type, amount) {
        let tInfo = this.get(type);
        tInfo.max = amount;
    }
}

class BodyPartInfo extends RequiredInfo {
    constructor(type) {
        super(type);
    }
}
class BodyPartInfoCollection extends RequiredInfoCollection {
    constructor(store = false, maxTotalAmount = false) {
        super(BodyPartInfo, store, maxTotalAmount);
    }
}

class BasePartActionAssignment extends ActionAssignment {
    constructor(action, assigned, priority = 0) {
        super(action, assigned, priority);
        this.partAmounts = new BodyPartInfoCollection();
    }
}
class BasePartAction extends BaseAction {
    constructor(actionType, target, requiredParts) {
        super(actionType, BasePartActionAssignment, target);
        this.requiredParts = new BodyPartInfoCollection();
        for (let part of requiredParts) {
            this.requiredParts.setMin(part, 1);
        }
    }
    canDo(object) {
        if (!super.canDo(object))
            return false;
        let hasRequiredParts = false;
        this.requiredParts.getTypes().forEach(part => {
            if (object.hasBodyPart(part))
                hasRequiredParts = true;
        });
        return hasRequiredParts;
    }
    overAllowedAssignments() {
        if (super.overAllowedAssignments())
            return true;
        for (let info of this.requiredParts.getInfos()) {
            if (info.max != 0 && info.amountOverMax > 0) {
                console.log("action over allowed part limit", this.id, info.type, info.amountOverMax);
                return true;
            }
        }
        return false;
    }
    getAssignmentAmount(object) {
        let matchingParts = new BodyPartInfoCollection();
        return matchingParts;
    }
    doJob(object) {
        return false;
    }
}

class ResourceInfo extends RequiredInfo {
    constructor(type) {
        super(type);
    }
}
class ResourceInfoCollection extends RequiredInfoCollection {
    constructor(store = false, maxTotalAmount = false) {
        super(ResourceInfo, store, maxTotalAmount);
    }
}

let logger = new logger$1("util.actions");
class BaseResourceActionAssignment extends ActionAssignment {
    constructor(action, assigned, priority = 0) {
        super(action, assigned, priority);
        let assignAmts = action.getAssignmentAmount(assigned);
        this.assignAmounts = assignAmts;
    }
}
class BaseResourceAction extends BaseAction {
    constructor(actionType = "not implemented!!!", target) {
        super(actionType, BaseResourceActionAssignment, target);
        let targetStore = target ? target.get().store : undefined;
        if (targetStore) {
            this.resourceAmounts = new ResourceInfoCollection(targetStore);
        }
        else {
            this.resourceAmounts = new ResourceInfoCollection();
        }
    }
    canDo(object) {
        return super.canDo(object);
    }
    doJob(object) {
        console.log("you forgot to implement doJob on one of your actions", this.actionType);
        return true;
    }
    overAllowedAssignments() {
        if (super.overAllowedAssignments())
            return true;
        let resourcesRemaining = this.resourcesRemaining;
        let typesRemaining = resourcesRemaining.getTypes();
        for (let resource in typesRemaining) {
            let info = resourcesRemaining.get(resource);
            if (info.amount < 0)
                return true;
        }
        return false;
    }
    get resourcesAssigned() {
        let total = new ResourceInfoCollection();
        this.assignments.forEach((assignment) => {
            total.add(assignment.assignAmounts);
        });
        return total;
    }
    get resourcesRemaining() {
        return this.resourceAmounts.diff(this.resourcesAssigned);
    }
    resourcesAssignedUnderPriority(priority) {
        let total = new ResourceInfoCollection();
        this.assignments.forEach((assignment) => {
            if (assignment.priority < priority) {
                total.add(assignment.assignAmounts);
            }
        });
        return total;
    }
    amountRemainingByPriority(priority) {
        let resourcesAssignedUnderPriority = this.resourcesAssignedUnderPriority(priority);
        return this.resourceAmounts.diff(resourcesAssignedUnderPriority);
    }
    amountRemainingByPriorityAndLocation(priority, pos) {
        let settings = getSettings();
        let amountRemaining = new ResourceInfoCollection(this.resourceAmounts);
        let assignmentsCounted = 0;
        let targetRange = settings.getRange(pos, this.target.location);
        this.assignments.forEach((assignment) => {
            if (assignment.priority <= priority && assignment.distanceToTarget <= targetRange) {
                amountRemaining.sub(assignment.assignAmounts);
                assignmentsCounted++;
            }
        });
        logger.log(this.id, 'remaining amount:', amountRemaining, assignmentsCounted, this.maxAssignments);
        return assignmentsCounted >= this.maxAssignments ? 0 : amountRemaining;
    }
}

let gameObjectWrappers = new Map();
setInterval(() => {
    gameObjectWrappers.forEach(wrapper => {
        if (!wrapper.get().exists) {
            gameObjectWrappers.delete(wrapper.id);
            return;
        }
        console.log("updating wrapper", wrapper.id, wrapper.constructor.name);
        wrapper.update();
    });
}, 1, builtInQueues.UPDATE);
setInterval(() => {
    gameObjectWrappers.forEach(wrapper => {
        if (!wrapper.get().exists) {
            gameObjectWrappers.delete(wrapper.id);
            return;
        }
        wrapper.run();
    });
}, 1, builtInQueues.ACTIONS);
function getObjectWrapper(gameObject) {
    if (gameObjectWrappers.has(gameObject.id)) {
        return gameObjectWrappers.get(gameObject.id);
    }
    return false;
}
function createObjectWrapper(constructor, obj, ...args) {
    let wrapper = new constructor(obj, ...args);
    gameObjectWrappers.set(wrapper.id, wrapper);
    return wrapper;
}
class GameObjectWrapper {
    constructor(gameObject) {
        this.gameObject = gameObject;
        this.id = gameObject.id;
    }
    get x() {
        return this.get().x;
    }
    get y() {
        return this.get().y;
    }
    get location() {
        return Location.getLocationFromObj(this);
    }
    get() {
        return this.gameObject;
    }
    update() {
        console.log("in GOW update!");
    }
    run() {
        console.log("in GOW run!");
    }
}

class Dropoff extends BaseResourceAction {
    constructor(target) {
        super(Dropoff.actionType, target);
    }
    canDo(object) {
        if (!super.canDo(object))
            return false;
        return object.store.total > 0;
    }
    getAssignmentAmount(object) {
        console.log(this.id, "getting assign amount for", object.id);
        let assignAmts = new ResourceInfoCollection();
        let stuffInCreep = object.store.getByAmount();
        console.log("stuff in creep");
        for (let resource of stuffInCreep) {
            let ourResourceInfo = this.resourceAmounts.get(resource.type);
            console.log(resource.type, ourResourceInfo, resource);
            if (ourResourceInfo.amount > 0) {
                let assignAmt = Math.min(resource.amount, ourResourceInfo.amount);
                assignAmts.setAmount(resource.type, assignAmt);
            }
        }
        return assignAmts;
    }
    doJob(object) {
        let assignment = this.assignments.get(object.id);
        if (!assignment) {
            return false;
        }
        if (getSettings().getRange(object, this.target) <= 1) {
            let resourcesInAssignment = assignment.assignAmounts.getByAmount();
            if (resourcesInAssignment.length == 0) {
                return true;
            }
            let resourceToTransfer = resourcesInAssignment[0];
            let target = this.target.get();
            if (target instanceof Creep) {
                let ret = object.get().transfer(target, resourceToTransfer.type);
                console.log(object.id, "xfered to creep", target.id, "got", ret, resourceToTransfer.type, resourceToTransfer.amount);
                if (ret != 0) {
                    console.log(object.id, "got", ret, "while trying to give resource to a creep", target.id);
                }
            }
            else {
                let ret = object.get().transfer(target, resourceToTransfer.type);
                console.log(object.id, "xfered to building", target.id, "got", ret, resourceToTransfer.type, resourceToTransfer.amount);
                if (ret != 0) {
                    console.log(object.id, "got", ret, "while trying to give resource to a structure", target.id);
                }
            }
            assignment.assignAmounts.delete(resourceToTransfer.type);
            if (assignment.assignAmounts.total == 0) {
                return true;
            }
        }
        return false;
    }
}
Dropoff.actionType = "📥";

class Pickup extends BaseResourceAction {
    constructor(target) {
        super(Pickup.actionType, target);
    }
    canDo(object) {
        if (!super.canDo(object))
            return false;
        return object.store.totalFree > 0;
    }
    getAssignmentAmount(object) {
        if (!object.store) {
            console.log('why is there no store? its defined in the constructor', object);
        }
        let roomInCreep = object.store.totalFree;
        let assignAmts = new ResourceInfoCollection();
        let overMax = this.target.store.getTypesByAmountOverMax();
        let i = 0;
        let overMaxTypes = overMax.getTypes();
        while (assignAmts.total < roomInCreep && i < overMaxTypes.length) {
            let typeKey = overMaxTypes[i++];
            let type = overMax.get(typeKey);
            let assignAmt = Math.min(type.amountOverMax, roomInCreep - assignAmts.total);
            assignAmts.setAmount(type.type, assignAmt);
        }
        return assignAmts;
    }
    doJob(object) {
        let assignment = this.assignments.get(object.id);
        if (!assignment) {
            console.log(object.id, "no valid assignment for this creep, wtf bro?");
            return false;
        }
        if (getSettings().getRange(object, this.target) <= 1) {
            let resourcesInAssignment = assignment.assignAmounts.getByAmount();
            if (resourcesInAssignment.length == 0) {
                console.log("no assignments left for this creep, wtf bro?!!?!?");
                return true;
            }
            let resourceToTransfer = resourcesInAssignment[0];
            resourceToTransfer.amount = Math.min(resourceToTransfer.amount, this.target.store.getAmount(resourceToTransfer.type));
            let target = this.target.get();
            if (target instanceof Creep) {
                console.log(object.id, "pulling from creep", target.id);
                let ret = target.transfer(object.get(), resourceToTransfer.type, resourceToTransfer.amount);
                console.log(object.id, "pulled from creep", target.id, "got", ret, resourceToTransfer.type, resourceToTransfer.amount);
                if (ret != 0) {
                    console.log(object.id, "got", ret, "while trying to get energy from creep", target.id);
                }
            }
            else {
                console.log(object.id, "pulling from building", target.id);
                let ret = object.get().withdraw(target, resourceToTransfer.type, resourceToTransfer.amount);
                console.log(object.id, "pulled from building", target.id, "got", ret, resourceToTransfer.type, resourceToTransfer.amount);
                if (ret != 0) {
                    console.log(object.id, "got", ret, "while trying to get energy from structure", target.id);
                }
            }
            assignment.assignAmounts.delete(resourceToTransfer.type);
            if (assignment.assignAmounts.total == 0) {
                return true;
            }
        }
        return false;
    }
}
Pickup.actionType = "📤";

class KillBuilding extends BasePartAction {
    constructor(target) {
        super(KillBuilding.actionType, target, []);
    }
    canDo(object) {
        if (!super.canDo(object))
            return false;
        let creepClassification = object.getBodyClassification();
        if (creepClassification.hasAttackActive || creepClassification.hasRangedActive) {
            return true;
        }
        return false;
    }
    getAssignmentAmount(object) {
        let validParts = new BodyPartInfoCollection();
        let creepClassification = object.getBodyClassification();
        validParts.setAmount(ATTACK, creepClassification.numAttackActive);
        validParts.setMax(ATTACK, 100);
        validParts.setAmount(RANGED_ATTACK, creepClassification.numRangedActive);
        validParts.setMax(RANGED_ATTACK, 100);
        return validParts;
    }
    doJob(object) {
        if (!this.target.get().exists) {
            console.log(object.id, "attaking dead object", this.id);
            return true;
        }
        let assignment = this.assignments.get(object.id);
        if (!assignment) {
            console.log(object.id, "not assigned to", this.id, "wtf you doin?");
            return true;
        }
        let creepClassification = object.getBodyClassification();
        if (creepClassification.hasAttackActive && assignment.distanceToTarget <= 1) {
            let ret = object.get().attack(this.target.get());
            if (!ret) {
                console.log(object.id, "tried to attack", this.target.id, "got", ret);
                return true;
            }
        }
        if (creepClassification.hasRangedActive && assignment.distanceToTarget <= 3) {
            let ret = object.get().rangedAttack(this.target.get());
            if (!ret) {
                console.log(object.id, "tried to ranged attack", this.target.id, "got", ret);
                return true;
            }
        }
        return false;
    }
}
KillBuilding.actionType = "🧨";

class StructureWrapper extends GameObjectWrapper {
    constructor(structure) {
        super(structure);
        this.actionKill = false;
    }
    get hits() {
        return this.get().hits;
    }
    get hitsMax() {
        return this.get().hitsMax;
    }
    get my() {
        return !!this.get().my;
    }
    get enemy() {
        return !!(this.get().my === false);
    }
    get neutral() {
        return !!(this.get().my === undefined);
    }
    update() {
        console.log("struct update", this.id, this.my);
        if (this.enemy)
            this.updateKill();
    }
    updateKill() {
        if (!this.actionKill) {
            this.actionKill = new KillBuilding(this);
        }
        if (this.actionKill)
            this.actionKill.display();
        this.actionKill.requiredParts.setAmount(ATTACK, 1);
        this.actionKill.requiredParts.setAmount(RANGED_ATTACK, 1);
    }
}

class HasStorageWrapper extends StructureWrapper {
    constructor(structure) {
        super(structure);
        this.actionPickup = false;
        this.actionDropoff = false;
        this.store = new ResourceInfoCollection();
        this.store.updateFromStore(structure.store);
    }
    update(autoPickup = true, autoDropoff = true) {
        super.update();
        if (this.my || this.neutral) {
            this.store.updateFromStore(this.get().store);
            let maybeMax = this.get().store.getCapacity();
            if (maybeMax == null)
                maybeMax = this.get().store.getCapacity(RESOURCE_ENERGY);
            if (maybeMax)
                this.store.setMaxTotal(maybeMax);
            if (autoPickup)
                this.updatePickup();
            if (autoDropoff)
                this.updateDropoff();
            if (this.actionDropoff)
                this.actionDropoff.display();
            if (this.actionPickup)
                this.actionPickup.display();
        }
    }
    updateDropoff() {
        let dropoffResources = this.store.getTypesByAmountAllowed();
        let dropoffResourceKeys = dropoffResources.getTypes();
        if (dropoffResourceKeys.length > 0) {
            if (!this.actionDropoff) {
                console.log(this.id, "making dropoff");
                this.actionDropoff = new Dropoff(this);
            }
            this.actionDropoff.resourceAmounts.updateFromCollection(dropoffResources);
        }
        else if (this.actionDropoff) {
            console.log(this.id, "deleting dropoff");
            this.cancelDropoff();
        }
    }
    cancelDropoff() {
        if (this.actionDropoff)
            deleteAction(this.actionDropoff);
        this.actionDropoff = false;
    }
    updatePickup() {
        let pickupResources = this.store.getTypesByAmountOverMax();
        let pickupResourceKeys = pickupResources.getTypes();
        if (pickupResourceKeys.length > 0) {
            if (!this.actionPickup) {
                console.log(this.id, "making Pickup");
                this.actionPickup = new Pickup(this);
            }
            this.actionPickup.resourceAmounts.updateFromCollection(pickupResources);
        }
        else if (this.actionPickup) {
            console.log(this.id, "deleting pickup");
            this.cancelPickup();
        }
    }
    cancelPickup() {
        if (this.actionPickup)
            deleteAction(this.actionPickup);
        this.actionPickup = false;
    }
}

Creep.prototype.structureType = "creep";
Creep.prototype.getWrapper = function () {
    let wrapper = getObjectWrapper(this);
    if (wrapper)
        return wrapper;
    wrapper = createObjectWrapper(CreepWrapper, this);
    creepWrappers.set(wrapper.id, wrapper);
    return wrapper;
};
let creepWrappers = new Map();
setInterval(() => {
    creepWrappers.forEach(wrapper => {
        if (!wrapper.get().exists) {
            creepWrappers.delete(wrapper.id);
            return;
        }
        wrapper.move();
    });
}, 1, builtInQueues.MOVEMENT);
function newBodyClassification() {
    return {
        hasAttack: false, hasRanged: false, hasHeal: false,
        hasAttackActive: false, hasRangedActive: false, hasHealActive: false,
        numAttack: 0, numRanged: 0, numHeal: 0,
        numAttackActive: 0, numRangedActive: 0, numHealActive: 0,
        hasWork: false, hasCarry: false,
        numWork: 0, numCarry: 0,
        fatness: 0, toughness: 0
    };
}
var CreepClass;
(function (CreepClass) {
    CreepClass["healer"] = "\uD83D\uDC68\u200D\u2695\uFE0F";
    CreepClass["ranged"] = "\uD83C\uDFF9";
    CreepClass["attacker"] = "\uD83E\uDD3A";
    CreepClass["sheild"] = "\uD83D\uDEE1";
    CreepClass["paladin"] = "\uD83C\uDFC7";
    CreepClass["poop"] = "\uD83D\uDCA9";
    CreepClass["wounded"] = "\uD83E\uDE79";
    CreepClass["hauler"] = "\uD83D\uDE9A";
    CreepClass["worker"] = "\uD83D\uDE9C";
    CreepClass["miner"] = "\u26CF";
})(CreepClass || (CreepClass = {}));
function classifyCreep(creepWrapper, woundedThreshold = 0.5) {
    if (creepWrapper instanceof Creep) {
        creepWrapper = creepWrapper.getWrapper();
    }
    let creep = creepWrapper.get();
    let bodyClass = creepWrapper.getBodyClassification();
    let highestPartCount = Math.max(bodyClass.numAttack, bodyClass.numRanged, bodyClass.numHeal);
    let activePartCount = bodyClass.numAttackActive + bodyClass.numHealActive + bodyClass.numRangedActive;
    if (creep.hits <= creep.hitsMax * woundedThreshold || activePartCount == 0) {
        return CreepClass.wounded;
    }
    else if (bodyClass.numAttack == highestPartCount) {
        if (bodyClass.hasHeal && bodyClass.numAttack * 0.5 <= bodyClass.numHeal) {
            return CreepClass.sheild;
        }
        if (bodyClass.hasRanged && bodyClass.numAttack * 0.5 <= bodyClass.numRanged) {
            return CreepClass.poop;
        }
        return CreepClass.attacker;
    }
    else if (bodyClass.numRanged == highestPartCount) {
        if (bodyClass.numRanged * 0.5 <= bodyClass.numHeal) {
            return CreepClass.paladin;
        }
        if (bodyClass.hasAttack && bodyClass.numRanged * 0.5 <= bodyClass.numAttack) {
            return CreepClass.poop;
        }
        return CreepClass.ranged;
    }
    else if (bodyClass.numHeal == highestPartCount) {
        if (bodyClass.hasAttack && bodyClass.numHeal * 0.5 <= bodyClass.numAttack) {
            return CreepClass.poop;
        }
        if (bodyClass.hasRanged && bodyClass.numHeal * 0.5 <= bodyClass.numRanged) {
            return CreepClass.poop;
        }
        return CreepClass.healer;
    }
    else if (bodyClass.numWork == highestPartCount) {
        if (bodyClass.hasCarry && bodyClass.numWork * 0.5 <= bodyClass.numCarry) {
            return CreepClass.miner;
        }
        return CreepClass.worker;
    }
    else if (bodyClass.numCarry == highestPartCount) {
        if (bodyClass.hasWork) {
            return CreepClass.worker;
        }
        return CreepClass.hauler;
    }
    return CreepClass.poop;
}
class CreepBody {
    constructor(creepWrapper) {
        this.woundedThreshold = 0.55;
        this.creepWrapper = creepWrapper;
        this.body = creepWrapper.get().body;
        this.updateBody();
        this.bodyClassification = this.setupBodyClassification(creepWrapper);
        this.creepClass = new CachedValue(() => {
            return classifyCreep(creepWrapper.get(), this.woundedThreshold);
        }, getSettings().creepClassCacheTicks, false);
    }
    updateBody() {
        this.body = this.creepWrapper.get().body;
    }
    getBodyClassification() {
        let classification = this.bodyClassification.get();
        return classification;
    }
    setupBodyClassification(creepWrapper) {
        return new CachedValue(() => {
            let creep = creepWrapper.get();
            let ret = newBodyClassification();
            if (!creep.exists)
                return ret;
            console.log("counting body parts", creep.body.length);
            ret.hasAttack = ret.hasRanged = ret.hasHeal = false;
            ret.numAttack = ret.numRanged = ret.numHeal = 0;
            ret.hasAttackActive = ret.hasRangedActive = ret.hasHealActive = false;
            ret.numAttackActive = ret.numRangedActive = ret.numHealActive = 0;
            for (let part of creep.body) {
                if (part.type == ATTACK) {
                    ret.hasAttack = true;
                    ret.numAttack++;
                    if (part.hits > 0) {
                        ret.hasAttackActive = true;
                        ret.numAttackActive++;
                    }
                }
                if (part.type == RANGED_ATTACK) {
                    ret.numRanged++;
                    ret.hasRanged = true;
                    if (part.hits > 0) {
                        ret.hasRangedActive = true;
                        ret.numRangedActive++;
                    }
                }
                if (part.type == HEAL) {
                    ret.hasHeal = true;
                    ret.numHeal++;
                    if (part.hits > 0) {
                        ret.hasHealActive = true;
                        ret.numHealActive++;
                    }
                }
                if (part.type == CARRY) {
                    ret.hasCarry = true;
                    ret.numCarry++;
                }
                if (part.type == WORK) {
                    ret.hasWork = true;
                    ret.numWork++;
                }
            }
            return ret;
        });
    }
    getCreepClass() {
        return this.creepClass.get();
    }
    isAttacker(onlyActive = false) {
        let description = this.bodyClassification.get();
        if (onlyActive) {
            return description.hasAttackActive;
        }
        else {
            return description.hasAttack;
        }
    }
    isRangedAttacker(onlyActive = false) {
        let description = this.bodyClassification.get();
        if (onlyActive) {
            return description.hasRangedActive;
        }
        else {
            return description.hasRanged;
        }
    }
    isHealer(onlyActive = false) {
        let description = this.bodyClassification.get();
        if (onlyActive) {
            return description.hasHealActive;
        }
        else {
            return description.hasHeal;
        }
    }
    isWorker() {
        return this.body.some((part) => part.type == WORK);
    }
    isHauler() {
        return this.body.some((part) => part.type == CARRY);
    }
    hasPart(partType) {
        return this.body.some((part) => part.type == partType);
    }
    numParts(partType) {
        return this.body.filter((part) => part.type == partType).length;
    }
}
class CreepWrapper extends HasStorageWrapper {
    constructor(creep) {
        super(creep);
        this._action = false;
        this.targetPrimary = false;
        this.targetsSecondary = [];
        this.targetLocation = false;
        this.forcedMoveDir = false;
        this._spawning = false;
        this.body = new CreepBody(this);
        if (creepWrappers.has(this.id)) {
            throw new Error("duplicate creep wrapper!" + this.id);
        }
        creepWrappers.set(this.id, this);
    }
    get action() {
        if (!this._action || !this._action.valid()) {
            this._action = findClosestAction(this, [BasePartAction, BaseResourceAction]);
            if (!this._action)
                console.log("no action found!!!");
            else {
                this._action.assign(this);
            }
        }
        if (this._action) {
            return this._action;
        }
        return false;
    }
    set action(newVal) {
        this._action = newVal;
    }
    get spawning() {
        return this._spawning;
    }
    set spawning(isSpawning) {
        if (!isSpawning) {
            this.body = new CreepBody(this);
        }
    }
    getCreepClass() {
        return this.body.getCreepClass();
    }
    getBodyClassification() {
        return this.body.getBodyClassification();
    }
    hasBodyPart(part) {
        return this.body.hasPart(part);
    }
    isFull() {
        return this.get().store.getFreeCapacity() == 0;
    }
    update() {
        super.update(false, false);
        if (!this.my)
            return;
        let action = this.action;
        if (action) {
            console.log(this.id, "has action", action.id);
        }
    }
    run() {
        let action = this.action;
        if (!action) {
            console.log(this.id, "has no action, doing nothing");
            return;
        }
        let rangeToAction = getSettings().getRange(this, action.target);
        console.log(this.id, "range to action", rangeToAction, "max range", action.maxRange);
        if (rangeToAction <= action.maxRange) {
            let actionDone = action.doJob(this);
            if (actionDone == true) {
                console.log(this.id, "finished action", action.id);
                this.action && this.action.unassign(this);
                this.action = false;
            }
        }
    }
    move() {
        let action = this.action;
        if (!action) {
            console.log(this.id, "has no action, not moving");
            return;
        }
        let rangeToAction = getSettings().getRange(this, action.target);
        if (rangeToAction > action.maxRange) {
            this.get().moveTo(action.target);
        }
    }
}

class CreepSquad {
    constructor() {
        this.desiredParts = new BodyPartInfoCollection();
        this._currentParts = new CachedValue(() => {
            let currentParts = new BodyPartInfoCollection();
            this.creeps.forEach(creep => {
                let bodyInfo = creep.getBodyClassification();
                if (bodyInfo.hasAttack) {
                    currentParts.addAmount(ATTACK, bodyInfo.numAttack);
                }
                if (bodyInfo.hasRanged) {
                    currentParts.addAmount(RANGED_ATTACK, bodyInfo.numRanged);
                }
                if (bodyInfo.hasHeal) {
                    currentParts.addAmount(HEAL, bodyInfo.numHeal);
                }
                if (bodyInfo.hasCarry) {
                    currentParts.addAmount(CARRY, bodyInfo.numCarry);
                }
                if (bodyInfo.hasWork) {
                    currentParts.addAmount(WORK, bodyInfo.numWork);
                }
            });
            return currentParts;
        }, Infinity, false);
        this.creeps = [];
        let ttl = 1;
        this.attackers = new CachedValue(() => {
            return this.creeps.filter((creep) => creep.getCreepClass() == CreepClass.attacker);
        }, ttl);
        this.ranged = new CachedValue(() => {
            return this.creeps.filter((creep) => creep.getCreepClass() == CreepClass.ranged);
        }, ttl);
        this.healers = new CachedValue(() => {
            return this.creeps.filter((creep) => creep.getCreepClass() == CreepClass.healer);
        }, ttl);
        this.sheilds = new CachedValue(() => {
            return this.creeps.filter((creep) => creep.getCreepClass() == CreepClass.sheild);
        }, ttl);
        this.paladins = new CachedValue(() => {
            return this.creeps.filter((creep) => creep.getCreepClass() == CreepClass.paladin);
        }, ttl);
        this.poops = new CachedValue(() => {
            return this.creeps.filter((creep) => creep.getCreepClass() == CreepClass.poop);
        }, ttl);
        this.wounded = new CachedValue(() => {
            return this.creeps.filter((creep) => creep.getCreepClass() == CreepClass.wounded);
        }, ttl);
        this.haulers = new CachedValue(() => {
            return this.creeps.filter((creep) => creep.getCreepClass() == CreepClass.hauler);
        }, ttl);
        this.workers = new CachedValue(() => {
            return this.creeps.filter((creep) => creep.getCreepClass() == CreepClass.worker);
        }, ttl);
        this.miners = new CachedValue(() => {
            return this.creeps.filter((creep) => creep.getCreepClass() == CreepClass.miner);
        }, ttl);
    }
    get currentParts() {
        return this._currentParts;
    }
    get missingParts() {
        return this.desiredParts.diff(this.currentParts.value);
    }
    get avgLocation() {
        let totalX = 0;
        let totalY = 0;
        this.creeps.forEach(creep => {
            totalX += creep.x;
            totalY += creep.y;
        });
        let numCreeps = this.creeps.length;
        return {
            x: totalX / numCreeps,
            y: totalY / numCreeps
        };
    }
    addCreep(creep) {
        this._currentParts.clearValue();
        this.creeps.push(creep);
    }
    setCreeps(creeps) {
        this._currentParts.clearValue();
        this.creeps = creeps;
    }
}

function updateStructures(intel, roomIntel) {
    let allBuildings = getObjectsByPrototype(Structure);
    allBuildings.forEach((building) => {
        if (!building.getWrapper)
            return;
        let wrapper = building.getWrapper();
        if (building instanceof OwnedStructure) {
            if (building.my) {
                intel.myBuildings.set(wrapper.id, wrapper);
                roomIntel.myBuildings.set(wrapper.id, wrapper);
            }
            else if (building.my === false) {
                intel.enemyBuildings.set(wrapper.id, wrapper);
                roomIntel.enemyBuildings.set(wrapper.id, wrapper);
            }
            else {
                intel.neutralBuildings.set(wrapper.id, wrapper);
                roomIntel.neutralBuildings.set(wrapper.id, wrapper);
            }
        }
    });
}
function updateCreeps(intel, roomIntel) {
    let allCreeps = getObjectsByPrototype(Creep);
    allCreeps.forEach((creep) => {
        if (creep.spawning) {
            console.log("intel skipping spawnin creep");
            return;
        }
        let wrapper = creep.getWrapper();
        if (creep.my) {
            intel.myCreeps.set(wrapper.id, wrapper);
            roomIntel === null || roomIntel === void 0 ? void 0 : roomIntel.myCreeps.set(wrapper.id, wrapper);
        }
        else {
            intel.enemyCreeps.set(wrapper.id, wrapper);
            roomIntel === null || roomIntel === void 0 ? void 0 : roomIntel.enemyCreeps.set(wrapper.id, wrapper);
        }
    });
}
function updateRoomIntel(roomName, intel, allRooms) {
    let roomIntel = intel.getRoomIntel(roomName);
    if (!roomIntel)
        return;
    updateCreeps(intel, roomIntel);
    updateStructures(intel, roomIntel);
}
class Intel {
    constructor() {
        this.rooms = new Map();
        this.myCreeps = new Map();
        this.mySquads = new Map();
        this.myBuildings = new Map();
        this.enemyCreeps = new Map();
        this.enemySquads = new Map();
        this.enemyBuildings = new Map();
        this.neutralBuildings = new Map();
    }
    getRoomIntel(roomName = "arena") {
        if (!this.rooms.has(roomName)) {
            let roomIntel = new RoomIntel(roomName);
            this.rooms.set(roomName, roomIntel);
            return roomIntel;
        }
        return this.rooms.get(roomName);
    }
    updateIntel() {
        this.rooms.forEach((roomIntel, roomName) => {
            let nextUpdateTick = (roomIntel.updateLastTick + roomIntel.updateFrequency);
            let currentTick = getSettings().getTick();
            if (nextUpdateTick <= currentTick) {
                updateRoomIntel(roomName, this, this.rooms);
                roomIntel.updateLastTick = currentTick;
            }
        });
    }
}
class RoomIntel {
    constructor(name, updateFrequency = getSettings().intelUpdateFrequency) {
        this.updateLastTick = -1;
        this.myCreeps = new Map();
        this.mySquads = new Map();
        this.myBuildings = new Map();
        this.enemyCreeps = new Map();
        this.enemySquads = new Map();
        this.enemyBuildings = new Map();
        this.neutralBuildings = new Map();
        this.name = name;
        this.updateFrequency = updateFrequency;
    }
}
let intel = new Intel();

StructureContainer.prototype.getWrapper = function () {
    let wrapper = getObjectWrapper(this);
    if (wrapper)
        return wrapper;
    wrapper = createObjectWrapper(ContainerWrapper, this);
    return wrapper;
};
class ContainerWrapper extends HasStorageWrapper {
    static doUpdate(creep) {
    }
    static doRun(creep) {
    }
    constructor(container) {
        super(container);
        let capacity = container.store.getCapacity(RESOURCE_ENERGY) || 0;
        this.store.updateMaxTotal(capacity);
    }
    update() {
        super.update();
        let energyInfo = this.store.get(RESOURCE_ENERGY);
        energyInfo.min = energyInfo.max = 0;
        ContainerWrapper.doUpdate(this);
    }
    run() {
        ContainerWrapper.doRun(this);
    }
}

StructureSpawn.prototype.getWrapper = function () {
    let wrapper = getObjectWrapper(this);
    if (wrapper)
        return wrapper;
    wrapper = createObjectWrapper(SpawnWrapper, this);
    return wrapper;
};
class SpawnWrapper extends HasStorageWrapper {
    constructor(spawn) {
        super(spawn);
        this.spawning = false;
        let capacity = spawn.store.getCapacity(RESOURCE_ENERGY) || 0;
        this.store.updateMaxTotal(capacity);
    }
    static doUpdate(spawn) {
    }
    static doRun(spawn) {
    }
    update() {
        super.update();
        let energyInfo = this.store.get(RESOURCE_ENERGY);
        energyInfo.min = energyInfo.max = this.store.maxTotal;
        SpawnWrapper.doUpdate(this);
    }
    run() {
        SpawnWrapper.doRun(this);
    }
    getAvailEnergy() {
        return this.get().store.getUsedCapacity(RESOURCE_ENERGY) || 0;
    }
    designBody(primaryPart, secondaryPart = false, secondaryPerPrimary = 0, fatness = 1, toughness = 0, energyAvail = false) {
        if (!energyAvail) {
            energyAvail = this.getAvailEnergy();
        }
        let toughPerPrimary = toughness + secondaryPerPrimary;
        let movePerPrimary = fatness > 0 ? (1 + secondaryPerPrimary + toughPerPrimary) / (fatness) : 0;
        let primaryCost = BODYPART_COST[primaryPart];
        let secondaryCost = 0;
        if (secondaryPart) {
            secondaryCost = BODYPART_COST[secondaryPart] * secondaryPerPrimary;
        }
        let moveCost = BODYPART_COST[MOVE] * movePerPrimary;
        let toughCost = BODYPART_COST[TOUGH] * toughPerPrimary;
        let costPerPrimary = Math.floor(primaryCost + secondaryCost + moveCost + toughCost);
        let totalParts = Math.floor(energyAvail / costPerPrimary);
        let numMove = Math.floor(totalParts * movePerPrimary);
        let numTough = Math.floor(totalParts * toughPerPrimary);
        let numSecondary = Math.floor(totalParts * secondaryPerPrimary);
        let numPrimary = totalParts;
        let body = Array(numMove + numTough + numSecondary + numPrimary);
        body.fill(TOUGH, 0, numTough);
        body.fill(primaryPart, numTough, numTough + numPrimary);
        if (secondaryPart) {
            body.fill(secondaryPart, numTough + numPrimary, numTough + numPrimary + numSecondary);
        }
        body.fill(MOVE, numTough + numPrimary + numSecondary, numTough + numPrimary + numSecondary + numMove);
        return body;
    }
    spawnCreep(body) {
        return __awaiter(this, void 0, void 0, function* () {
            let spawn = this.get();
            let res = spawn.spawnCreep(body);
            return new Promise$1((resolve, reject) => {
                if (res.error) {
                    reject(res.error);
                    return;
                }
                this.spawning = true;
                let spawningCreep = res.object;
                spawningCreep.spawning = true;
                let intId = setInterval(() => {
                    getObjectsByPrototype(Creep);
                    if (spawningCreep.x !== this.x || spawningCreep.y !== this.y) {
                        this.spawning = false;
                        spawningCreep.spawning = false;
                        resolve(spawningCreep.getWrapper());
                        clearInterval(intId);
                    }
                }, 1, builtInQueues.TICK_INIT);
            });
        });
    }
}

runtimeSettings.getTick();
let squad = new CreepSquad();
squad.desiredParts.setAmount(ATTACK, 8);
squad.desiredParts.setAmount(RANGED_ATTACK, 8);
squad.desiredParts.setAmount(HEAL, 8);
squad.desiredParts.setAmount(CARRY, 10);
let mySpawn;
let init = true;
let rInfo = intel.getRoomIntel();
function loop() {
    console.log("main loop start");
    intel.updateIntel();
    console.log("num neutral buildings", rInfo.neutralBuildings.size);
    if (init) {
        intel.myBuildings.forEach(building => {
            if (building.my && building instanceof SpawnWrapper) {
                mySpawn = building;
            }
            else if (!building.my && building instanceof SpawnWrapper) ;
        });
        init = false;
    }
    startTick();
    console.log("in regular main");
    endTick();
}
SpawnWrapper.doRun = function (wrapper) {
    if (!wrapper.my) {
        console.log("enemy spawn", wrapper.id);
        return;
    }
    if (wrapper.spawning) {
        console.log("already spawning");
        return;
    }
    wrapper.get();
    let neededParts = squad.missingParts;
    if (neededParts.total == 0) {
        return;
    }
    let energyAvail = wrapper.getAvailEnergy();
    if (energyAvail < (wrapper.get().store.getCapacity(RESOURCE_ENERGY) || 0) * 0.5) {
        return;
    }
    let body = false;
    if (neededParts.getAmount(CARRY) > 0) {
        neededParts.getAmount(CARRY);
        body = mySpawn.designBody(CARRY);
    }
    else if (neededParts.getAmount(ATTACK) > 0) {
        body = mySpawn.designBody(ATTACK, false, 0, 1, 1);
    }
    else if (neededParts.getAmount(RANGED_ATTACK) > 0) {
        body = mySpawn.designBody(RANGED_ATTACK);
    }
    else if (neededParts.getAmount(HEAL) > 0) {
        body = mySpawn.designBody(HEAL);
    }
    if (body) {
        let ret = wrapper.spawnCreep(body);
        ret.then((newCreep) => {
            console.log("new creep spawned");
            squad.addCreep(newCreep);
        });
    }
};

export { loop };
