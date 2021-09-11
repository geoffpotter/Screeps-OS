import { getObjectsByPrototype, findInRange, findClosestByRange, getCpuTime, getRange, getObjectById, findClosestByPath, getTicks, getDirection, getTerrainAt } from '/game/utils';
import { Creep, StructureTower } from '/game/prototypes';
import { Flag, BodyPart } from '/arena/prototypes';
import { text } from '/game/visual';
import { ATTACK, RANGED_ATTACK, HEAL, WORK, CARRY, MOVE, TOP_RIGHT, RIGHT, BOTTOM_RIGHT, TOP_LEFT, LEFT, BOTTOM_LEFT, TOP, BOTTOM, TERRAIN_WALL, TERRAIN_SWAMP } from '/game/constants';
import { searchPath, CostMatrix } from '/game/path-finder';

function _toArray(arr) {
  return _arrayWithHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableRest();
}

function _arrayWithHoles(arr) {
  if (Array.isArray(arr)) return arr;
}

function _iterableToArray(iter) {
  if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter);
}

function _unsupportedIterableToArray(o, minLen) {
  if (!o) return;
  if (typeof o === "string") return _arrayLikeToArray(o, minLen);
  var n = Object.prototype.toString.call(o).slice(8, -1);
  if (n === "Object" && o.constructor) n = o.constructor.name;
  if (n === "Map" || n === "Set") return Array.from(o);
  if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
}

function _arrayLikeToArray(arr, len) {
  if (len == null || len > arr.length) len = arr.length;

  for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];

  return arr2;
}

function _nonIterableRest() {
  throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}

function _toPrimitive(input, hint) {
  if (typeof input !== "object" || input === null) return input;
  var prim = input[Symbol.toPrimitive];

  if (prim !== undefined) {
    var res = prim.call(input, hint || "default");
    if (typeof res !== "object") return res;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }

  return (hint === "string" ? String : Number)(input);
}

function _toPropertyKey(arg) {
  var key = _toPrimitive(arg, "string");

  return typeof key === "symbol" ? key : String(key);
}

function _decorate(decorators, factory, superClass, mixins) {
  var api = _getDecoratorsApi();

  if (mixins) {
    for (var i = 0; i < mixins.length; i++) {
      api = mixins[i](api);
    }
  }

  var r = factory(function initialize(O) {
    api.initializeInstanceElements(O, decorated.elements);
  }, superClass);
  var decorated = api.decorateClass(_coalesceClassElements(r.d.map(_createElementDescriptor)), decorators);
  api.initializeClassElements(r.F, decorated.elements);
  return api.runClassFinishers(r.F, decorated.finishers);
}

function _getDecoratorsApi() {
  _getDecoratorsApi = function () {
    return api;
  };

  var api = {
    elementsDefinitionOrder: [["method"], ["field"]],
    initializeInstanceElements: function (O, elements) {
      ["method", "field"].forEach(function (kind) {
        elements.forEach(function (element) {
          if (element.kind === kind && element.placement === "own") {
            this.defineClassElement(O, element);
          }
        }, this);
      }, this);
    },
    initializeClassElements: function (F, elements) {
      var proto = F.prototype;
      ["method", "field"].forEach(function (kind) {
        elements.forEach(function (element) {
          var placement = element.placement;

          if (element.kind === kind && (placement === "static" || placement === "prototype")) {
            var receiver = placement === "static" ? F : proto;
            this.defineClassElement(receiver, element);
          }
        }, this);
      }, this);
    },
    defineClassElement: function (receiver, element) {
      var descriptor = element.descriptor;

      if (element.kind === "field") {
        var initializer = element.initializer;
        descriptor = {
          enumerable: descriptor.enumerable,
          writable: descriptor.writable,
          configurable: descriptor.configurable,
          value: initializer === void 0 ? void 0 : initializer.call(receiver)
        };
      }

      Object.defineProperty(receiver, element.key, descriptor);
    },
    decorateClass: function (elements, decorators) {
      var newElements = [];
      var finishers = [];
      var placements = {
        static: [],
        prototype: [],
        own: []
      };
      elements.forEach(function (element) {
        this.addElementPlacement(element, placements);
      }, this);
      elements.forEach(function (element) {
        if (!_hasDecorators(element)) return newElements.push(element);
        var elementFinishersExtras = this.decorateElement(element, placements);
        newElements.push(elementFinishersExtras.element);
        newElements.push.apply(newElements, elementFinishersExtras.extras);
        finishers.push.apply(finishers, elementFinishersExtras.finishers);
      }, this);

      if (!decorators) {
        return {
          elements: newElements,
          finishers: finishers
        };
      }

      var result = this.decorateConstructor(newElements, decorators);
      finishers.push.apply(finishers, result.finishers);
      result.finishers = finishers;
      return result;
    },
    addElementPlacement: function (element, placements, silent) {
      var keys = placements[element.placement];

      if (!silent && keys.indexOf(element.key) !== -1) {
        throw new TypeError("Duplicated element (" + element.key + ")");
      }

      keys.push(element.key);
    },
    decorateElement: function (element, placements) {
      var extras = [];
      var finishers = [];

      for (var decorators = element.decorators, i = decorators.length - 1; i >= 0; i--) {
        var keys = placements[element.placement];
        keys.splice(keys.indexOf(element.key), 1);
        var elementObject = this.fromElementDescriptor(element);
        var elementFinisherExtras = this.toElementFinisherExtras((0, decorators[i])(elementObject) || elementObject);
        element = elementFinisherExtras.element;
        this.addElementPlacement(element, placements);

        if (elementFinisherExtras.finisher) {
          finishers.push(elementFinisherExtras.finisher);
        }

        var newExtras = elementFinisherExtras.extras;

        if (newExtras) {
          for (var j = 0; j < newExtras.length; j++) {
            this.addElementPlacement(newExtras[j], placements);
          }

          extras.push.apply(extras, newExtras);
        }
      }

      return {
        element: element,
        finishers: finishers,
        extras: extras
      };
    },
    decorateConstructor: function (elements, decorators) {
      var finishers = [];

      for (var i = decorators.length - 1; i >= 0; i--) {
        var obj = this.fromClassDescriptor(elements);
        var elementsAndFinisher = this.toClassDescriptor((0, decorators[i])(obj) || obj);

        if (elementsAndFinisher.finisher !== undefined) {
          finishers.push(elementsAndFinisher.finisher);
        }

        if (elementsAndFinisher.elements !== undefined) {
          elements = elementsAndFinisher.elements;

          for (var j = 0; j < elements.length - 1; j++) {
            for (var k = j + 1; k < elements.length; k++) {
              if (elements[j].key === elements[k].key && elements[j].placement === elements[k].placement) {
                throw new TypeError("Duplicated element (" + elements[j].key + ")");
              }
            }
          }
        }
      }

      return {
        elements: elements,
        finishers: finishers
      };
    },
    fromElementDescriptor: function (element) {
      var obj = {
        kind: element.kind,
        key: element.key,
        placement: element.placement,
        descriptor: element.descriptor
      };
      var desc = {
        value: "Descriptor",
        configurable: true
      };
      Object.defineProperty(obj, Symbol.toStringTag, desc);
      if (element.kind === "field") obj.initializer = element.initializer;
      return obj;
    },
    toElementDescriptors: function (elementObjects) {
      if (elementObjects === undefined) return;
      return _toArray(elementObjects).map(function (elementObject) {
        var element = this.toElementDescriptor(elementObject);
        this.disallowProperty(elementObject, "finisher", "An element descriptor");
        this.disallowProperty(elementObject, "extras", "An element descriptor");
        return element;
      }, this);
    },
    toElementDescriptor: function (elementObject) {
      var kind = String(elementObject.kind);

      if (kind !== "method" && kind !== "field") {
        throw new TypeError('An element descriptor\'s .kind property must be either "method" or' + ' "field", but a decorator created an element descriptor with' + ' .kind "' + kind + '"');
      }

      var key = _toPropertyKey(elementObject.key);

      var placement = String(elementObject.placement);

      if (placement !== "static" && placement !== "prototype" && placement !== "own") {
        throw new TypeError('An element descriptor\'s .placement property must be one of "static",' + ' "prototype" or "own", but a decorator created an element descriptor' + ' with .placement "' + placement + '"');
      }

      var descriptor = elementObject.descriptor;
      this.disallowProperty(elementObject, "elements", "An element descriptor");
      var element = {
        kind: kind,
        key: key,
        placement: placement,
        descriptor: Object.assign({}, descriptor)
      };

      if (kind !== "field") {
        this.disallowProperty(elementObject, "initializer", "A method descriptor");
      } else {
        this.disallowProperty(descriptor, "get", "The property descriptor of a field descriptor");
        this.disallowProperty(descriptor, "set", "The property descriptor of a field descriptor");
        this.disallowProperty(descriptor, "value", "The property descriptor of a field descriptor");
        element.initializer = elementObject.initializer;
      }

      return element;
    },
    toElementFinisherExtras: function (elementObject) {
      var element = this.toElementDescriptor(elementObject);

      var finisher = _optionalCallableProperty(elementObject, "finisher");

      var extras = this.toElementDescriptors(elementObject.extras);
      return {
        element: element,
        finisher: finisher,
        extras: extras
      };
    },
    fromClassDescriptor: function (elements) {
      var obj = {
        kind: "class",
        elements: elements.map(this.fromElementDescriptor, this)
      };
      var desc = {
        value: "Descriptor",
        configurable: true
      };
      Object.defineProperty(obj, Symbol.toStringTag, desc);
      return obj;
    },
    toClassDescriptor: function (obj) {
      var kind = String(obj.kind);

      if (kind !== "class") {
        throw new TypeError('A class descriptor\'s .kind property must be "class", but a decorator' + ' created a class descriptor with .kind "' + kind + '"');
      }

      this.disallowProperty(obj, "key", "A class descriptor");
      this.disallowProperty(obj, "placement", "A class descriptor");
      this.disallowProperty(obj, "descriptor", "A class descriptor");
      this.disallowProperty(obj, "initializer", "A class descriptor");
      this.disallowProperty(obj, "extras", "A class descriptor");

      var finisher = _optionalCallableProperty(obj, "finisher");

      var elements = this.toElementDescriptors(obj.elements);
      return {
        elements: elements,
        finisher: finisher
      };
    },
    runClassFinishers: function (constructor, finishers) {
      for (var i = 0; i < finishers.length; i++) {
        var newConstructor = (0, finishers[i])(constructor);

        if (newConstructor !== undefined) {
          if (typeof newConstructor !== "function") {
            throw new TypeError("Finishers must return a constructor.");
          }

          constructor = newConstructor;
        }
      }

      return constructor;
    },
    disallowProperty: function (obj, name, objectType) {
      if (obj[name] !== undefined) {
        throw new TypeError(objectType + " can't have a ." + name + " property.");
      }
    }
  };
  return api;
}

