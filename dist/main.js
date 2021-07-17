"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.loop = loop;
exports.test3 = void 0;
var foo = "hello from test!";

function test2() {
  console.log("test2 start"); // comments and shit

  console.log("test2 end", foo);
} // comments and shit


var test3 = test2;
exports.test3 = test3;

function loop() {
  console.log("main loop start", foo);
  test2(); // comments and shit

  console.log("main loop end??", [1, 2, 3].map(function (num) {
    return num * 2;
  }));
}