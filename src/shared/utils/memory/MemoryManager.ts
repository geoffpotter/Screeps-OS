import { AnIdConstructorTypeOf, OmitFirstArg, StaticImplements } from "../types";
import Logger from "shared/utils/logger";
let logger = new Logger("MemoryManager");

interface IStorable<storageType> {
    id: string;
    toJSON?: () => storageType;
}

interface IStorableClass<T extends IStorable<storageType>, storageType> {
    new (...args: any[]): T;
    fromJSON(json: storageType): T;
}
interface IStorableCreateableClass<T extends IStorable<storageType>, storageType> extends IStorableClass<T, storageType> {
    new (id: string, ...args: any[]): T;
}


export type StorableClass<InstanceType extends IStorable<any>, ClassType extends IStorableClass<InstanceType, storageType>, storageType> = StaticImplements<ClassType, ClassType>;
export type StorableCreatableClass<InstanceType extends IStorable<any>, ClassType extends IStorableCreateableClass<InstanceType, storageType>, storageType> = StaticImplements<ClassType, ClassType>;


export class baseStorable implements IStorable<any> {
    readonly id: string;
    readonly fullId: string;
    constructor(id: string) {
        // console.log("baseStorable constructor", this.constructor.name, id, new Error().stack)
        this.id = id;
        this.fullId = this.constructor.name + "_" + id;
    }
}
// class test extends baseStorable implements StorableCreatableClass<test, typeof test, object> {
//     constructor(id: string) {
//         super(id);
//     }
//     static fromJSON(json: object): test {
//         //@ts-ignore
//         return new test(json.id);
//     }
// }

let classRegistry: Record<string, IStorableCreateableClass<any, any>> = {};
export function registerMemoryClass<T extends IStorable<any>>(classRef: IStorableCreateableClass<T, any>) {
    let type = classRef.constructor.name
    console.log("registerClass", type, classRef.constructor.name)
    classRegistry[type] = classRef;
}

declare global {
    interface Memory {
        objects: {
            [type: string]: any[]
        };
    }
}

let startTick = Game.time;
class MemoryHandler {
    memory: Memory;
    objectsByType: Record<string, IStorable<any>[]>;
    objectsById: Record<string, IStorable<any>>;
    initDone: boolean = false;
    constructor() {
        const start = Game.cpu.getUsed()
        //@ts-ignore
        this.memory = Memory
        const end = Game.cpu.getUsed()
        let parseTime = end - start
        //@ts-ignore
        logger.log("memory parsed", parseTime, RawMemory._parsed)
        //@ts-ignore
        this.memory = RawMemory._parsed
        if (!this.memory.objects) {
            this.memory.objects = {}
        }
        this.objectsByType = {}
        this.objectsById = {}

    }
    clearMemory() {
        //@ts-ignore
        this.memory = {};
        this.objectsByType = {};
        this.objectsById = {};
        //@ts-ignore
        delete global.Memory
        //@ts-ignore
        global.Memory = this.memory

    }
    registerObject(obj: IStorable<any>) {
        let type = obj.constructor.name
        let fullName = type + "_" + obj.id;
        // console.log("registerObject", fullName, Object.keys(this.objectsById).length)
        if (this.objectsById[fullName]) {
            this.unregisterObject(obj)
            // logger.log(Object.keys(this.objectsById), this.objectsById[fullName] === obj, obj.constructor.name, this.objectsById[fullName].constructor.name)
            logger.error("Object with this type and id already registered: " + fullName, new Error().stack)
            // throw new Error("Object with this type and id already registered: " + fullName)
        }
        if (!this.objectsByType[type]) {
            this.objectsByType[type] = []
        }
        this.objectsByType[type].push(obj)
        this.objectsById[fullName] = obj
    }
    unregisterObject(obj: IStorable<any>) {
        let type = obj.constructor.name
        let fullName = type + "_" + obj.id;
        delete this.objectsById[fullName]
    }

    getObject(fullName: string): IStorable<any> | undefined {
        // logger.log("getObject", fullName, Object.keys(this.objectsById))
        return this.objectsById[fullName]
    }
    getObjectByTypeAndId(type: string, id: string): IStorable<any> | undefined {
        let fullName = type + "_" + id;
        return this.objectsById[fullName]
    }
    loadOrCreateObject<ConstructorType extends IStorableCreateableClass<any, any>>(constructor: ConstructorType, id: string, ...args: ConstructorParameters<OmitFirstArg<ConstructorType>>): InstanceType<ConstructorType> {
        let type = constructor.name
        let fullName = type + "_" + id;
        logger.log("getObject", fullName, Object.keys(this.objectsById))
        if (this.objectsById[fullName]) {
            return this.objectsById[fullName] as InstanceType<ConstructorType>
        }
        let obj: InstanceType<ConstructorType>;
        obj = new constructor(id, ...args);
        this.registerObject(obj as IStorable<any>);
        return obj;
    }
    pretick() {
        // logger.log("checking for restart", Game.time, startTick, Game.time - startTick == 0, Object.keys(Game.spawns).length, Object.keys(Game.structures).length, Object.keys(Game.creeps).length)
        // if ((Game.time - startTick > 100) && Object.keys(Game.spawns).length === 1 && Object.keys(Game.structures).length === 2 && Object.keys(Game.creeps).length === 0) {
        //     logger.log("restart detected, clearing memory")
        //     //restart detected, clear memory and restart
        //     this.clearMemory();
        //     //@ts-ignore
        //     Game.cpu.halt();
        // }
        //@ts-ignore
        delete global.Memory
        //@ts-ignore
        global.Memory = this.memory
        //@ts-ignore
        // RawMemory._parsed = this.memory
        if (!this.initDone) {
            let allTypes = Object.keys(classRegistry)
            for (let type of allTypes) {
                let objects = this.memory.objects[type]
                if (!objects || objects.length == 0) continue;
                for (let data of objects) {
                    let obj = classRegistry[type].fromJSON(data)
                    if (!this.objectsByType[type]) {
                        this.objectsByType[type] = []
                    }
                    this.objectsByType[type].push(obj)
                    let fullName = type + "_" + obj.id;
                    this.objectsById[fullName] = obj
                }
            }
            console.log("initDone", Object.keys(this.objectsById))
            this.initDone = true;
        }
    }
    postTick() {
        let start = Game.cpu.getUsed()
        // let allTypes = Object.keys(this.objectsByType)
        // for (let type of allTypes) {
        //     this.memory.objects[type] = []
        //     let objects = this.objectsByType[type]
        //     for (let obj of objects) {
        //         let data;
        //         if (obj.toJSON) {
        //             data = obj.toJSON()
        //         } else {
        //             data = obj.id
        //         }
        //         // if (!this.memory.objects[type]) {
        //         //     this.memory.objects[type] = []
        //         // }
        //         this.memory.objects[type].push(data)
        //     }
        // }
        this.memory.objects = this.objectsByType;
        RawMemory.set(JSON.stringify(this.memory))
        //@ts-ignore
        // RawMemory._parsed = this.memory
        let end = Game.cpu.getUsed()
        console.log("postTick", end - start)
    }
}
let memoryHandler = new MemoryHandler()
export default memoryHandler;
