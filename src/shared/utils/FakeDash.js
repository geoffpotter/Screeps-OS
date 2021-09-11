import {
    //profiler,
    profile
  } from "profiler";

import { benchmark } from "utils/benchmark";
import loggerClass from "utils/logger";
let logger = new loggerClass("fakeDash");

/**
 * @param {number} number
 * @param {number} places
 */
export function round(number, places) {
    return +(Math.round(+(number + "e+" + places))  + "e-" + places);
  }




/**
 * @param {any} obj
 * @param {string} path
 * @param {any} defaultValue
 */
export function get(obj, path, defaultValue = "") {

    // @ts-ignore
    const result = path.split('.').reduce((r, p) => r[p], obj);

    return result !== undefined ? result : defaultValue;
};

/**
 * @param {any} obj
 * @param {string|Array<String>} path
 * @param {any} value
 */
export function set(obj, path, value) {
    if (Object(obj) !== obj) return obj; // When obj is not an object
    // If not yet an array, get the keys from the string-path
    if (!Array.isArray(path)) path = path.toString().split(".") || [];

    path.slice(0,-1).reduce((a, c, i) => // Iterate all of them except the last one
         Object(a[c]) === a[c] // Does the key exist and is its value an object?
             // Yes: then follow that path
             ? a[c]
             // No: create the key. Is the next key a potential array-index?
             : a[c] = Math.abs(+path[i+1])>>0 === +path[i+1]
                   ? [] // Yes: assign a new array object
                   : {}, // No: assign a new plain object
         obj)[path[path.length-1]] = value; // Finally assign the value to the last key
    return obj; // Return the top-level object to allow chaining
};




