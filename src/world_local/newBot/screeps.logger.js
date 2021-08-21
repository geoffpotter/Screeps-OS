/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * import mod  from "screeps.logger";
 * mod.thing == 'a thing'; // true
 */

var colorMap = {};
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

let logger = function(module, color) {
  this.module = module;
  this.enabled = true;
  this.color = color ? color : COLOR_WHITE;



  this.log = function() {
    if (!this.enabled)
      return;
    var t = module + " ";
    for (var i in arguments) {
      t += arguments[i] + " ";
    }
    console.log(this.colorize(t, this.color));
  }

  this.colorize = function(msg, color) {
    return "<font color='" + colorMap[color] + "'>" + msg + "</font>"
  }
}



export default logger;