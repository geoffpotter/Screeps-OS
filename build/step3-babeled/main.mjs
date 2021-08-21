import { getTicks, getObjectsByPrototype } from '/game/utils';
import { Creep } from '/game/prototypes';

class settingsController {
    constructor() {
        this.settings = new Map();
    }
    ;
    getCpu() {
        if (this.settings.has('getCpu')) {
            let func = this.settings.get("getCpu");
            if (typeof func == "function") {
                return func();
            }
        }
        console.log("getCpu not in settings! using date()");
        return new Date().valueOf();
    }
    getTick() {
        if (this.settings.has('getTick')) {
            let func = this.settings.get("getTick");
            if (typeof func == "function") {
                return func();
            }
        }
        throw new TypeError("getTick not defined in Settings!");
    }
    getMemory() {
        if (this.settings.has('getMemory')) {
            let func = this.settings.get("getMemory");
            if (typeof func == "function") {
                return func();
            }
        }
        throw new TypeError("getMemory not defined in Settings!");
    }
    getSetting(settingName) {
        if (this.settings.has(settingName)) {
            return this.settings.get(settingName);
        }
        return false;
    }
    setSetting(settingName, value) {
        this.settings.set(settingName, value);
    }
    setSettings(settingsObject, baseName = false) {
        for (let settingName in settingsObject) {
            let value = settingsObject[settingName];
            let name = settingName;
            if (baseName) {
                name = baseName + "." + settingName;
            }
            if (typeof value == "object") {
                this.setSettings(value, name);
            }
            else {
                this.setSetting(settingName, value);
            }
        }
    }
}
let settings$1 = new settingsController();

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

class Profiler {
    constructor() {
        this.stack = [];
    }
    getMemory() {
        return Memory;
    }
    getTick() {
        return Game.time;
    }
    getCpu() {
        return Game.cpu.getUsed();
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
    for (let intervalId in intervals) {
        let interval = intervals[intervalId];
        if (!intervals[intervalId]) {
            console.log("interval canceled:", intervalId);
            return;
        }
        if (!(interval.startTick >= 0)) {
            interval.startTick = 0;
        }
        let currentTick = settings$1.getTick();
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
    for (let timeoutId in timeouts) {
        let timeout = timeouts[timeoutId];
        if (!timeouts[timeoutId]) {
            console.log("timeout canceled:", timeoutId);
            return;
        }
        if (!(timeout.startTick >= 0)) {
            timeout.startTick = 0;
        }
        let ticksSinceStart = settings$1.getTick() - timeout.startTick;
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
let settings = settings$1;

let mem = {};
let runtimeSettings = {
  getCpu: () => new Date().valueOf(),
  getTick: getTicks,
  getMemory: () => {
    return mem;
  }
};

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
    runGoal() {
        throw new TypeError("runGoal not implemented");
    }
}
baseGoal.type = "baseGoal";

class winCTF extends baseGoal {
    constructor(id, parent = false) {
        super(id, parent);
        this.defenseGoals = [];
        this.attackGoals = [];
    }
    runGoal() {
        this.setupChildGoals();
        this.runChildGoals();
    }
    runChildGoals() {
        for (let goal of this.defenseGoals) {
            goal.runGoal();
        }
        for (let goal of this.attackGoals) {
            goal.runGoal();
        }
    }
    reassignCreeps() {
        let creeps = getObjectsByPrototype(Creep);
        for (let creep of creeps) {
        }
    }
}
winCTF.type = "winCTF";

settings.setSettings(runtimeSettings);
let winGoal = new winCTF("base");
function loop() {
    console.log("------ start tick ----------");
    winGoal.runGoal();
    endTick();
}

export { loop };