function _createElementDescriptor(def) {
  var key = _toPropertyKey(def.key);

  var descriptor;

  if (def.kind === "method") {
    descriptor = {
      value: def.value,
      writable: true,
      configurable: true,
      enumerable: false
    };
  } else if (def.kind === "get") {
    descriptor = {
      get: def.value,
      configurable: true,
      enumerable: false
    };
  } else if (def.kind === "set") {
    descriptor = {
      set: def.value,
      configurable: true,
      enumerable: false
    };
  } else if (def.kind === "field") {
    descriptor = {
      configurable: true,
      writable: true,
      enumerable: true
    };
  }

  var element = {
    kind: def.kind === "field" ? "field" : "method",
    key: key,
    placement: def.static ? "static" : def.kind === "field" ? "own" : "prototype",
    descriptor: descriptor
  };
  if (def.decorators) element.decorators = def.decorators;
  if (def.kind === "field") element.initializer = def.value;
  return element;
}

function _coalesceGetterSetter(element, other) {
  if (element.descriptor.get !== undefined) {
    other.descriptor.get = element.descriptor.get;
  } else {
    other.descriptor.set = element.descriptor.set;
  }
}

function _coalesceClassElements(elements) {
  var newElements = [];

  var isSameElement = function (other) {
    return other.kind === "method" && other.key === element.key && other.placement === element.placement;
  };

  for (var i = 0; i < elements.length; i++) {
    var element = elements[i];
    var other;

    if (element.kind === "method" && (other = newElements.find(isSameElement))) {
      if (_isDataDescriptor(element.descriptor) || _isDataDescriptor(other.descriptor)) {
        if (_hasDecorators(element) || _hasDecorators(other)) {
          throw new ReferenceError("Duplicated methods (" + element.key + ") can't be decorated.");
        }

        other.descriptor = element.descriptor;
      } else {
        if (_hasDecorators(element)) {
          if (_hasDecorators(other)) {
            throw new ReferenceError("Decorators can't be placed on different accessors with for " + "the same property (" + element.key + ").");
          }

          other.decorators = element.decorators;
        }

        _coalesceGetterSetter(element, other);
      }
    } else {
      newElements.push(element);
    }
  }

  return newElements;
}

function _hasDecorators(element) {
  return element.decorators && element.decorators.length;
}

function _isDataDescriptor(desc) {
  return desc !== undefined && !(desc.value === undefined && desc.writable === undefined);
}

function _optionalCallableProperty(obj, name) {
  var value = obj[name];

  if (value !== undefined && typeof value !== "function") {
    throw new TypeError("Expected '" + name + "' to be a function");
  }

  return value;
}

