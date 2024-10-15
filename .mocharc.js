const path = require('path');

module.exports = {
  require: [
    'ts-node/register',
    'tsconfig-paths/register',
    path.resolve(__dirname, './test/setup-mocha.cjs')
  ],
  ui: 'bdd',
  reporter: 'spec',
  bail: true,
  'full-trace': true,
  'watch-extensions': ['tsx', 'ts'],
  color: true,
  recursive: true,
  timeout: 0,
  exit: true,
  spec: ['test/unit/**/*.test.ts'],
  'trace-warnings': true,
  'check-leaks': true,
  'log-timer-events': true,
  'display-pending': true
};
