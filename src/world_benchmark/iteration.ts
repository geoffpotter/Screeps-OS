
import benchmark, { benchmarkAsync } from "shared/utils/profiling/benchmark";


function time() {
    if (typeof Game !== "undefined") {
        return Game.cpu.getUsed()
    } else {
        //@ts-ignore
        return performance.now();
    }
}

/**
 * Implements a key-value iterator for objects
 */
class ObjectIterator {
    // private
    // obj;
    // idx;
    // props;
    obj:any;
    idx:number;
    props:string[];
    constructor(obj:any) {
        this.obj = obj;
        this.idx = 0;
        this.props = Object.getOwnPropertyNames(obj);
    }

    next() {
        if (this.idx >= this.props.length) {
            return { value: undefined, done: true };
        }
        const key = this.props[this.idx];
        const value = this.obj[key];
        const ret = { value: [key, value, this.idx], done: false };
        this.idx++;
        return ret;
    }

    return() {
        this.idx = 0;
        this.props = [];
    }

    [Symbol.iterator]() {
        return this;
    }
}

const repeats = 1000000;
const elemCount = 1000;

const data = [...Array(elemCount).keys()];
const array = [...data];
const set = new Set(data);
//@ts-ignore
const map = new Map(_.zip(data, data));
const object = {}

// Slap some random key and values into our object and set the object' iterator as our special iterator
for (let idx = 1; idx <= elemCount; idx++) {
    //@ts-ignore
    object[`key${idx}`] = idx;
}

//@ts-ignore
object[Symbol.iterator] = () => new ObjectIterator(obj);

const obj = object;



function getTestsObj(obj:Object) {
    return {
        forin_loop: () => {
            let sum = 0;
            for (const i in obj) {
                //@ts-ignore
                sum += obj[i];
            }
        },

        forof_loop: () => {
            let sum = 0;
            //@ts-ignore
            for (const i of obj) {
                sum += i;
            }
        },

        forof_entries_loop: () => {
            let sum = 0;
            for (const [i, o] of Object.entries(obj)) {
                sum += o;
            }
        },

        forEach_lodash: () => {
            let sum = 0;
            _.forEach(obj, obj => sum += obj);
        }
    }
}

function getTestsArr(obj:Array<any>) {
    return {
        for_loop: () => {
            let sum = 0;
            const len = obj.length;
            for (let i = 0; i < len; i++) {
                sum += obj[i];
            }
        },

        forin_loop: () => {
            let sum = 0;
            for (const i in obj) {
                sum += obj[i];
            }
        },

        forof_loop: () => {
            let sum = 0;
            for (const i of obj) {
                sum += i;
            }
        },

        forof_entries_loop: () => {
            let sum = 0;
            for (const [i, o] of Object.entries(obj)) {
                sum += o;
            }
        },

        forEach_lodash: () => {
            let sum = 0;
            _.forEach(obj, obj => sum += obj);
        }
    }
}

function getTestsMapSet(obj:Set<any>) {
    return {
        forEach_loop: () => {
            let sum = 0;
            obj.forEach((val:any) => sum += val);
        },
        forof_loop: () => {
            let sum = 0;
            for (const i of obj) {
                sum += i;
            }
        },

        forof_entries_loop: () => {
            let sum = 0;
            for (const [i, o] of Object.entries(obj)) {
                sum += o;
            }
        },

        forEach_lodash: () => {
            let sum = 0;
            _.forEach(obj, obj => sum += obj);
        }
    }
}

function getTestsMap(obj:Map<any, any>) {
    return {
        for_loop: () => {
            let sum = 0;
            const len = obj.size;
            for (let i = 0; i < len; i++) {
                sum += obj.get(i);
            }
        },

        forin_loop: () => {
            let sum = 0;
            for (const i in obj) {
                sum += obj.get(i);
            }
        },

        forof_loop: () => {
            let sum = 0;
            for (const i of obj) {
                sum += i[1];
            }
        },

        forof_entries_loop: () => {
            let sum = 0;
            for (const [i, o] of obj.entries()) {
                sum += o;
            }
        },

        forEach_lodash: () => {
            let sum = 0;
            _.forEach(obj, obj => sum += obj);
        }
    }
}



function convert(obj: any, prefix:string = '', postfix:string = '') {
    let arr = [];
    for(let key in obj) {
        let func = obj[key]
        func.benchName = prefix + key + postfix;
        arr.push(func);
    }
    return arr;
}

export async function runIterationTests(numEntries:number, numRepeats:number) {
    const data = [...Array(numEntries).keys()];
    const array = [...data];
    const set = new Set(data);
    //@ts-ignore
    const map = new Map(_.zip(data, data));
    const object = {}

    // Slap some random key and values into our object and set the object' iterator as our special iterator
    for (let idx = 1; idx <= elemCount; idx++) {
        //@ts-ignore
        object[`key${idx}`] = idx;
    }

    //@ts-ignore
    object[Symbol.iterator] = () => new ObjectIterator(obj);

    const obj = object;


    let arrayTests = convert(getTestsArr(array), "array_");
    let setTests = convert(getTestsMapSet(set), "set_");
    let mapTests = convert(getTestsMap(map), "map_");
    let objTests = convert(getTestsObj(obj), "object_");

    let allTests = [
        ...arrayTests,
        ...setTests,
        ...mapTests,
        ...objTests
    ]

    await benchmarkAsync(allTests, numRepeats, false, 800);
}
