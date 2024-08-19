/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('util.stat');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("util.stat");

class stat {
    constructor(shortWeight = .9, longWeight = .99) {
        this.longAvg = false;
        this.shortAvg = false;
        this.min = false;
        this.max = false;
        this._current = 0;
        this.shortWeight = shortWeight;
        this.longWeight = longWeight;
    }
    
    get current() {
        return this._current;
    }
    set current(value) {
        this._current = value;
        if (this.longAvg === false) {
            this.longAvg = this._current;
        }
        if (this.shortAvg === false) {
            this.shortAvg = this._current;
        }
        if (this.min === false) {
            this.min = this._current;
        }
        if (this.max === false) {
            this.max = this._current;
        }
        
        
        this.longAvg = this.longAvg * (this.longWeight) + this._current * (1 - this.longWeight);
        this.shortAvg = this.shortAvg * (this.shortWeight) + this._current * (1 - this.shortWeight);
        this.min = Math.min(this.min, this._current);
        this.max = Math.max(this.max, this._current);
    }
    
    toString() {
        return `sAvg:${this.shortAvg} lAvg:${this.longAvg} min:${this.min} max:${this.max}`;
    }
}



module.exports = {
    classes: {
        stat
    }
}
