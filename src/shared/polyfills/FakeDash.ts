import {
    //profiler,
    profile
  } from "shared/utils/profiling/profiler"

import { benchmark } from "shared/utils/profiling/benchmark";
import loggerClass from "utils/logger";
let logger = new loggerClass("fakeDash");


export const escape = (str: string|undefined) => {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  //@ts-ignore
  return str.replace(/[&<>"']/g, m => map[m])
}

export function round(number: string | number, places: string | number) {
    return +(Math.round(+(number + "e+" + places))  + "e-" + places);
  }



export function get(obj:any, path: string, defaultValue = "") {

    // @ts-ignore
    const result = path.split('.').reduce((r, p) => r[p], obj);

    return result !== undefined ? result : defaultValue;
};

export function set(obj: any, path: (string | number)[]|string, value: any) {
    if (Object(obj) !== obj) return obj; // When obj is not an object
    // If not yet an array, get the keys from the string-path
    if (!Array.isArray(path)) path = path.toString().split(".") || [];

    path.slice(0,-1).reduce((a: { [x: string]: {}; }, c: string | number, i: number) => // Iterate all of them except the last one
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




