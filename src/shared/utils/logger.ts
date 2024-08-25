/*
 * Module code goes here. Use 'module.export const to export things:
 * module.export constthing = 'a thing';
 *
 * You can import it from another modules like this:
 * import mod  from "screeps.logger";
 * mod.thing == 'a thing'; // true
 */

const COLOR_RED = 1;
const COLOR_PURPLE = 2;
const COLOR_BLUE = 3;
const COLOR_CYAN = 4;
const COLOR_GREEN = 5;
const COLOR_YELLOW = 6;
const COLOR_ORANGE = 7;
const COLOR_BROWN = 8;
const COLOR_GREY = 9;
const COLOR_WHITE = 10;


var colorMap:string[] = [];
colorMap[COLOR_RED] = "red";
colorMap[COLOR_PURPLE] = "purple";
colorMap[COLOR_BLUE] = "blue";
colorMap[COLOR_CYAN] = "cyan";
colorMap[COLOR_GREEN] = "green";
colorMap[COLOR_YELLOW] = "yellow";
colorMap[COLOR_ORANGE] = "orange";
colorMap[COLOR_BROWN] = "brown";
colorMap[COLOR_GREY] = "grey";
colorMap[COLOR_WHITE] = "white";

export default class logger {
  module: string;
  enabled: boolean;
  color: any;

  constructor(module: string, color: any = "white") {
    this.module = module;
    this.enabled = true;
    this.color = color ? color : COLOR_WHITE;
  }

  log(item:any, item2:any, item3:any, item4:any, item5:any, item6:any):void;
  log(item:any, item2:any, item3:any, item4:any, item5:any):void;
  log(item:any, item2:any, item3:any, item4:any):void;
  log(item:any, item2:any, item3:any):void;
  log(item:any, item2:any):void;
  log(item:any):void;
  log():void {
    if (!this.enabled)
      return;
    var line = this.module + " ";
    for (var i in arguments) {
      if(typeof arguments[i] == "object")
        line += JSON.stringify(arguments[i]) + " ";
      else
        line += arguments[i] + " ";
    }
    console.log(this.colorize(line, this.color));
  }
  colorize(line: string, color: any): any {
    return line;
    // if(typeof color == "number") {
    //   return "<font color='" + colorMap[color] + "'>" + line + "</font>"
    // } else {
    //   return "<font color='" + color + "'>" + line + "</font>"
    // }
  }
}