let mem$1 = {};
class defaultSettings {
    getCpu() {
        return getCpuTime();
    }
    getTick() {
        throw new Error("override me!");
    }
    getMemory() {
        return mem$1;
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
    getDistance(pos1, pos2) {
        return getRange(pos1, pos2);
    }
    getObjectById(id) {
        return getObjectById(id);
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
        console.log("---------------------------------------using default settings!!!------------------------");
        settingsHolder.settings = new defaultSettings();
        return settingsHolder.settings;
    }
    return settingsHolder.settings;
}
function overrideSettings(newSettingsObj) {
    console.log("---------------------------------------using Custom settings!!!------------------------");
    settingsHolder.settings = newSettingsObj;
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
let profiler$1 = new Profiler();
function profile$1(className = false) {
    return (target) => {
        return;
    };
}

let profiler = profiler$1;
let profile = profile$1;

/**
 * Queue of tasks that need to be run
 * @type {Function[]}
 */

let tasks = [];
/**
 * Queue of microTasks that need to be run
 * @type {Function[]}
 */

let microTasks = [];
/**
 * Queue a Microtask to be executed inbetween or after tasks, as cpu allows
 * 
 * These run first at the end of the main loop, then again inbetween tasks.
 * @param {Function} microTask 
 */

function queueMicroTask(microTask) {
  microTasks.push(microTask);
}
/**
 * Queue a Task to be executed at the end of the tick, as cpu allows
 * 
 * These run at the end of the tick, after the microtasks are run.
 * @param {Function} task 
 */

function queueTask(task) {
  tasks.push(task);
}

let taskRunners = _decorate([profile("tasks")], function (_initialize) {
  class taskRunners {
    constructor() {
      _initialize(this);
    }

  }

  return {
    F: taskRunners,
    d: [{
      kind: "method",
      decorators: [profile("tasks")],
      static: true,
      key: "runMicroTasks",
      value: function runMicroTasks(maxRuns = Infinity) {
        let profileName = profiler.getCurrentProfileTarget(); //console.log('microtask profiler name:',profileName)
        // profiler.startCall(profileName);
        //console.log('microTasks:', microTasks.length, maxRuns);

        let currentTask = 0;
        let numTasks;

        while (currentTask < (numTasks = microTasks.length) && currentTask <= maxRuns) {
          //console.log("running batch of microtasks")
          while (currentTask < numTasks) {
            let func = microTasks[currentTask];

            if (!func) {
              console.log("undefined microtask, check yer shit");
              continue;
            } //console.log("microTask", typeof func);


            profiler.pauseCall(profileName);
            func();
            profiler.resumeCall(profileName);
            currentTask++;
          }
        }

        microTasks.splice(0, currentTask); //console.log("MicroTasks done")
        //profiler.endCall(profileName)
      }
    }, {
      kind: "method",
      static: true,
      key: "runTasks",
      value: function runTasks(maxRuns = Infinity) {
        let profileName = profiler.getCurrentProfileTarget(); //profiler.startCall(profileName);

        let runs = 0;
        let tasksToRun = tasks;
        tasks = []; //console.log('tasks:', tasksToRun.length);

        while (tasksToRun.length > 0 && runs++ <= maxRuns) {
          let func = tasksToRun.shift();

          if (!func) {
            console.log("undefined microtask, check yer shit");
            continue;
          } //console.log("task", typeof func);


          profiler.pauseCall(profileName);
          func();
          taskRunners.runMicroTasks(1000000);
          profiler.resumeCall(profileName);
        }

        if (tasksToRun.length > 0) {
          tasks.push(...tasksToRun);
        } //console.log("Tasks done")
        //profiler.endCall(profileName)

      }
    }]
  };
});
function endTick$1() {
  let profileName = "tasks:endTick";
  profiler.startCall(profileName); //console.log("Tasks end tick");

  taskRunners.runMicroTasks();
  taskRunners.runTasks();
  profiler.endCall(profileName);
}

let intervals = {};
function processIntervals() {
    let profilerName = "setInterval:processIntervals";
    profiler.startCall(profilerName);
    let settings = getSettings();
    for (let intervalId in intervals) {
        let interval = intervals[intervalId];
        if (!intervals[intervalId]) {
            console.log("interval canceled:", intervalId);
            return;
        }
        if (!(interval.startTick >= 0)) {
            interval.startTick = 0;
        }
        let currentTick = settings.getTick();
        let ticksSinceStart = currentTick - interval.startTick;
        if (ticksSinceStart >= interval.ticks) {
            queueMicroTask(interval.func);
            interval.startTick = currentTick;
        }
    }
    queueTask(processIntervals);
    profiler.endCall(profilerName);
}
queueTask(processIntervals);

let timeouts = {};
function processTimeouts() {
    let profilerName = "setTimeout:processTimeouts";
    profiler.startCall(profilerName);
    let settings = getSettings();
    for (let timeoutId in timeouts) {
        let timeout = timeouts[timeoutId];
        if (!timeouts[timeoutId]) {
            console.log("timeout canceled:", timeoutId);
            return;
        }
        if (!(timeout.startTick >= 0)) {
            timeout.startTick = 0;
        }
        let ticksSinceStart = settings.getTick() - timeout.startTick;
        if (ticksSinceStart >= timeout.ticks) {
            queueMicroTask(timeout.func);
            delete timeouts[timeoutId];
        }
    }
    queueTask(processTimeouts);
    profiler.endCall(profilerName);
}
queueTask(processTimeouts);

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

var PromiseState;
(function (PromiseState) {
    PromiseState[PromiseState["Pending"] = 0] = "Pending";
    PromiseState[PromiseState["Resolved"] = 1] = "Resolved";
    PromiseState[PromiseState["Rejected"] = 2] = "Rejected";
})(PromiseState || (PromiseState = {}));
class Promise$1 {
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
        return new Promise$1((resolve) => {
            resolve(value);
        });
    }
    static reject(value) {
        return new Promise$1((_, reject) => {
            reject(value);
        });
    }
    then(onSuccess, onFailure) {
        let lastProfiledName = profiler.getCurrentProfileTarget();
        if (!lastProfiledName) {
            lastProfiledName = "global";
        }
        profiler.startCall("Promise:then");
        let thenPromise = new Promise$1((resolve, reject) => {
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
                    if (callbackResult instanceof Promise$1) {
                        while ((callbackResult instanceof Promise$1) && callbackResult.state !== PromiseState.Pending) {
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
], Promise$1.prototype, "resolveHandler", null);
__decorate([
    profile("Promise")
], Promise$1.prototype, "rejectHandler", null);
__decorate([
    profile("Promise")
], Promise$1.prototype, "resolvePromise", null);

let endTick = endTick$1;

Creep.prototype.smartMove = function (direction) {
    console.log(this.id, "moving", direction, this.move);
    return this.move(direction);
};
Creep.prototype.isAttacker = function (onlyActive = false) {
    if (!onlyActive) {
        return this.body.some((part) => part.type == ATTACK);
    }
    else {
        return this.body.some((part) => part.type == ATTACK && part.hits != 0);
    }
};
Creep.prototype.isRangedAttacker = function (onlyActive = false) {
    if (!onlyActive) {
        return this.body.some((part) => part.type == RANGED_ATTACK);
    }
    else {
        return this.body.some((part) => part.type == RANGED_ATTACK && part.hits != 0);
    }
};
Creep.prototype.isHealer = function (onlyActive = false) {
    if (!onlyActive) {
        return this.body.some((part) => part.type == HEAL);
    }
    else {
        return this.body.some((part) => part.type == HEAL && part.hits != 0);
    }
};
Creep.prototype.isWorker = function () {
    return this.body.some((part) => part.type == WORK);
};
Creep.prototype.isHauler = function () {
    return this.body.some((part) => part.type == CARRY);
};
Object.defineProperty(Creep.prototype, "squad", {
    get() {
        var _a;
        return (_a = this._squad) !== null && _a !== void 0 ? _a : false;
    },
    set(value) {
        this._squad = value;
    }
});

let mem = {};
class settings$1 {
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
    getDistance(pos1, pos2) {
        return getRange(pos1, pos2);
    }
    getObjectById(id) {
        return getObjectById(id);
    }
}
var runtimeSettings = new settings$1();

getSettings();

const COLOR_WHITE = 10;
class logger$2 {
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

new logger$2("fakeDash");
/**
 * @param {any} obj
 * @param {string} path
 * @param {any} defaultValue
 */

function get(obj, path, defaultValue = "") {
  // @ts-ignore
  const result = path.split('.').reduce((r, p) => r[p], obj);
  return result !== undefined ? result : defaultValue;
}

let logger$1 = new logger$2("indexingCollection");
class LRUInfo {
    constructor(id) {
        this.id = id;
        this.newer = this.older = false;
    }
}
class IndexingCollection {
    constructor(idField = "id", groupByFields = [], limits = false) {
        if (!limits) {
            limits = [10, 20, 30];
        }
        if (!idField) {
            throw new Error("Id field required!");
        }
        this.idField = idField;
        this.groupByFields = groupByFields;
        this.thingsById = {};
        this.groups = {};
        for (let f in groupByFields) {
            let field = groupByFields[f];
            this.groups[field] = {};
        }
        this.nodeInfoById = new Map();
        this.limits = limits;
        this.head = false;
        this.tail = false;
        this.serializeSeperator = "∪";
    }
    _markUsed(thingInfo) {
        if (this.head && thingInfo.id == this.head.id) {
            return;
        }
        if (thingInfo.older || thingInfo.newer) {
            let older = thingInfo.older;
            let newer = thingInfo.newer;
            if (older)
                older.newer = newer;
            if (newer)
                newer.older = older;
            thingInfo.older = thingInfo.newer = false;
        }
        if (!this.head) {
            this.head = this.tail = thingInfo;
        }
        else {
            this.head.newer = thingInfo;
            thingInfo.older = this.head;
            this.head = thingInfo;
            if (this.head.id == thingInfo.id) {
                thingInfo.newer = false;
            }
        }
    }
    _enforceLimit() {
        let finalLimit = this.limits[this.limits.length - 1];
        while (this.nodeInfoById.size > finalLimit) {
            logger$1.log('over limit!', this.nodeInfoById.size, finalLimit);
            let nodeInfoToRemove = this.tail;
            if (!nodeInfoToRemove) {
                continue;
            }
            let nodeToRemove = this.thingsById[nodeInfoToRemove.id];
            this._debugQueue();
            logger$1.log("removing node", JSON.stringify(nodeToRemove));
            this.remove(nodeToRemove);
        }
    }
    forEach(fn) {
        if (!this.head) {
            return;
        }
        let curr = this.head;
        let cThing = this.thingsById[curr.id];
        if (!cThing) {
            if (Object.keys(this.thingsById).length == 0) {
                return;
            }
            logger$1.log("broken...", this.head.id, Object.keys(this.thingsById));
            return;
        }
        fn(cThing);
        let i = 0;
        let max = Object.keys(this.thingsById).length + 10;
        if (!curr.older) {
            logger$1.log('broke somethin?');
            throw new Error("wtf");
        }
        while (curr = curr.older) {
            if (i > max) {
                logger$1.log('broke somethin?');
                throw new Error("wtf");
            }
            cThing = this.thingsById[curr.id];
            fn(cThing);
            i++;
        }
    }
    _debugQueue() {
        let out = "";
        this.forEach((thing) => {
            out += thing.id + ">";
        });
        logger$1.log('internal queue:', out);
    }
    add(theThing) {
        let id = get(theThing, this.idField);
        if (this.thingsById[id]) {
            this.remove(theThing);
        }
        this.thingsById[id] = theThing;
        for (let f in this.groupByFields) {
            let fieldPath = this.groupByFields[f];
            let value = get(theThing, fieldPath);
            if (!this.groups[fieldPath][value]) {
                this.groups[fieldPath][value] = [];
            }
            this.groups[fieldPath][value].push(id);
        }
        let nodeInfo = new LRUInfo(id);
        this.nodeInfoById.set(id, nodeInfo);
        this._markUsed(nodeInfo);
        this._enforceLimit();
    }
    remove(theThing) {
        let id = get(theThing, this.idField);
        if (!this.thingsById[id]) {
            throw new Error("Thing not in collection! -> " + id);
        }
        else {
            delete this.thingsById[id];
            let nodeInfo = this.nodeInfoById.get(id);
            if (!nodeInfo) {
                throw new Error("Thing not in collection! -> " + id);
            }
            if (nodeInfo.newer) {
                let newerNode = nodeInfo.newer;
                newerNode.older = nodeInfo.older;
            }
            if (nodeInfo.older) {
                let olderNode = nodeInfo.older;
                olderNode.newer = nodeInfo.newer;
            }
            if (nodeInfo.id == this.head.id) {
                this.head = nodeInfo.older;
            }
            if (nodeInfo.id == this.tail.id) {
                this.tail = nodeInfo.newer;
            }
            this.nodeInfoById.delete(id);
            for (let f in this.groupByFields) {
                let fieldPath = this.groupByFields[f];
                let value = get(theThing, fieldPath);
                if (this.groups[fieldPath][value]) {
                    this.groups[fieldPath][value] = this.groups[fieldPath][value].filter((thisId) => id == thisId);
                }
                else {
                    logger$1.log("grouping error:", fieldPath, value, Object.keys(this.groups[fieldPath]));
                    throw new Error("Object for removal isn't in all groupings.. I broke something, I'm sorry.");
                }
            }
        }
    }
    hasId(id) {
        let has = !!this.thingsById[id];
        return has;
    }
    has(aThing) {
        let id = get(aThing, this.idField);
        let has = this.thingsById[id] != undefined;
        if (has) {
            this.nodeInfoById.get(id);
        }
        return has;
    }
    getAll() {
        return Object.values(this.thingsById);
    }
    getById(id) {
        if (!this.thingsById[id]) {
            return false;
        }
        let info = this.nodeInfoById.get(id);
        if (info)
            this._markUsed(info);
        return this.thingsById[id];
    }
    getGroupWithValue(fieldPath, value) {
        let group = this.getGroup(fieldPath);
        if (!group[value]) {
            return false;
        }
        return group[value];
    }
    getGroup(fieldPath) {
        if (this.groupByFields.indexOf(fieldPath) == -1) {
            throw new Error("there's no grouping by this field:" + fieldPath);
        }
        return this.groups[fieldPath];
    }
    serialize() {
        let arr = [];
        arr.push(this.idField);
        arr.push(this.limits.join("Œ"));
        arr = arr.concat(this.groupByFields);
        arr.push(false);
        let numSerialized = 0;
        let currLimitIndex = 0;
        this.forEach((thing) => {
            if (currLimitIndex >= (this.limits.length - 1)) {
                return;
            }
            let serialized = thing.serialize(currLimitIndex + 1);
            arr.push(serialized);
            numSerialized++;
            let currLimit = this.limits[currLimitIndex];
            while (currLimit && numSerialized >= currLimit) {
                currLimit = this.limits[currLimitIndex];
                currLimitIndex++;
                logger$1.log("next limit", currLimitIndex + 1, "/", this.limits.length, "for serializing", this.limits[currLimitIndex - 1]);
                if (currLimitIndex >= (this.limits.length - 1)) {
                    logger$1.log("not serializing anymore", numSerialized);
                    return;
                }
            }
        });
        return this.serializeSeperator + arr.join(this.serializeSeperator);
    }
    static deserialize(str, thingClass) {
        logger$1.log("deserializin");
        if (!str) {
            throw new Error("wtf are you doin bro");
        }
        let seperator = str.slice(0, 1);
        str = str.substr(1);
        logger$1.log("deserialize", seperator, str);
        let arr = str.split(seperator);
        let idField = arr.shift();
        let limitStr = arr.shift();
        let limits = [];
        if (limitStr) {
            limits = limitStr.split("Œ");
        }
        let groups = [];
        let group = true;
        while (group != "false") {
            group = arr.shift() || false;
            if (typeof group == "string" && group != "false")
                groups.push(group);
        }
        let inst = new IndexingCollection(idField, groups, limits);
        inst.serializeSeperator = seperator;
        arr = arr.reverse();
        for (let i in arr) {
            let itemObj = arr[i];
            let item = thingClass.deserialize(itemObj);
            inst.add(item);
        }
        return inst;
    }
}

let logger = new logger$2("objectManager");
class objectManager {
    constructor() {
        this.objects = new IndexingCollection("id", ["type"], [10000, Infinity]);
    }
    updateobjects(objects) {
        for (let object of objects) {
            if (!this.objects.has(object)) {
                this.objects.add(object);
            }
        }
    }
    runobjects() {
        logger.log("running Objects", this.objects.getAll().length);
        for (let object of this.objects.getAll()) {
            this.runobject(object);
        }
    }
    runobject(object) {
        if (typeof object.run == "function") {
            object.run();
        }
        else {
            logger.log("object has no run func", object);
        }
    }
}

class planComponent {
    constructor(id, parent = false) {
        this.id = id;
        this.parent = parent;
    }
    getParent() {
        return this.parent;
    }
    getRoot() {
        let root = this;
        while (root.parent) {
            root = root.parent;
        }
        return root;
    }
    serialize() {
        throw new TypeError("Serialize not implemented");
    }
    deserialize(strValue) {
        throw new TypeError("Serialize not implemented");
    }
}
planComponent.type = "unimplemented";
let goals = new Map();
let jobs = new Map();
let actions = new Map();
class baseAction extends planComponent {
    constructor(id, parent) {
        super(id, parent);
        if (actions.has(id)) {
            throw new TypeError(`ActionId already exists! ${id}`);
        }
        actions.set(id, this);
    }
    runAction(actor) {
        throw new TypeError("runAction not implemented");
    }
}
baseAction.type = "baseAction";
class baseJob extends planComponent {
    constructor(id, parent) {
        super(id, parent);
        if (jobs.has(id)) {
            throw new TypeError(`JobId already exists! ${id}`);
        }
        jobs.set(id, this);
    }
    runJob() {
        throw new TypeError("runJob not implemented");
    }
}
baseJob.type = "baseJob";
class baseGoal extends planComponent {
    constructor(id, parent = false) {
        super(id, parent);
        if (goals.has(id)) {
            throw new TypeError(`goalId already exists! ${id}`);
        }
        goals.set(id, this);
    }
}
baseGoal.type = "baseGoal";

function getDirectionPos(from, to) {
    return getDirection(to.x - from.x, to.y - from.y);
}
function drawPath(path, color = "#00FF00") {
    let style = { color: color };
    var charMap = {};
    charMap[TOP] = "⬆";
    charMap[TOP_LEFT] = "↖";
    charMap[TOP_RIGHT] = "↗";
    charMap[LEFT] = "⬅";
    charMap[RIGHT] = "➡";
    charMap[BOTTOM] = "⬇";
    charMap[BOTTOM_LEFT] = "↙";
    charMap[BOTTOM_RIGHT] = "↘";
    let lastPosition = path[0];
    let settings = getSettings();
    for (let position of path) {
        if (lastPosition == position) {
            settings.drawText("*", lastPosition, style);
        }
        else {
            let direction = getDirectionPos(lastPosition, position);
            settings.drawText(charMap[direction], lastPosition, style);
        }
        lastPosition = position;
    }
}
let cm;
let cmTime = 0;
function addToCMInRange(cm, x_in, y_in, range, cost) {
    var xStart = x_in - range;
    var yStart = y_in - range;
    var xEnd = x_in + range;
    var yEnd = y_in + range;
    for (var x = xStart; x < xEnd; x++) {
        if (x >= 100 || x <= 0)
            continue;
        for (var y = yStart; y < yEnd; y++) {
            if (y >= 100 || y <= 0)
                continue;
            let currentValue = cm.get(x, y);
            if (currentValue < 255) {
                let newValue = Math.min(cost + currentValue, 254);
                cm.set(x, y, newValue);
            }
        }
    }
}
function getWeightPenalty(x, y) {
    let tile = getTerrainAt({ x: x, y: y });
    if (tile === TERRAIN_WALL) {
        return 20;
    }
    else if (tile === TERRAIN_SWAMP) {
        return 5;
    }
    return 0;
}
function getSquareCost(x, y) {
    let penalty = 0;
    penalty += getWeightPenalty(x + 1, y);
    penalty += getWeightPenalty(x, y + 1);
    penalty += getWeightPenalty(x + 1, y + 1);
    penalty += getWeightPenalty(x - 1, y);
    penalty += getWeightPenalty(x, y - 1);
    penalty += getWeightPenalty(x - 1, y - 1);
    penalty += getWeightPenalty(x + 1, y - 1);
    penalty += getWeightPenalty(x - 1, y + 1);
    return penalty;
}
function resetCM() {
    cm = new CostMatrix();
    for (let y = 0; y < 100; y++) {
        for (let x = 0; x < 100; x++) {
            let tile = getTerrainAt({ x: x, y: y });
            let swamps = 5;
            let walls = 10;
            let towerHere = getObjectsByPrototype(StructureTower).filter((t) => t.x == x && t.y == y).length > 0;
            if (tile === TERRAIN_WALL || towerHere) {
                cm.set(x, y, 255);
                addToCMInRange(cm, x, y, 2, walls);
            }
            else if (tile === TERRAIN_SWAMP) {
                addToCMInRange(cm, x, y, 3, swamps);
            }
            else ;
        }
    }
    console.log("CM has been reset");
}
function getCM() {
    let settings = getSettings();
    if (settings.getTick() > (cmTime)) {
        console.log("resetting CM!", cmTime);
        resetCM();
        cmTime = settings.getTick() + 2000;
    }
    return cm;
}
class Squad {
    constructor(id, requiredParts, targets = [], creeps = []) {
        this.targetDistance = 0;
        this.targetRush = false;
        this.maxFormationSize_attackers_min = 2;
        this.maxFormationSize_attackers_max = 3;
        this.maxFormationSize_ranged_min = 1;
        this.maxFormationSize_ranged_max = 3;
        this.maxFormationSize_healers_min = 0;
        this.maxFormationSize_healers_max = 2;
        this.retreatingToHeal = false;
        this.retreating = false;
        this.lastTarget = false;
        this.initialWait = true;
        this.leadSquad = false;
        this.id = id;
        this.requirements = requiredParts;
        this.validTargets = targets;
        this.targetLocation = { x: -1, y: -1 };
        this.currentLocation = { x: -1, y: -1 };
        this.path = false;
        this.currentPathIndex = 0;
        this.creeps = [];
        this.healers = [];
        this.attackers = [];
        this.ranged = [];
        if (creeps) {
            for (let creep of creeps) {
                this.addCreep(creep);
            }
        }
    }
    moveCurrentPositionToAMember() {
        if (this.attackers.length > 0) {
            this.currentLocation.x = this.attackers[0].x;
            this.currentLocation.y = this.attackers[0].y;
        }
        if (this.ranged.length > 0) {
            this.currentLocation.x = this.ranged[0].x;
            this.currentLocation.y = this.ranged[0].y;
        }
        if (this.healers.length > 0) {
            this.currentLocation.x = this.healers[0].x;
            this.currentLocation.y = this.healers[0].y;
        }
    }
    reparseCreeps() {
        let creeps = this.creeps;
        this.creeps = [];
        this.healers = [];
        this.attackers = [];
        this.ranged = [];
        if (creeps) {
            for (let creep of creeps) {
                this.addCreep(creep);
            }
        }
    }
    addCreep(creep) {
        if (!creep.exists) {
            return;
        }
        creep.squadId = this.id;
        this.creeps.push(creep);
        if (creep.isHealer()) {
            this.healers.push(creep);
        }
        if (creep.isAttacker()) {
            this.attackers.push(creep);
        }
        if (creep.isRangedAttacker()) {
            this.ranged.push(creep);
        }
    }
    get inCombat() {
        let enemyCreeps = getObjectsByPrototype(Creep).filter((c) => !c.my);
        let squadWidth = Math.max(this.maxFormationSize_attackers_max, this.maxFormationSize_healers_max, this.maxFormationSize_ranged_max);
        let secondaryTargets = findInRange(this.currentLocation, enemyCreeps, squadWidth);
        let inCombat = secondaryTargets.length > 1;
        if (inCombat && !(this.lastTarget instanceof Creep)) {
            this.moveToClosestTarget();
        }
        return inCombat;
    }
    get squadInPosition() {
        if (this.initialWait) {
            return this.creepsInPosition;
        }
        let dist = getRange(this.currentLocation, this.targetLocation);
        if (dist > this.targetDistance)
            return false;
        return true;
    }
    creepDistFromPosition(creep, includeDest = false) {
        let creepDist = getRange(this.currentLocation, creep);
        if (includeDest) {
            let creepDistFromTarget = getRange(this.targetLocation, creep);
            return Math.min(creepDist, creepDistFromTarget);
        }
        else {
            return creepDist;
        }
    }
    creepInPosition(creep, includeDest = false) {
        let creepDist = this.creepDistFromPosition(creep, includeDest);
        let squareCost = getSquareCost(this.currentLocation.x, this.currentLocation.y);
        let extraBuffer = 0;
        if (squareCost > 20) {
            extraBuffer = 2;
        }
        if (creep.isAttacker() && (creepDist > (this.maxFormationSize_attackers_max + extraBuffer))) {
            console.log(creep.id, "is out of position!(attacker)", creepDist, this.maxFormationSize_attackers_max, squareCost, extraBuffer);
            return false;
        }
        else if (creep.isRangedAttacker() && (creepDist > (this.maxFormationSize_ranged_max + extraBuffer))) {
            console.log(creep.id, "is out of position!(ranged)", creepDist, this.maxFormationSize_ranged_max, squareCost, extraBuffer);
            return false;
        }
        else if (creep.isHealer() && (creepDist > (this.maxFormationSize_healers_max + extraBuffer))) {
            console.log(creep.id, "is out of position!(healer)", creepDist, this.maxFormationSize_healers_max, squareCost, extraBuffer);
            return false;
        }
        return true;
    }
    get creepsInPosition() {
        if (this.inCombat) {
            return true;
        }
        let creepOnLoc = getObjectsByPrototype(Creep).filter(c => c.my && c.x == this.currentLocation.x && c.y == this.currentLocation.y).length > 0;
        let onLocation = creepOnLoc;
        for (let creep of this.creeps) {
            let creepInPosition = this.creepInPosition(creep);
            if (!creepInPosition) {
                return false;
            }
        }
        return onLocation;
    }
    getClosestTargetToOurFlag() {
        this.clearInvalidTargets();
        if (this.validTargets.length == 0) {
            console.log(this.id, "no targets, so none are close");
            return false;
        }
        let ourFlag = getObjectsByPrototype(Flag).filter((f) => f.my)[0];
        let closestEnemyCreep = findClosestByRange(this.currentLocation, getObjectsByPrototype(Creep).filter(c => !c.my));
        let enemyCreepDist = 100;
        if (closestEnemyCreep)
            enemyCreepDist = getRange(this.currentLocation, closestEnemyCreep);
        let closestTarget = findClosestByPath(ourFlag, this.validTargets.filter(t => {
            if (!(t instanceof Creep) && (enemyCreepDist < 20 || this.lastTarget instanceof Creep)) {
                return false;
            }
            return true;
        }));
        if (closestTarget) {
            return closestTarget;
        }
        return false;
    }
    getClosestTarget() {
        this.clearInvalidTargets();
        if (this.validTargets.length == 0) {
            console.log(this.id, "no targets, so none are close");
            return false;
        }
        let closestTarget = findClosestByRange(this.currentLocation, this.validTargets);
        console.log(this.id, "getting closest target", closestTarget.id);
        if (closestTarget) {
            return closestTarget;
        }
        return false;
    }
    moveToClosestTarget() {
        let settings = getSettings();
        if (this.retreatingToHeal)
            return;
        this.retreating = false;
        this.retreatingToHeal = false;
        console.log(this.id, "ct:", this.currentLocation, this.validTargets.length);
        let closestTarget = this.getClosestTargetToOurFlag();
        if (!closestTarget) {
            closestTarget = this.getClosestTarget();
        }
        console.log(this.id, 'moving to closest target', closestTarget ? closestTarget.constructor.name : false);
        if (closestTarget) {
            if (this.lastTarget instanceof Flag && this.currentLocation.x == this.lastTarget.x && this.currentLocation.y == this.lastTarget.y) {
                this.moveCurrentPositionToAMember();
            }
            this.lastTarget = closestTarget;
            let targetIsBodyPart = closestTarget instanceof BodyPart;
            getObjectsByPrototype(Creep).filter(c => !c.my && getRange(c, closestTarget) < 10);
            let targetIsValidFlag = closestTarget instanceof Flag && (!closestTarget.my || (settings.getTick() < 10));
            if (targetIsBodyPart) {
                this.moveCurrentPositionToAMember();
            }
            this.assignLocation(closestTarget.x, closestTarget.y, (targetIsBodyPart || targetIsValidFlag) ? 0 : 1);
        }
    }
    assignLocation(x, y, targetDistance = 0, regroup = false, rushTarget = false) {
        if (this.lastTarget && (this.lastTarget.x != x || this.lastTarget.y != y)) {
            this.lastTarget = false;
        }
        this.path = false;
        this.currentPathIndex = 0;
        this.targetLocation.x = x;
        this.targetLocation.y = y;
        this.targetDistance = targetDistance;
        this.targetRush = rushTarget;
        console.log(this.id, "got loc assigned", x, y, targetDistance);
        if ((this.currentLocation.x == -1 && this.currentLocation.y == -1) || regroup) {
            this.currentLocation.x = x;
            this.currentLocation.y = y;
        }
    }
    assignTarget(target, doNow = false) {
        if (this.validTargets.includes(target)) {
            this.validTargets = this.validTargets.filter((t) => t.id != target.id);
        }
        if (this.validTargets.length < 100 && !this.validTargets.includes(target)) {
            this.validTargets.push(target);
        }
        if (doNow) {
            this.lastTarget = target;
            this.assignLocation(target.x, target.y, 0);
        }
        return false;
    }
    assignCreep(creep) {
        let curentHealParts = this.creeps.reduce((acc, creep) => acc + creep.body.filter((part) => part.type == HEAL).length, 0);
        let curentAttackParts = this.creeps.reduce((acc, creep) => acc + creep.body.filter((part) => part.type == ATTACK).length, 0);
        let curentRangedParts = this.creeps.reduce((acc, creep) => acc + creep.body.filter((part) => part.type == RANGED_ATTACK).length, 0);
        let numHealParts = creep.body.filter((part) => part.type == HEAL).length;
        let numAttackParts = creep.body.filter((part) => part.type == ATTACK).length;
        let numRangedParts = creep.body.filter((part) => part.type == RANGED_ATTACK).length;
        if (curentHealParts < this.requirements.heal && numHealParts > 0) {
            this.addCreep(creep);
            return true;
        }
        if (curentAttackParts < this.requirements.attack && numAttackParts > 0) {
            this.addCreep(creep);
            return true;
        }
        if (curentRangedParts < this.requirements.ranged && numRangedParts > 0) {
            this.addCreep(creep);
            return true;
        }
        return false;
    }
    clearDeadCreeps() {
        let haveDeadCreeps = false;
        for (let creep of this.creeps) {
            if (!creep.exists) {
                haveDeadCreeps = true;
                break;
            }
        }
        if (haveDeadCreeps) {
            this.reparseCreeps();
        }
    }
    clearInvalidTargets() {
        let invalidTargets = [];
        for (let target of this.validTargets) {
            if (!target.exists) {
                invalidTargets.push(target);
            }
        }
        if (invalidTargets.length) {
            this.path = false;
            this.currentPathIndex = 0;
            this.validTargets = this.validTargets.filter((t) => !invalidTargets.includes(t));
            this.reparseCreeps();
            console.log("moving to closest target, was an invalid target");
            this.moveToClosestTarget();
        }
    }
    runSquad(minDistToEnemyFlag = 0, maxDistFromOurFlag = 200, noCombatMovement = false, otherSquads = []) {
        if (this.lastTarget instanceof BodyPart && !this.lastTarget.exists) {
            this.moveToClosestTarget();
        }
        console.log(this.id, "running squad", minDistToEnemyFlag, maxDistFromOurFlag, noCombatMovement, this.retreating);
        console.log(this.id, "path info", this.path && this.path.length, this.currentPathIndex);
        if (this.creeps.length == 0)
            return;
        if (this.retreating) ;
        if (this.attackers.length == 0) {
            this.maxFormationSize_attackers_max = 0;
            this.maxFormationSize_attackers_min = 0;
            this.maxFormationSize_ranged_max = 1;
            this.maxFormationSize_ranged_min = 0;
            this.maxFormationSize_healers_max = 1;
            this.maxFormationSize_healers_min = 0;
        }
        let settings = getSettings();
        settings.drawText("c", this.currentLocation);
        settings.drawText("g", this.targetLocation);
        this.clearDeadCreeps();
        let enemyCreeps = getObjectsByPrototype(Creep).filter(c => !c.my);
        let enemyAttackers = enemyCreeps.filter(c => c.isAttacker() || c.isRangedAttacker());
        let enemyAttackersActive = enemyAttackers.filter(c => c.isAttacker(true) || c.isRangedAttacker(true));
        let myCreeps = getObjectsByPrototype(Creep).filter(c => c.my);
        let secondaryTargets = findInRange(this.currentLocation, enemyCreeps, 7);
        let injuredMembers = findInRange(this.currentLocation, myCreeps.filter(c => c.hits < c.hitsMax), 10).sort((a, b) => (a.hits / a.hitsMax) - (b.hits / b.hitsMax));
        enemyCreeps.sort((a, b) => (a.hits / a.hitsMax) - (b.hits / b.hitsMax));
        let primaryTarget = this.getClosestTarget();
        if (primaryTarget instanceof Flag) {
            primaryTarget = false;
        }
        let ourFlag = getObjectsByPrototype(Flag).filter((f) => f.my)[0];
        let enemyFlag = getObjectsByPrototype(Flag).filter((f) => !f.my)[0];
        let closestEnemy = false;
        let closestAttacker = false;
        if (enemyCreeps.length > 0)
            closestEnemy = findClosestByRange(ourFlag, enemyCreeps);
        if (enemyAttackers.length > 0) {
            closestAttacker = findClosestByRange(ourFlag, enemyAttackers);
        }
        let ourClosestCreep = findClosestByRange(ourFlag, this.creeps);
        let enemyDistToOurFlag = 100;
        let distToClosetEnemyToOurFlag = 0;
        let minDistToClosetEnemyToOurFlag = 0;
        if (closestEnemy) {
            enemyDistToOurFlag = getRange(ourFlag, closestEnemy);
            distToClosetEnemyToOurFlag = getRange(this.currentLocation, closestEnemy);
            if (closestAttacker) {
                let ourClosestCreepToTheirLeader = findClosestByRange(closestAttacker, this.creeps);
                if (ourClosestCreepToTheirLeader) {
                    minDistToClosetEnemyToOurFlag = getRange(closestAttacker, ourClosestCreepToTheirLeader);
                }
            }
        }
        let ourDistToFlag = getRange(ourFlag, ourClosestCreep);
        let distToFarthestSquad = 0;
        let farthestSquad = false;
        let leadSquad = false;
        for (let squad of otherSquads) {
            if (squad.leadSquad) {
                leadSquad = squad;
            }
            let distToThisSquad = getRange(this.currentLocation, squad.currentLocation);
            if (distToThisSquad > distToFarthestSquad) {
                distToFarthestSquad = distToThisSquad;
                farthestSquad = squad;
            }
        }
        if (!this.leadSquad && farthestSquad && distToFarthestSquad > distToClosetEnemyToOurFlag - 5) {
            if (leadSquad) {
                this.assignLocation(leadSquad.currentLocation.x, leadSquad.currentLocation.y);
            }
            else {
                this.assignLocation(farthestSquad.currentLocation.x, farthestSquad.currentLocation.y);
            }
        }
        let wounded = this.creeps.filter(c => c.hits < c.hitsMax * 0.50);
        function getHealTarget(creep, targets = injuredMembers, range = 3) {
            let inRange = findInRange(creep, targets, range);
            if (inRange.length > 0) {
                return inRange[0];
            }
            return false;
        }
        for (let healer of this.healers) {
            let healTarget = false;
            if (healer.hits < healer.hitsMax * .9)
                healTarget = healer;
            if (injuredMembers.length > 0) {
                if (!healTarget)
                    healTarget = getHealTarget(healer, wounded, 1);
                if (!healTarget)
                    healTarget = getHealTarget(healer, injuredMembers.filter(c => c.isAttacker()), 1);
                if (!healTarget)
                    healTarget = getHealTarget(healer, injuredMembers.filter(c => c.isHealer()), 1);
                if (!healTarget)
                    healTarget = getHealTarget(healer, injuredMembers.filter(c => c.isRangedAttacker()), 1);
                if (!healTarget)
                    healTarget = getHealTarget(healer, injuredMembers.filter(c => c.isAttacker()), 2);
                if (!healTarget)
                    healTarget = getHealTarget(healer, injuredMembers.filter(c => c.isAttacker()), 3);
                if (!healTarget)
                    healTarget = getHealTarget(healer, injuredMembers.filter(c => c.isRangedAttacker()), 2);
                if (!healTarget)
                    healTarget = findClosestByRange(healer, injuredMembers);
            }
            if (!healTarget) {
                healTarget = findClosestByRange(healer, [...this.attackers, ...this.ranged]);
            }
            if (!healTarget) {
                healTarget = findClosestByRange(healer, [...this.healers.filter(h => h.id != healer.id)]);
            }
            if (!healTarget || healTarget.id == healer.id) {
                healer.heal(healer);
                healTarget = false;
            }
            if (healTarget) {
                let dist = getRange(healer, healTarget);
                if (dist > 1) {
                    if (dist <= 3)
                        healer.rangedHeal(healTarget);
                }
                else {
                    healer.heal(healTarget);
                }
                if (!noCombatMovement && !(primaryTarget instanceof BodyPart) && (!healer.isAttacker() && !healer.isRangedAttacker())) {
                    if (findInRange(healer, enemyAttackersActive, 2).length > 0) {
                        let goals = [];
                        [...enemyAttackersActive].forEach((loc) => {
                            goals.push({
                                pos: loc,
                                range: 4
                            });
                        });
                        let fleePath = searchPath(healer, goals, { flee: true });
                        drawPath(fleePath.path);
                        console.log(this.id, "fleeing", fleePath);
                        if (fleePath.path.length > 0) {
                            let fleePos = fleePath.path[0];
                            let fleeDir = getDirection(fleePos.x - healer.x, fleePos.y - healer.y);
                            console.log(this.id, "fleeing", fleeDir);
                            healer.smartMove(fleeDir);
                        }
                    }
                    else if (healer.hits < healer.hitsMax * 0.7) {
                        let closestHealer = findClosestByRange(healer, this.healers.filter(h => h.hits == h.hitsMax && !h.isAttacker() && !h.isRangedAttacker() && h.id != healer.id));
                        if (!closestHealer)
                            closestHealer = findClosestByRange(healer, this.healers.filter(h => !h.isAttacker() && !h.isRangedAttacker() && h.id != healer.id));
                        if (closestHealer) {
                            console.log(healer.id, "running for nearest healer", closestHealer.id);
                            healer.moveTo(closestHealer);
                        }
                    }
                    else if ((primaryTarget instanceof BodyPart) && [HEAL, MOVE].includes(target.type)) {
                        healer.moveTo(primaryTarget);
                    }
                    else if (!this.retreating && !this.targetRush && this.creepInPosition(healer) && (!healer.isAttacker() && !healer.isRangedAttacker())) {
                        let distFromLoc = getRange(healer, this.currentLocation);
                        let targetDistFromLoc = getRange(healTarget, this.currentLocation);
                        if (distFromLoc <= this.maxFormationSize_healers_max || targetDistFromLoc <= this.maxFormationSize_healers_max)
                            healer.moveTo(healTarget);
                        else
                            console.log(healer.id, "isn't moving because of range issues", distFromLoc, targetDistFromLoc);
                    }
                    else {
                        console.log(healer.id, "isn't moving, is he doing anything?", primaryTarget.id, secondaryTargets.length);
                    }
                }
            }
        }
        for (let ranged of this.ranged) {
            let target = false;
            if (primaryTarget && getRange(ranged, primaryTarget) <= 3) {
                target = primaryTarget;
            }
            if (!target) {
                target = findClosestByRange(ranged, secondaryTargets);
            }
            let secondaryTargetsInRange1 = findInRange(ranged, secondaryTargets, 1);
            let secondaryTargetsInRange2 = findInRange(ranged, secondaryTargets, 2);
            let secondaryTargetsInRange3 = findInRange(ranged, secondaryTargets, 3);
            if (target && (secondaryTargetsInRange1.length < 1 && secondaryTargetsInRange2.length < 3 && secondaryTargetsInRange3.length < 10)) {
                let ret = ranged.rangedAttack(target);
                console.log(ranged.id, "tried to ranged attack", ret);
            }
            else {
                ranged.rangedMassAttack();
            }
            if (this.creepInPosition(ranged) && target && !noCombatMovement && (!ranged.isAttacker() && !ranged.isHealer())) {
                let targetRange = getRange(ranged, target);
                if (ranged.hits < ranged.hitsMax * 0.85) {
                    let closestHealer = findClosestByRange(ranged, this.healers.filter(h => h.hits == h.hitsMax && !h.isAttacker() && !h.isRangedAttacker()));
                    if (!closestHealer)
                        closestHealer = findClosestByRange(ranged, this.healers.filter(h => !h.isAttacker() && !h.isRangedAttacker()));
                    if (closestHealer) {
                        console.log(ranged.id, "running for nearest healer", closestHealer.id);
                        ranged.moveTo(closestHealer);
                    }
                }
                else if ((target instanceof BodyPart) && [HEAL, RANGED_ATTACK, MOVE].includes(target.type)) {
                    ranged.moveTo(target);
                }
                else if (targetRange <= 1) {
                    ranged.moveTo(target, { flee: true, range: 4 });
                }
                else if (targetRange > 2) {
                    let distFromLoc = getRange(ranged, this.currentLocation);
                    let targetDistFromLoc = getRange(target, this.currentLocation);
                    if (distFromLoc < this.maxFormationSize_ranged_max || targetDistFromLoc <= this.maxFormationSize_ranged_max)
                        ranged.moveTo(target);
                }
                else {
                    console.log(ranged.id, "isn't moving, is he doing anything?", primaryTarget.id, secondaryTargets.length);
                }
            }
        }
        for (let attacker of this.attackers) {
            let target = false;
            if (primaryTarget && getRange(attacker, primaryTarget) <= 1) {
                target = primaryTarget;
            }
            if (!target) {
                target = findClosestByRange(attacker, secondaryTargets);
            }
            if (target) {
                let ret = attacker.attack(target);
                console.log(attacker.id, "tried to attack", target.id, "ret:", ret);
            }
            if (this.creepInPosition(attacker) && target && !noCombatMovement) {
                let targetRange = getRange(attacker, target);
                if (attacker.hits < attacker.hitsMax * 0.75) {
                    let closestHealer = findClosestByRange(attacker, this.healers.filter(h => h.hits == h.hitsMax && !h.isAttacker() && !h.isRangedAttacker()));
                    if (!closestHealer)
                        closestHealer = findClosestByRange(attacker, this.healers.filter(h => !h.isAttacker() && !h.isRangedAttacker()));
                    if (closestHealer) {
                        console.log(attacker.id, "running for nearest healer", closestHealer.id);
                        attacker.moveTo(closestHealer);
                    }
                }
                else if ((target instanceof BodyPart) && [ATTACK, MOVE].includes(target.type)) {
                    attacker.moveTo(target);
                }
                else if (targetRange >= 1) {
                    let distFromLoc = getRange(attacker, this.currentLocation);
                    let targetDistFromLoc = getRange(target, this.currentLocation);
                    if (distFromLoc < this.maxFormationSize_attackers_max || targetDistFromLoc <= this.maxFormationSize_attackers_max)
                        attacker.moveTo(target);
                }
                else {
                    console.log(attacker.id, "isn't moving, is he doing anything?", primaryTarget.id, secondaryTargets.length);
                }
            }
        }
        if (this.targetLocation.x != ourFlag.x && this.targetLocation.y != ourFlag.y && !this.retreating) {
            let retreatToHeal = false;
            if (wounded.length > 0 && this.inCombat) {
                retreatToHeal = true;
                this.retreatingToHeal = true;
                this.retreating = true;
            }
            if (closestEnemy)
                getRange(closestEnemy, enemyFlag);
            let amtToAdd = Math.min(minDistToClosetEnemyToOurFlag, 10);
            let distToOurFlag = ourDistToFlag;
            console.log(this.id, "checking for too far from our flag", distToOurFlag, maxDistFromOurFlag, wounded.length, retreatToHeal, amtToAdd);
            if (!this.targetRush && (distToOurFlag > maxDistFromOurFlag || retreatToHeal)) {
                console.log(this.id, "too far from our flag", distToOurFlag, maxDistFromOurFlag);
                this.retreatToOurFlag(ourFlag, retreatToHeal, distToOurFlag);
                return;
            }
            let distToEnemyFlag = getRange(this.currentLocation, enemyFlag);
            console.log(this.id, "checking for too close to enemy flag", distToEnemyFlag, minDistToEnemyFlag);
            if (!this.targetRush && distToEnemyFlag < minDistToEnemyFlag) {
                console.log(this.id, "too close to enemy flag", distToEnemyFlag, minDistToEnemyFlag);
                for (let creep of this.creeps) {
                    let ret = creep.moveTo(ourFlag);
                    console.log(creep.id, "tried to get behind frontline", "got", ret);
                }
                return;
            }
        }
        else {
            if (this.retreatingToHeal && injuredMembers.length == 0) {
                this.retreatingToHeal = false;
                this.retreating = false;
                console.log("moving to closest target, no longer healing");
                this.moveToClosestTarget();
            }
            this.targetDistance = enemyDistToOurFlag;
            if (!this.retreatingToHeal && this.squadInPosition && enemyDistToOurFlag > (ourDistToFlag + 40)) {
                console.log("moving to closest target, we're way closer than the enemy");
                this.moveToClosestTarget();
                this.currentLocation.x = ourClosestCreep.x;
                this.currentLocation.y = ourClosestCreep.y;
                console.log(this.id, "returning to the fight!", this.currentLocation);
            }
        }
        if (this.inCombat && !this.retreating) {
            console.log(this.id, "holding for combat");
            return;
        }
        console.log(this.id, "moving creeps", this.retreating, this.retreatingToHeal, this.targetRush);
        if (this.retreating && !this.creepsInPosition) {
            console.log('retreating to ', typeof this.lastTarget, ', run for it!!', this.currentLocation);
            for (let creep of this.creeps) {
                creep.moveTo(this.currentLocation);
            }
        }
        else if (this.targetRush || (this.targetLocation.x == enemyFlag.x && this.targetLocation.y == enemyFlag.y && this.lastTarget instanceof Flag)) {
            console.log('target is ', typeof this.lastTarget, ', run for it!!', this.lastTarget);
            for (let creep of this.creeps) {
                creep.moveTo(this.targetLocation);
            }
        }
        else if (!this.creepsInPosition) {
            if (this.squadInPosition) {
                console.log(this.id, "in position, even tho creeps aren't moving to next target");
                this.moveToClosestTarget();
            }
            console.log(this.id, "creeps not in position", this.currentLocation, this.targetLocation, this.targetDistance, this.targetRush);
            for (let creep of this.creeps) {
                if (creep.isHealer() && !creep.isRangedAttacker() && !creep.isAttacker()) {
                    let dist = getRange(creep, this.currentLocation);
                    console.log(creep.id, "healer", dist, this.maxFormationSize_ranged_max, this.maxFormationSize_healers_max);
                    if (dist < this.maxFormationSize_healers_min) {
                        let goals = [];
                        [this.currentLocation, ...this.creeps, ...enemyCreeps].forEach((loc) => {
                            goals.push({
                                pos: loc,
                                range: this.maxFormationSize_healers_max
                            });
                        });
                        let fleePath = searchPath(creep, goals, { flee: true });
                        drawPath(fleePath.path);
                        console.log(creep.id, "got flee path", fleePath.path);
                        if (fleePath.path.length > 0) {
                            let fleePos = fleePath.path[0];
                            let fleeDir = getDirection(fleePos.x - creep.x, fleePos.y - creep.y);
                            console.log(creep.id, "fleeing to free pos", fleeDir);
                            creep.smartMove(fleeDir);
                        }
                    }
                    if (dist > this.maxFormationSize_healers_min)
                        creep.moveTo(this.currentLocation, { range: this.maxFormationSize_healers_min });
                }
                else if (creep.isRangedAttacker() && !creep.isAttacker()) {
                    let dist = getRange(creep, this.currentLocation);
                    console.log(creep.id, "ranged", dist, this.maxFormationSize_attackers_max, this.maxFormationSize_ranged_max);
                    if (dist < this.maxFormationSize_ranged_min) {
                        let goals = [];
                        [this.currentLocation, ...this.attackers].forEach((loc) => {
                            goals.push({
                                pos: loc,
                                range: this.maxFormationSize_healers_max
                            });
                        });
                        let fleePath = searchPath(creep, goals, { flee: true });
                        drawPath(fleePath.path);
                        console.log(this.id, "got flee path", fleePath);
                        if (fleePath.path.length > 0) {
                            let fleePos = fleePath.path[0];
                            let fleeDir = getDirection(fleePos.x - creep.x, fleePos.y - creep.y);
                            console.log(this.id, "fleeing to free pos", fleeDir);
                            creep.smartMove(fleeDir);
                        }
                    }
                    if (dist > this.maxFormationSize_ranged_min)
                        creep.moveTo(this.currentLocation, { range: this.maxFormationSize_ranged_min });
                }
                else {
                    let dist = getRange(creep, this.currentLocation);
                    console.log(creep.id, "attack", dist, this.maxFormationSize_attackers_max, this.maxFormationSize_ranged_max);
                    creep.moveTo(this.currentLocation, { range: this.maxFormationSize_attackers_min });
                }
            }
            this.path = false;
            this.currentPathIndex = 0;
        }
        else {
            console.log(this.id, "creeps in position!", this.squadInPosition);
            if (this.squadInPosition && !this.retreating) {
                console.log(this.id, "squad in position!!");
                if (this.initialWait && settings.getTick() < 100) {
                    let enemyCreepsNotByTheirFlag = getObjectsByPrototype(Creep).filter(c => {
                        return !c.my && getRange(c, enemyFlag) > 20;
                    });
                    let enemyClosestToOurFlag = findClosestByRange(ourFlag, enemyCreeps);
                    let enemyDistToFlag = 100;
                    if (enemyClosestToOurFlag) {
                        enemyDistToFlag = getRange(ourFlag, enemyClosestToOurFlag);
                    }
                    console.log(this.id, "waiting to start");
                    let ticksToWait = 100;
                    if (settings.getTick() >= 10 && enemyCreepsNotByTheirFlag.length < 2) {
                        console.log(this.id, "They're idle, we're advancing");
                        ticksToWait = 0;
                    }
                    else if (settings.getTick() <= 60 && enemyCreepsNotByTheirFlag.length >= 10) {
                        console.log(this.id, "They're advancing, protect the flag!");
                        ticksToWait = 0;
                        this.retreatToOurFlag(ourFlag, false, ourDistToFlag);
                        this.initialWait = false;
                        return;
                    }
                    else if (settings.getTick() >= 60 && enemyDistToFlag > 60 && enemyCreepsNotByTheirFlag.length != 0) {
                        console.log(this.id, "kinda in the middle.. fight there");
                        ticksToWait = 0;
                        this.lastTarget = closestEnemy;
                    }
                    console.log(this.id, "waiting to start", ticksToWait, enemyDistToFlag, enemyCreepsNotByTheirFlag.length);
                    if (settings.getTick() < ticksToWait) {
                        return;
                    }
                    else {
                        this.initialWait = false;
                    }
                }
                if (!this.retreating) {
                    if (this.validTargets.length > 0) {
                        console.log(this.id, "has reached it's target, moving to next target!");
                        this.moveToClosestTarget();
                    }
                    else {
                        console.log(this.id, "out of targets!");
                        let enemyFlag = getObjectsByPrototype(Flag).filter((f) => !f.my)[0];
                        this.lastTarget = enemyFlag;
                        this.assignLocation(enemyFlag.x, enemyFlag.y, 0);
                    }
                }
            }
            else {
                if (this.lastTarget) {
                    console.log("last target exists", this.lastTarget.id);
                    let targetDistFromLastPath = getRange(this.targetLocation, this.lastTarget);
                    console.log("last target exists", this.lastTarget.id, targetDistFromLastPath);
                    if (targetDistFromLastPath > 1) {
                        this.path = false;
                        this.currentPathIndex = 0;
                        console.log("moving to closest target, current target has moved");
                        this.moveToClosestTarget();
                        this.targetLocation.x = this.lastTarget.x;
                        this.targetLocation.y = this.lastTarget.y;
                    }
                }
                if (!this.path) {
                    let ret = searchPath(this.currentLocation, this.targetLocation, { range: this.targetDistance, costMatrix: getCM() });
                    this.path = ret.path;
                    this.currentPathIndex = 0;
                    console.log(this.id, "got path", ret);
                    drawPath(this.path, "#0000ff");
                }
                let nextPos = this.path[this.currentPathIndex];
                if (!nextPos) {
                    console.log(this.id, "is broken! no next path");
                    this.currentPathIndex = 0;
                    this.path = false;
                    this.moveToClosestTarget();
                    return;
                }
                let direction = getDirection(nextPos.x - this.currentLocation.x, nextPos.y - this.currentLocation.y);
                console.log(this.id, "moving creeps", direction, this.creeps.length, this.retreating, this.retreatingToHeal);
                for (let creep of this.creeps) {
                    let thisDirection = direction;
                    creep.smartMove(thisDirection);
                }
                this.currentPathIndex++;
                if (direction == TOP_RIGHT || direction == RIGHT || direction == BOTTOM_RIGHT)
                    this.currentLocation.x++;
                if (direction == TOP_LEFT || direction == LEFT || direction == BOTTOM_LEFT)
                    this.currentLocation.x--;
                if (direction == TOP_RIGHT || direction == TOP || direction == TOP_LEFT)
                    this.currentLocation.y--;
                if (direction == BOTTOM_LEFT || direction == BOTTOM || direction == BOTTOM_RIGHT)
                    this.currentLocation.y++;
            }
        }
    }
    retreatToOurFlag(ourFlag_in, retreatToHeal, distToOurFlag) {
        console.log("---------------------Retreating!!!------------------", retreatToHeal);
        let ourFlag = getObjectsByPrototype(Flag).filter((f) => f.my)[0];
        let retreatPath;
        if (retreatToHeal) {
            let enemyAttackers = getObjectsByPrototype(Creep).filter(c => !c.my && (c.isAttacker(true) || c.isRangedAttacker(true)));
            let goals = [];
            [...enemyAttackers].forEach((loc) => {
                goals.push({
                    pos: loc,
                    range: 20
                });
            });
            retreatPath = searchPath(this.currentLocation, goals, { flee: true });
            retreatPath.path.reverse();
            console.log("retreat got path", retreatPath);
        }
        else {
            retreatPath = searchPath(this.currentLocation, ourFlag, { range: 1, costMatrix: getCM() });
        }
        drawPath(retreatPath.path, "#ff0000");
        if (!retreatPath.incomplete && retreatPath.path.length > 4) {
            let howFarToRetreat = Math.min(retreatPath.path.length - 1, 0);
            if (!retreatToHeal) {
                if (distToOurFlag < 15) {
                    howFarToRetreat = Math.max(0, retreatPath.path.length - 2);
                }
                else {
                    howFarToRetreat = Math.max(0, retreatPath.path.length - 2);
                }
            }
            let retreatPos = retreatPath.path[howFarToRetreat];
            if (!retreatPos) {
                console.log('invalid retreat pos for first go, using end pos');
                retreatPos = retreatPath.path[retreatPath.path.length - 1];
            }
            console.log(this.id, "retreating!", retreatPos, retreatPath.path.length, howFarToRetreat);
            if (retreatToHeal) {
                this.assignLocation(retreatPos.x, retreatPos.y, 1, false, false);
            }
            else {
                this.lastTarget = ourFlag;
                this.assignLocation(ourFlag.x, ourFlag.y, 3, true, false);
            }
            this.retreating = true;
        }
    }
}

class defendLocation extends baseGoal {
    constructor(id, parent = false, x, y) {
        super(id, parent);
        this.x = x;
        this.y = y;
        this.squad = new Squad("defense", { heal: 4, attack: 0, ranged: 4 });
        this.squad.assignLocation(this.x, this.y, 0, true);
    }
    static makeId(x, y) {
        return `${defendLocation.type}-${x}-${y}`;
    }
    assignCreep(creep) {
        if (this.squad.assignCreep(creep)) {
            creep.goalId = this.id;
            return true;
        }
        return false;
    }
    assignTarget(target) {
        console.log(this.id, "checking creep", target.id);
        if (target instanceof Creep || (target instanceof Flag && target.my)) {
            if (this.squad.assignTarget(target)) {
                target.goalId = this.id;
                return true;
            }
        }
        return false;
    }
    runGoal() {
        console.log("running goal", this.id);
        this.squad.runSquad(75, 0, true);
        this.squad.assignLocation(this.x, this.y, 0, true, true);
        text("d", this);
    }
}
defendLocation.type = "defend";

let attackPath;
class attackLocation extends baseGoal {
    constructor(id, parent, x, y) {
        super(id, parent);
        this.x = x;
        this.y = y;
        this.squadL = new Squad("left", { heal: 0, attack: 0, ranged: 0 });
        this.squadR = new Squad("right", { heal: 0, attack: 0, ranged: 0 });
        this.squadF = new Squad("forward", { heal: 20, attack: 8, ranged: 20 });
        this.squadF.leadSquad = true;
        let ourFlag = getObjectsByPrototype(Flag).filter((f) => f.my)[0];
        attackPath = searchPath(ourFlag, this, { costMatrix: getCM() });
        let startPos = attackPath.path[Math.floor(attackPath.path.length / 3)];
        this.squadF.assignLocation(startPos.x, startPos.y);
    }
    static makeId(x, y) {
        return `${attackLocation.type}-${x}-${y}`;
    }
    assignCreep(creep) {
        if (this.squadF.assignCreep(creep)) {
            creep.goalId = this.id;
            if (this.squadF.creeps.length == 1) ;
            return true;
        }
        if (this.squadL.assignCreep(creep)) {
            creep.goalId = this.id;
            if (this.squadL.creeps.length == 1) {
                this.squadL.assignLocation(creep.x, creep.y);
            }
            return true;
        }
        if (this.squadR.assignCreep(creep)) {
            creep.goalId = this.id;
            if (this.squadR.creeps.length == 1) {
                this.squadR.assignLocation(creep.x, creep.y);
            }
            return true;
        }
        return false;
    }
    assignTarget(target) {
        let settings = getSettings();
        console.log(this.id, "checking target", target instanceof Creep, target instanceof BodyPart || target instanceof StructureTower || target instanceof Flag, target.constructor.name);
        if (target instanceof Creep) {
            if (this.squadL.assignTarget(target)) {
                target.goalId = this.id;
                return true;
            }
            if (this.squadR.assignTarget(target)) {
                target.goalId = this.id;
                return true;
            }
            if (this.squadF.assignTarget(target)) {
                target.goalId = this.id;
                return true;
            }
            return false;
        }
        if (target instanceof BodyPart || target instanceof StructureTower || target instanceof Flag) {
            let myCreeps = getObjectsByPrototype(Creep).filter(c => c.my && (c.isRangedAttacker() || c.isAttacker()));
            let enemyCreeps = getObjectsByPrototype(Creep).filter(c => !c.my && (c.isRangedAttacker() || c.isAttacker()));
            let overPowered = myCreeps.length >= enemyCreeps.length * 2;
            myCreeps.length * 2 <= enemyCreeps.length;
            let closestCreep = findClosestByRange(target, myCreeps);
            let closestEnemy = findClosestByRange(target, myCreeps);
            let dist = 0;
            if (closestCreep)
                dist = getRange(target, closestCreep);
            let enemyDist = 100;
            if (closestEnemy)
                enemyDist = getRange(target, closestEnemy);
            let overPartCollectTime = settings.getTick() > 1700;
            if (dist > enemyDist * 0.8 && !overPowered && enemyDist < 20 && !overPartCollectTime) {
                return false;
            }
            let accepted = false;
            if (!(this.squadF.lastTarget instanceof BodyPart))
                accepted = this.squadF.assignTarget(target, dist < 20);
            if (!(this.squadL.lastTarget instanceof BodyPart))
                accepted = this.squadL.assignTarget(target, dist < 20) || accepted;
            if (!(this.squadR.lastTarget instanceof BodyPart))
                accepted = this.squadR.assignTarget(target, dist < 20) || accepted;
            if (accepted) {
                target.goalId = this.id;
                return true;
            }
        }
        return false;
    }
    runGoal() {
        console.log("running goal", this.id);
        let enemyFlag = getObjectsByPrototype(Flag).filter((f) => !f.my)[0];
        let ourFlag = getObjectsByPrototype(Flag).filter((f) => f.my)[0];
        let enemyAttackCreeps = getObjectsByPrototype(Creep).filter((c) => !c.my && (c.isRangedAttacker() || c.isAttacker()));
        let enemyAttackCreepsWorking = getObjectsByPrototype(Creep).filter((c) => !c.my && (c.isRangedAttacker(true) || c.isAttacker(true)));
        let enemyClosestToOurFlag = findClosestByPath(ourFlag, enemyAttackCreepsWorking);
        let enemyClosestToTheirFlag = findClosestByRange(enemyFlag, enemyAttackCreepsWorking);
        let enemyDistToFlag = 100;
        let enemyDistToTheirFlag = 100;
        if (enemyClosestToOurFlag) {
            enemyDistToFlag = getRange(ourFlag, enemyClosestToOurFlag);
        }
        if (enemyClosestToTheirFlag) {
            enemyDistToTheirFlag = getRange(enemyFlag, enemyClosestToTheirFlag);
        }
        let fSquadDistToEnemyFlag = getRange(this.squadF.currentLocation, enemyFlag);
        if (this.squadF.creeps.length == 0) {
            fSquadDistToEnemyFlag = 0;
        }
        let maxDistFromOurFlag;
        if (enemyDistToFlag <= 30) {
            maxDistFromOurFlag = enemyDistToFlag - 15;
        }
        else if (enemyDistToFlag <= 40) {
            maxDistFromOurFlag = enemyDistToFlag - 5;
        }
        else if (enemyDistToFlag <= 50) {
            maxDistFromOurFlag = enemyDistToFlag + 10;
        }
        else if (enemyDistToFlag <= 60) {
            maxDistFromOurFlag = enemyDistToFlag + 15;
        }
        else {
            maxDistFromOurFlag = enemyDistToFlag + 20;
        }
        maxDistFromOurFlag = Math.max(maxDistFromOurFlag, 5);
        let minDistToEnemyFlag = fSquadDistToEnemyFlag + fSquadDistToEnemyFlag == 0 ? 0 : 5;
        let minSideDistToEnemyFlag = Math.min(getRange(this.squadL.currentLocation, enemyFlag), getRange(this.squadR.currentLocation, enemyFlag));
        let minFDistToEnemyFlag = minSideDistToEnemyFlag - (minSideDistToEnemyFlag == 0 ? 0 : 5);
        let wereClosestToTheirFlag = ((enemyDistToTheirFlag) > fSquadDistToEnemyFlag && fSquadDistToEnemyFlag < 40);
        if (enemyAttackCreeps.length < 1 || wereClosestToTheirFlag) {
            minFDistToEnemyFlag = 0;
            minDistToEnemyFlag = 0;
            this.squadF.assignLocation(enemyFlag.x, enemyFlag.y, 0, true, true);
            console.log("running for enemy flag!!!!!!!!!!!!!!!", enemyDistToTheirFlag, fSquadDistToEnemyFlag);
        }
        console.log("max dist info", fSquadDistToEnemyFlag, enemyDistToFlag, enemyClosestToOurFlag);
        console.log('running squads', maxDistFromOurFlag, minDistToEnemyFlag, minSideDistToEnemyFlag, minFDistToEnemyFlag);
        this.squadF.runSquad(0, maxDistFromOurFlag);
        this.squadL.runSquad(minDistToEnemyFlag, maxDistFromOurFlag, false, [this.squadF, this.squadR]);
        this.squadR.runSquad(minDistToEnemyFlag, maxDistFromOurFlag, false, [this.squadF, this.squadL]);
        text("a", this);
    }
}
attackLocation.type = "attackLocation";

let settings = getSettings();
class winCTF extends baseGoal {
    constructor() {
        let id = "winCTF";
        super(id, false);
        this.defenseGoals = [];
        this.attackGoals = [];
    }
    runGoal() {
        this.runChildGoals();
    }
    ;
    runChildGoals() {
        for (let goal of this.defenseGoals) {
            goal.runGoal();
        }
        for (let goal of this.attackGoals) {
            goal.runGoal();
        }
    }
    assignCreep(creep) {
        for (let dGoal of this.defenseGoals) {
            if (dGoal.assignCreep(creep))
                return true;
        }
        for (let aGoal of this.attackGoals) {
            if (aGoal.assignCreep(creep))
                return true;
        }
        return false;
    }
    assignTarget(target) {
        let distToOurFlag = settings.getRange(this.defenseGoals[0], target);
        if (distToOurFlag < 10) {
            for (let dGoal of this.defenseGoals) {
                if (dGoal.assignTarget(target))
                    return true;
            }
        }
        else {
            for (let aGoal of this.attackGoals) {
                if (aGoal.assignTarget(target))
                    return true;
            }
        }
        return false;
    }
    ;
    setupChildGoals() {
        let flags = getObjectsByPrototype(Flag);
        console.log("checking flags", flags.length);
        for (let flag of flags) {
            console.log("setting up child goals", this.id);
            if (flag.my) {
                let goalId = `defend-${flag.x}-${flag.y}`;
                if (!goals.has(goalId)) {
                    console.log("making defend goal", flag);
                    let defendGoal = new defendLocation(goalId, this, flag.x, flag.y);
                    this.defenseGoals.push(defendGoal);
                }
            }
            else {
                let goalId = `attack-${flag.x}-${flag.y}`;
                if (!goals.has(goalId)) {
                    console.log("Making attack goal", flag);
                    let attackGoal = new attackLocation(goalId, this, flag.x, flag.y);
                    this.attackGoals.push(attackGoal);
                    attackGoal.assignTarget(flag);
                }
            }
        }
    }
}
winCTF.type = "winCTF";

new objectManager();
console.log("Starting!");
let init = false;
let myTower;
let handledBodyPartIds = [];
let winGoal;
function loop() {
    let enemyCreeps = getObjectsByPrototype(Creep).filter(c => !c.my);
    getObjectsByPrototype(Flag).filter((f) => f.my)[0];
    if (!init) {
        console.log("----------------running init code----------------------");
        overrideSettings(runtimeSettings);
        winGoal = new winCTF();
        winGoal.setupChildGoals();
        let towers = getObjectsByPrototype(StructureTower);
        for (let tower of towers) {
            if (tower.my) {
                myTower = tower;
            }
            else {
                winGoal.assignTarget(tower);
            }
        }
        let flags = getObjectsByPrototype(Flag);
        for (let flag of flags) {
            winGoal.assignTarget(flag);
        }
        init = true;
    }
    console.log("------ start tick ----------");
    let creeps = getObjectsByPrototype(Creep);
    for (let creep of creeps) {
        if (creep.my) {
            if (!creep.goalId) {
                console.log("orphaned creep, searching for goal", creep.id);
                if (winGoal.assignCreep(creep)) {
                    console.log(creep.id, "assigned!", creep.goalId, creep.squadId);
                }
                else {
                    console.log(creep.id, "cound't find a goal!");
                }
            }
        }
        else {
            if (!creep.goalId && (creep.isAttacker() || creep.isRangedAttacker())) {
                winGoal.assignTarget(creep);
            }
        }
    }
    let bodyParts = getObjectsByPrototype(BodyPart);
    for (let part of bodyParts) {
        if (!handledBodyPartIds.includes(part.id)) {
            winGoal.assignTarget(part);
            handledBodyPartIds.push(part.id);
        }
    }
    winGoal.runGoal();
    let injuredCreeps = getObjectsByPrototype(Creep).filter(c => c.my && c.hits < c.hitsMax);
    let secondaryTargets = findInRange(myTower, enemyCreeps, 10);
    let injuredMembers = findInRange(myTower, injuredCreeps, 10);
    if (injuredMembers.length > 0) {
        let target = findClosestByRange(myTower, injuredMembers);
        myTower.heal(target);
    }
    else if (secondaryTargets.length > 0) {
        let target = findClosestByRange(myTower, secondaryTargets);
        if (target.hits < target.hitsMax * 0.9) {
            let ret = myTower.attack(target);
            console.log("tower tried to attack", target.id, "got", ret);
        }
    }
    endTick();
}

export { loop };
