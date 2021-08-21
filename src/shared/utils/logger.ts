/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * import mod  from "screeps.logger";
 * mod.thing == 'a thing'; // true
 */

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
    var line = module + " ";
    for (var i in arguments) {
      line += arguments[i] + " ";
    }
    console.log(this.colorize(line, this.color));
  }
  colorize(line: string, color: any): any {
    if(typeof color == "number") {
      return "<font color='" + colorMap[color] + "'>" + line + "</font>"
    } else {
      return "<font color='" + color + "'>" + line + "</font>"
    }
  }
}