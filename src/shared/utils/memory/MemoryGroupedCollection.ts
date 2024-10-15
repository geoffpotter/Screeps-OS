import MemoryManager, { baseStorable, StorableClass, StorableCreatableClass } from "shared/utils/memory/MemoryManager";
import { get } from 'polyfills/FakeDash';
import Logger from "shared/utils/logger";
const logger = new Logger("MemoryGroupedCollection");
logger.color = COLOR_GREY;

class LRUInfo {
  id: string;
  newer: string | null;
  older: string | null;
  constructor(id: string) {
    this.id = id;
    this.newer = this.older = null;
  }
}

export function getGroupedCollection<T extends baseStorable>(id: string, idField: string = "id", groupByFields: string[] = [], limits: number[] = [10, 20, 30], getObject: ((id: string) => T | undefined) | false = defaultGetObject): MemoryGroupedCollection<T> {
  let collection = MemoryManager.loadOrCreateObject(MemoryGroupedCollection, id, idField, groupByFields, limits, getObject);
  return collection as MemoryGroupedCollection<T>;
}

export interface MemoryGroupedCollectionJSON<T extends baseStorable> {
  id: string;
  idField: string;
  groupByFields: string[];
  limits: number[];
  thingsById: { [id: string]: string | T };
  groups: { [groupName: string]: { [value: string]: string[] } };
  lruOrder: string[];
  storeWholeObject: boolean;
}


function defaultGetObject<T extends baseStorable>(id: string): T | undefined {
  return MemoryManager.getObject(id) as T | undefined;
}

export default class MemoryGroupedCollection<T extends baseStorable> extends baseStorable implements StorableClass<MemoryGroupedCollection<T>, typeof MemoryGroupedCollection<T>, MemoryGroupedCollectionJSON<T>> {
  private idField: string;
  private groupByFields: string[];
  private thingsById: Map<string, string | T>;
  private groups: { [groupName: string]: { [value: string]: Set<string> } };
  private nodeInfoById: Map<string, LRUInfo>;
  private limits: number[];
  private head: string | null;
  private tail: string | null;
  private getObject: ((id: string) => T | undefined) | false;

  constructor(id: string, idField: string = "id", groupByFields: string[] = [], limits: number[] = [Infinity], getObject: ((id: string) => T | undefined) | false = defaultGetObject) {
    super(id);
    this.idField = idField;
    this.groupByFields = groupByFields;
    this.thingsById = new Map();
    this.groups = {};
    for (let field of groupByFields) {
      this.groups[field] = {};
    }
    this.nodeInfoById = new Map();
    this.limits = limits;
    this.head = null;
    this.tail = null;
    this.getObject = getObject;
  }

  static fromJSON<T extends baseStorable>(json: MemoryGroupedCollectionJSON<T>, getObject: ((id: string) => T | undefined) | false = false): MemoryGroupedCollection<T> {
    let getObjectArg = getObject;
    if(getObjectArg === false && !json.storeWholeObject) {
      getObjectArg = defaultGetObject;
    }
    const collection = new MemoryGroupedCollection<T>(json.id, json.idField, json.groupByFields, json.limits, getObjectArg);
    for (const [id, value] of Object.entries(json.thingsById)) {
      collection.thingsById.set(id, value as string | T);
    }
    for (const [groupName, groupValues] of Object.entries(json.groups)) {
      collection.groups[groupName] = {};
      for (const [value, ids] of Object.entries(groupValues)) {
        collection.groups[groupName][value] = new Set(ids);
      }
    }
    for (const id of json.lruOrder) {
      collection.markUsed(id);
    }
    return collection;
  }

  toJSON(): MemoryGroupedCollectionJSON<T> {
    const groupsJSON: { [groupName: string]: { [value: string]: string[] } } = {};

    for (const [groupName, groupValues] of Object.entries(this.groups)) {
      groupsJSON[groupName] = {};
      for (const [value, ids] of Object.entries(groupValues)) {
        groupsJSON[groupName][value] = Array.from(ids);
      }
    }

    let things: { [id: string]: string | T } = {};
    for (const [id, value] of this.thingsById) {
      things[id] = this.getObject ? value as T : value as string;
    }

    return {
      id: this.id,
      idField: this.idField,
      groupByFields: this.groupByFields,
      limits: this.limits,
      thingsById: things,
      groups: groupsJSON,
      lruOrder: this.getLRUOrder(),
      storeWholeObject: this.getObject === false,
    };
  }

  private getLRUOrder(): string[] {
    const order: string[] = [];
    let current = this.head;
    while (current) {
      order.push(current);
      current = this.nodeInfoById.get(current)?.older ?? null;
    }
    return order;
  }

  private markUsed(id: string) {
    let nodeInfo = this.nodeInfoById.get(id);
    if (!nodeInfo) {
      nodeInfo = new LRUInfo(id);
      this.nodeInfoById.set(id, nodeInfo);
    } else if (this.head === id) {
      return;
    }

    // Remove from current position
    if (nodeInfo.newer) this.nodeInfoById.get(nodeInfo.newer)!.older = nodeInfo.older;
    if (nodeInfo.older) this.nodeInfoById.get(nodeInfo.older)!.newer = nodeInfo.newer;
    if (this.tail === id) this.tail = nodeInfo.newer;

    // Move to head
    nodeInfo.newer = null;
    nodeInfo.older = this.head;
    if (this.head) this.nodeInfoById.get(this.head)!.newer = id;
    this.head = id;
    if (!this.tail) this.tail = id;
  }

