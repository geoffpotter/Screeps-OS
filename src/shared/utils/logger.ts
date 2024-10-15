/*
 * Module code goes here. Use 'module.export const to export things:
 * module.export constthing = 'a thing';
 *
 * You can import it from another modules like this:
 * import mod  from "screeps.logger";
 * mod.thing == 'a thing'; // true
 */

const LOG_COLOR_RED = 1;
const LOG_COLOR_PURPLE = 2;
const LOG_COLOR_BLUE = 3;
const LOG_COLOR_CYAN = 4;
const LOG_COLOR_GREEN = 5;
const LOG_COLOR_YELLOW = 6;
const LOG_COLOR_ORANGE = 7;
const LOG_COLOR_BROWN = 8;
const LOG_COLOR_GREY = 9;
const LOG_COLOR_WHITE = 10;


var colorMap:string[] = [];
colorMap[LOG_COLOR_RED] = "red";
colorMap[LOG_COLOR_PURPLE] = "purple";
colorMap[LOG_COLOR_BLUE] = "blue";
colorMap[LOG_COLOR_CYAN] = "cyan";
colorMap[LOG_COLOR_GREEN] = "green";
colorMap[LOG_COLOR_YELLOW] = "yellow";
colorMap[LOG_COLOR_ORANGE] = "orange";
colorMap[LOG_COLOR_BROWN] = "brown";
colorMap[LOG_COLOR_GREY] = "grey";
colorMap[LOG_COLOR_WHITE] = "white";

export default class Logger {
  module: string;
  enabled: boolean;
  color: any;

  constructor(module: string, color: any = "white") {
    this.module = module;
    this.enabled = true;
    this.color = color ? color : LOG_COLOR_WHITE;
  }

  error(...args: any[]):void {
    var line = this.module + "> ";
    for (var i in args) {
      if(typeof args[i] == "object")
        line += JSON.stringify(args[i]) + " ";
      else
        line += args[i] + " ";
    }

    console.log(this.colorize(line, LOG_COLOR_RED), "\n", new Error().stack);
  }
  log(...args: any[]):void {
    if (!this.enabled)
      return;
    var line = this.module + "> ";
    for (var i in args) {
      if(typeof args[i] == "object")
        line += JSON.stringify(args[i]) + " ";
      else
        line += args[i] + " ";
    }
    console.log(this.colorize(line, this.color));
  }
  colorize(line: string, color: any): any {
    // return line;
    if(typeof color == "number") {
      return "<font color='" + colorMap[color] + "'>" + line + "</font>"
    } else {
      return "<font color='" + color + "'>" + line + "</font>"
    }
  }
}
