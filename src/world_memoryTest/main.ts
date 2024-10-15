
console.log("=================================================================================")

import { profile, profiler } from "shared/utils/profiling/profiler";
import wasteCPU from "shared/utils/profiling/wasteCPU";


import MemoryManager, { registerMemoryClass, StorableCreatableClass, baseStorable } from "shared/utils/memory/MemoryManager";
import MemoryMap from "shared/utils/memory/MemoryMap";

// //@ts-ignore
// let oldStringify = global.JSON.stringify
// let oldParse = global.JSON.parse
// //@ts-ignore
// delete global.JSON;
// //@ts-ignore
// let myJson = {
//     stringify: function (obj: any) {
//         if (typeof obj === "object" && obj !== null) {
//             wasteCPU(100)
//         }
//         console.log("stringify", typeof obj)
//         return oldStringify(obj)
//     },
//     parse: function (text: string) {
//         // console.log("parse", text)
//         return oldParse(text)
//     }
// }
// //@ts-ignore
// global.JSON = myJson


// profiler.clear()
// profiler.start()

class baseObject extends baseStorable implements StorableCreatableClass<baseObject, typeof baseObject, string> {
    name: string;
    born: number;
    constructor(id: string, name: string, born: number | false = false) {
        super(id)
        this.name = name + " initialized " + Game.time;
        this.born = born ? born : Game.time;
    }

    toJSON(): string {
        // wasteCPU(10)
        return this.id + ":" + this.born
    }

    static fromJSON(json: string): baseObject {
        let obj: any;
        if (typeof json === "object") {
            obj = json
        } else {
            let [id, born] = json.split(":")
            obj = {
                id: id,
            };
            if (born) {
                obj.born = born
            }
        }
        // console.log("fromJSON", json)
        //@ts-ignore
        if (obj.name == undefined) {
            //@ts-ignore
            obj.name = "Loaded Object " + obj.id + " born " + obj.born
        }
        //@ts-ignore
        return new testObject(obj.id, obj.name, obj.born)
    }
}
class testObject extends baseObject {
    constructor(id: string, name: string, born: number | false = false) {
        super(id, name, born)
    }
}
class testObject2 extends baseObject {
    constructor(id: string, name: string, born: number | false = false) {
        super(id, name, born)
    }
}

let t = new MemoryMap<testObject>("test")


function generateTestObjects(num: number): testObject[] {
    let objects: testObject[] = [];
    for (let i = 0; i < num; i++) {
        let objectFromMemory = MemoryManager.loadOrCreateObject(testObject, i.toString(), `Object ${i}`, Game.time);
        objects.push(objectFromMemory);
    }
    for (let i = 0; i < num; i++) {
        let objectFromMemory = MemoryManager.loadOrCreateObject(testObject2, i.toString(), `Object2 ${i}`, Game.time);
        objects.push(objectFromMemory);
    }
    return objects;
}


registerMemoryClass(testObject)
registerMemoryClass(testObject2)




let resetMemory = false;


let init = false;
let objects: testObject[] = []
exports.loop = function () {
    console.log('--------------------------------------------')

    MemoryManager.pretick()

    //@ts-ignore
    if (!init) {
        let initStart = Game.cpu.getUsed()
        let objectsToGenerate = 30_000
        if (resetMemory) {
            RawMemory.set("{}")
            //@ts-ignore
            objects = generateTestObjects(objectsToGenerate)
            // objects = generateTestObjects(6)
            resetMemory = false
        } else {
            objects = generateTestObjects(objectsToGenerate)
        }
        init = true;
        let initUsed = Game.cpu.getUsed() - initStart
        console.log("initUsed", initUsed)
    }

    console.log("num creeps", Object.keys(Game.creeps).length)
    let readStart = Game.cpu.getUsed()

    console.log("total objects", objects.length, "\nfirst object", objects[0].name)
    let readUsed = Game.cpu.getUsed() - readStart
    console.log("readUsed", readUsed)

    MemoryManager.postTick()

    // profiler.output()
}
