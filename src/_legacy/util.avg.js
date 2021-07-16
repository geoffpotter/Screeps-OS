/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('util.avg');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("util.avg");

class avg {
    constructor(weight = .9) {
        this.avg = 0;
        this.weight = weight;
    }
    
    get value() {
        return this.avg;
    }
    set value(value) {
        if (this.avg == 0) {
            this.avg = value;
        }
        
        this.avg = this.avg * (this.weight) + value * (1 - this.weight);
    }
}



module.exports = avg;