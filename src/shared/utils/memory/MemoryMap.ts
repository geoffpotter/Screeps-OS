// empty

import MemoryManager, { baseStorable, StorableCreatableClass } from "shared/utils/memory/MemoryManager"
import Logger from "shared/utils/logger";
let logger = new Logger("MemoryMap");
logger.color = COLOR_CYAN;

export interface MemoryMapJSON {
    id: string
    keyToFullNameMap: [string, string][]
    storeWholeObject: boolean
}
export default class MemoryMap<T extends baseStorable> extends baseStorable implements StorableCreatableClass<MemoryMap<T>, typeof MemoryMap<T>, MemoryMapJSON> {
    private keyToFullNameMap: Map<string, string | T> = new Map();
    private getObject: ((id: string) => T | undefined) | false;

    constructor(id: string, getObject: ((id: string) => T | undefined) | false = defaultGetObject) {
        super(id);
        this.getObject = getObject;
    }

    static fromJSON(json: MemoryMapJSON, getObject: ((id: string) => baseStorable | undefined) | false = defaultGetObject): MemoryMap<any> {

        let getObjectArg = getObject;
        if(getObjectArg === false && !json.storeWholeObject) {
            getObjectArg = defaultGetObject;
        }
        let obj = new MemoryMap<any>(json.id, getObjectArg);
        obj.keyToFullNameMap = new Map(json.keyToFullNameMap);
        return obj;
    }

    toJSON(): MemoryMapJSON {
        return {
            id: this.id,
            keyToFullNameMap: Array.from(this.keyToFullNameMap.entries()).map(([key, value]) => [key, this.getObject === false ? value as string : (value as T).fullId]),
            storeWholeObject: this.getObject === false
        }
    }

    set(key: string, value: T): this {
        this.keyToFullNameMap.set(key, this.getObject === false ? value : value.fullId)
        return this
    }

    get(key: string): T | undefined {
        const value = this.keyToFullNameMap.get(key);
        if (value === undefined) return undefined;
        return this.getObject === false ? value as T : this.getObject(value as string) as T;
    }

    has(key: string): boolean {
        return this.keyToFullNameMap.has(key)
    }

    delete(key: string): boolean {
        return this.keyToFullNameMap.delete(key)
    }

    clear(): void {
        this.keyToFullNameMap.clear()
    }

    get size(): number {
        return this.keyToFullNameMap.size
    }

    keys(): string[] {
        return Array.from(this.keyToFullNameMap.keys())
    }

    values(): T[] {
        let values = [];
        for (let value of this.keyToFullNameMap.values()) {
            // logger.log("get value", value, this.getObject)
            let obj = this.getObject === false ? value as T : this.getObject(value as string) as T;
            if (!obj) {
                throw new Error("Object not found in memory: " + value);
            }
            values.push(obj);
        }
        return values;
    }

    *entries(): IterableIterator<[string, T]> {
        for (let [key, value] of this.keyToFullNameMap) {
            const obj = this.getObject === false ? value as T : this.getObject(value as string) as T;
            if (!obj) {
                throw new Error("Object not found in memory: " + value);
            }
            yield [key, obj];
        }
    }

    toMap(): Map<string, T> {
        return new Map(this.entries())
    }

    forEach(callbackfn: (value: T, key: string, map: MemoryMap<T>) => void, thisArg?: any): void {
        let map = this.toMap()
        for (let [key, fullName] of this.keyToFullNameMap) {
            let obj = this.getObject === false ? fullName as T : this.getObject(fullName as string) as T;
            if (!obj) {
                throw new Error("Object not found in memory: " + fullName)
            }
            callbackfn(obj as T, key, this)
        }
    }

    get [Symbol.toStringTag](): string {
        return "MemoryBackedMap";
    }

    *[Symbol.iterator](): IterableIterator<[string, T]> {
        for (let [key, fullName] of this.keyToFullNameMap) {
            let obj = this.getObject === false ? fullName as T : this.getObject(fullName as string) as T;
            if (!obj) {
                throw new Error("Object not found in memory: " + fullName)
            }
            yield [key, obj as T]
        }
    }
}

function defaultGetObject<T extends baseStorable>(id: string): T | undefined {
    return MemoryManager.getObject(id) as T | undefined;
}
