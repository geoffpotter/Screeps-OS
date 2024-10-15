import MemoryManager, { baseStorable, StorableCreatableClass } from "shared/utils/memory/MemoryManager";

export interface MemoryBackedSetJSON {
    id: string;
    values: string[];
    storeWholeObject: boolean;
}

export default class MemoryBackedSet<T extends baseStorable> extends baseStorable implements StorableCreatableClass<MemoryBackedSet<T>, typeof MemoryBackedSet<T>, MemoryBackedSetJSON> {
    private valueSet: Set<string | T> = new Set();
    private getObject: ((id: string) => T | undefined) | false;

    constructor(id: string, storeWholeObject: boolean = false, getObject: ((id: string) => T | undefined) | false = defaultGetObject) {
        super(id);
        this.getObject = getObject;
    }

    static fromJSON<T extends baseStorable>(json: MemoryBackedSetJSON): MemoryBackedSet<T> {
        let getObjectArg = json.storeWholeObject ? false : defaultGetObject;
        const obj = new MemoryBackedSet<T>(json.id, json.storeWholeObject, getObjectArg);
        obj.valueSet = new Set(json.values);
        return obj;
    }

    toJSON(): MemoryBackedSetJSON {
        return {
            id: this.id,
            values: Array.from(this.valueSet).map(v => this.getObject === false ? v as string : (v as T).fullId),
            storeWholeObject: this.getObject === false
        };
    }

    add(value: T): this {
        this.valueSet.add(this.getObject === false ? value : value.fullId);
        return this;
    }

    delete(value: T): boolean {
        return this.valueSet.delete(this.getObject === false ? value : value.fullId);
    }

    has(value: T): boolean {
        return this.valueSet.has(this.getObject === false ? value : value.fullId);
    }

    clear(): void {
        this.valueSet.clear();
    }

    get size(): number {
        return this.valueSet.size;
    }

    values(): T[] {
        return Array.from(this.valueSet).map(value => {
            if (this.getObject === false) return value as T;
            return this.getObject(value as string) as T;
        });
    }

    *entries(): IterableIterator<[T, T]> {
        for (const value of this.valueSet) {
            const obj = this.getObject === false ? value as T : this.getObject(value as string) as T;
            if (!obj) {
                throw new Error("Object not found in memory: " + value);
            }
            yield [obj, obj];
        }
    }

    forEach(callbackfn: (value: T, value2: T, set: MemoryBackedSet<T>) => void, thisArg?: any): void {
        for (const value of this.valueSet) {
            const obj = this.getObject === false ? value as T : this.getObject(value as string) as T;
            if (!obj) {
                throw new Error("Object not found in memory: " + value);
            }
            callbackfn.call(thisArg, obj as T, obj as T, this);
        }
    }

    get [Symbol.toStringTag](): string {
        return "MemoryBackedSet";
    }

    *[Symbol.iterator](): IterableIterator<T> {
        for (const value of this.valueSet) {
            const obj = this.getObject === false ? value as T : this.getObject(value as string) as T;
            if (!obj) {
                throw new Error("Object not found in memory: " + value);
            }
            yield obj;
        }
    }
}

function defaultGetObject<T extends baseStorable>(id: string): T | undefined {
    return MemoryManager.getObject(id) as T | undefined;
}