  private enforceLimit() {
    const finalLimit = this.limits[this.limits.length - 1];
    while (this.thingsById.size > finalLimit && this.tail) {
      const tailId = this.tail;
      const tailInfo = this.nodeInfoById.get(tailId)!;
      this.tail = tailInfo.newer;
      if (this.tail) this.nodeInfoById.get(this.tail)!.older = null;
      this.nodeInfoById.delete(tailId);
      this.removeById(tailId);
    }
  }

  add(thing: T) {
    const id = get(thing, this.idField) as string;
    // logger.log("Adding thing", id, thing);
    if (this.hasId(id)) {
      // logger.log("Thing already in collection, removing it", id, thing);
      this.removeById(id);
    }

    this.thingsById.set(id, this.getObject === false ? thing : thing.fullId);
    for (const fieldPath of this.groupByFields) {
      const value = get(thing, fieldPath);
      if (!this.groups[fieldPath][value]) {
        this.groups[fieldPath][value] = new Set();
      }
      this.groups[fieldPath][value].add(id);
    }

    this.markUsed(id);
    this.enforceLimit();
    // logger.log("Added thing", id, thing, this.thingsById);
  }

  removeById(id: string) {
    if (!this.thingsById.has(id)) {
      throw new Error("Thing not in collection! -> " + id);
    }

    const thing = this.getById(id);

    if(!thing) {
      throw new Error("Thing not found in collection! -> " + id);
    }

    this.thingsById.delete(id);
    for (const fieldPath of this.groupByFields) {
      const value = get(thing, fieldPath);
      if (this.groups[fieldPath][value]) {
        this.groups[fieldPath][value].delete(id);
        if (this.groups[fieldPath][value].size === 0) {
          delete this.groups[fieldPath][value];
        }
      }
    }

    const nodeInfo = this.nodeInfoById.get(id);
    if (nodeInfo) {
      if (nodeInfo.newer) this.nodeInfoById.get(nodeInfo.newer)!.older = nodeInfo.older;
      if (nodeInfo.older) this.nodeInfoById.get(nodeInfo.older)!.newer = nodeInfo.newer;
      if (this.head === id) this.head = nodeInfo.older;
      if (this.tail === id) this.tail = nodeInfo.newer;
      this.nodeInfoById.delete(id);
    }

    return true;
  }

  remove(thing: T) {
    const id = get(thing, this.idField) as string;
    if (!this.removeById(id)) {
      throw new Error("Thing not in collection! -> " + id);
    }
  }

  clear() {
    this.thingsById.clear();
    this.groups = {};
    for (const field of this.groupByFields) {
      this.groups[field] = {};
    }
    this.nodeInfoById.clear();
    this.head = null;
    this.tail = null;
  }

  hasId(id: string): boolean {
    return this.thingsById.has(id);
  }

  has(thing: T): boolean {
    const id = get(thing, this.idField) as string;
    return this.hasId(id);
  }

  getAll(): T[] {
    return Array.from(this.thingsById.entries()).map(([id, value]) =>
      this.getObject === false ? value as T : this.getObject(value as string) as T
    );
  }

  getById(id: string): T | undefined {
    if (!this.thingsById.has(id)) return undefined;
    this.markUsed(id);
    const value = this.thingsById.get(id);
    return this.getObject === false ? value as T : this.getObject(value as string) as T;
  }

  getGroupWithValue(fieldPath: string, value: string | number): string[] {
    return Array.from(this.groups[fieldPath]?.[value] ?? []);
  }

  getGroup(fieldPath: string): { [value: string]: string[] } {
    if (!this.groupByFields.includes(fieldPath)) {
      throw new Error("There's no grouping by this field: " + fieldPath);
    }
    const result: { [value: string]: string[] } = {};
    for (const [value, ids] of Object.entries(this.groups[fieldPath])) {
      result[value] = Array.from(ids);
    }
    return result;
  }
  getGroupWithValueGetObjects<returnType extends T>(fieldPath: string, value: string | number): returnType[] {
    return this.getGroupWithValue(fieldPath, value).map(id=>this.getById(id) as returnType);
  }

  get size(): number {
    return this.thingsById.size;
  }

  forEach(callback: (value: T, key: string, map: MemoryGroupedCollection<T>) => void): void {
    for (const [id, value] of this.thingsById) {
      const thing = this.getObject === false ? value as T : this.getObject(value as string) as T;
      if (!thing) {
        let wtf = Game.getObjectById(id);
        //@ts-ignore
        let wtfWrapper = wtf.getWrapper();
        logger.log("wtf", id, value, MemoryManager.getObject(id), wtf?.id, wtfWrapper?.id);
        throw new Error("Thing not found in collection! -> " + id);
      }
      callback(thing, id, this);
    }
  }

  map<U>(callback: (value: T, key: string, map: MemoryGroupedCollection<T>) => U): U[] {
    const result: U[] = [];
    this.forEach((value, key) => {
      result.push(callback(value, key, this));
    });
    return result;
  }
}
