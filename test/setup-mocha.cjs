const _ = require('lodash');
const mocha = require('mocha');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const path = require('path');
const fs = require('fs');

global._ = _;
global.mocha = mocha;
global.chai = chai;
global.sinon = sinon;
chai.use(sinonChai);

const mocksPath = path.resolve(__dirname, './mocks/screeps-globals.js');
// console.log('Attempting to load mocks from:', mocksPath);
// console.log('File exists:', fs.existsSync(mocksPath));

if (fs.existsSync(mocksPath)) {
  try {
    const mocks = require(mocksPath);
    // console.log('Mocks loaded successfully');
    try {
      for (const key in mocks) {
        // console.log("applying mock", key)
        global[key] = mocks[key];
        // console.log("mock applied", key)
      }
    //   console.log("mocks applied")
    } catch (error) {
    //   console.error('Error applying mocks:', error);
    }
  } catch (error) {
    // console.error('Error loading mocks:', error);
  }
} else {
//   console.error('Mocks file not found!');
}

// Override ts-node compiler options
process.env.TS_NODE_PROJECT = 'tsconfig.test.json';
