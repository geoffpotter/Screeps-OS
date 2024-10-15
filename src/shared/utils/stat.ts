/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('util.stat');
 * mod.thing == 'a thing'; // true
 */

import Logger from 'shared/utils/logger';

const logger = new Logger('util.stat');

export default class Stat {
    longAvg: number;
    shortAvg: number;
    min: number;
    max: number;
    private _current: number;
    private shortWeight: number;
    private longWeight: number;

    constructor(shortWeight: number = 0.9, longWeight: number = 0.99) {
        this.longAvg = 0;
        this.shortAvg = 0;
        this.min = 0;
        this.max = 0;
        this._current = 0;
        this.shortWeight = shortWeight;
        this.longWeight = longWeight;
    }

    get current(): number {
        return this._current;
    }

    set current(value: number) {
        this._current = value;
        if (this.longAvg === 0) {
            this.longAvg = this._current;
        }
        if (this.shortAvg === 0) {
            this.shortAvg = this._current;
        }
        if (this.min === 0) {
            this.min = this._current;
        }
        if (this.max === 0) {
            this.max = this._current;
        }

        this.longAvg = this.longAvg * this.longWeight + this._current * (1 - this.longWeight);
        this.shortAvg = this.shortAvg * this.shortWeight + this._current * (1 - this.shortWeight);
        this.min = Math.min(this.min, this._current);
        this.max = Math.max(this.max, this._current);
    }

    toString(): string {
        return `sAvg:${this.shortAvg} lAvg:${this.longAvg} min:${this.min} max:${this.max}`;
    }
}

