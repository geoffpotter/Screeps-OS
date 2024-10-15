
let oldConsole = console;
module.exports = {
  Game: {
    fakeStartTime: 0,
    cpu: {
        getUsed: () => {
            return Date.now() - this.fakeStartTime;
        },
    },
    creeps: {},
    flags: {},
    gcl: {},
    rooms: {},

  },

  Memory: {},

  console: {
    log: (...args) => {oldConsole.log(...args)},
    error: (...args) => {oldConsole.error(...args)},
    warn: (...args) => {oldConsole.warn(...args)},
    info: (...args) => {oldConsole.info(...args)},
    debug: (...args) => {oldConsole.debug(...args)},
    assert: (...args) => {oldConsole.assert(...args)},
    clear: (...args) => {oldConsole.clear(...args)},
    count: (...args) => {oldConsole.count(...args)},
    countReset: (...args) => {oldConsole.countReset(...args)},
    group: (...args) => {oldConsole.group(...args)},
    groupEnd: (...args) => {oldConsole.groupEnd(...args)},
    table: (...args) => {oldConsole.table(...args)},
    time: (...args) => {oldConsole.time(...args)},
    timeEnd: (...args) => {oldConsole.timeEnd(...args)},
    trace: (...args) => {oldConsole.trace(...args)},
    dir: (...args) => {oldConsole.dir(...args)},
    commandResult: (...args) => {oldConsole.log(...args)},
  },
  // Add any other necessary Screeps globals here
};
