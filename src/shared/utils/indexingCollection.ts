
import { get, set } from "utils/fakeDash";

import { default as logClass } from "utils/logger";
let logger = new logClass("indexingCollection");




class LRUInfo<T> {
  id: any;
  newer: LRUInfo<T> | false;
  older: LRUInfo<T> | false;
  constructor(id: string) {
    this.id = id;
    this.newer = this.older = false;
  }
}

export class IndexingCollection<T> {
  idField: string;
  groupByFields: string[];
  thingsById: { [id: string]: T };
  groups: { [groupName: string]: { [value: string]: string[] } };
  nodeInfoById: Map<string, LRUInfo<T>>;
  limits: number[];
  head: LRUInfo<T> | false;
  tail: LRUInfo<T> | false;
  serializeSeperator: string;
  constructor(idField: string = "id", groupByFields: string[] = [], limits: number[] | false = false) {
    if (!limits) {
      //10 full items, 10 more partial items, 30 max
      limits = [10, 20, 30];
    }
    if (!idField) {
      throw new Error("Id field required!")
    }
    this.idField = idField;
    this.groupByFields = groupByFields;
    //Main storage of all things
    this.thingsById = {};
    //groups.[field path/name].[field value].[thing-IDs]
    this.groups = {};
    for (let f in groupByFields) {
      let field = groupByFields[f];
      this.groups[field] = {};
    }

    /** @type {Map<String, LRUInfo>} */
    this.nodeInfoById = new Map();

    this.limits = limits;
    /** @type {LRUInfo} */
    this.head = false;
    /** @type {LRUInfo} */
    this.tail = false;

    this.serializeSeperator = "∪";
  }


  _markUsed(thingInfo: LRUInfo<T>) {
    //if we have a newer and older then we're
    if (this.head && thingInfo.id == this.head.id) {
      //logger.log(thingInfo.id, "already most recently used")
      return;
    }

    //logger.log("marking", thingInfo.id, "as used.  older? ", thingInfo.older ? thingInfo.older.id : "none", "pref?", thingInfo.newer ? thingInfo.newer.id : "none")
    //this._debugQueue();





    if (thingInfo.older || thingInfo.newer) { //thing already in collection
      //remove thing info.
      let older = thingInfo.older;
      let newer = thingInfo.newer;
      if (older)
        older.newer = newer;
      if (newer)
        newer.older = older;

      thingInfo.older = thingInfo.newer = false;
    }
    if (!this.head) { //first node
      this.head = this.tail = thingInfo;
    } else {//already have nodes
      this.head.newer = thingInfo; //add this node to top of list
      thingInfo.older = this.head;
      this.head = thingInfo; //mark this node as head

      //clear up .head and .tail
      if (this.head.id == thingInfo.id) {
        thingInfo.newer = false;
      }
      // if (this.tail.id == thingInfo.id) {
      //     thingInfo.older = false;
      // }
    }
    //logger.log("marked", thingInfo.id, "as used.  older? ", thingInfo.older ? thingInfo.older.id : "none", "pref?", thingInfo.newer ? thingInfo.newer.id : "none")

    //this._debugQueue();
  }

  _enforceLimit() {
    //logger.log("enforcing limits", this.head.id, this.tail.id);
    //this._debugQueue();
    let finalLimit = this.limits[this.limits.length - 1];
    while (this.nodeInfoById.size > finalLimit) {
      logger.log('over limit!', this.nodeInfoById.size, finalLimit);
      let nodeInfoToRemove = this.tail;
      if (!nodeInfoToRemove) {
        continue; //end of the collection?
      }
      let nodeToRemove = this.thingsById[nodeInfoToRemove.id];
      this._debugQueue();
      logger.log("removing node", JSON.stringify(nodeToRemove));
      this.remove(nodeToRemove);
    }
  }

  forEach(fn: Function) {
    if (!this.head) {
      return; //collection must be empty
    }
    let curr = this.head;
    let cThing = this.thingsById[curr.id];
    if (!cThing) {
      if (Object.keys(this.thingsById).length == 0) {
        return;//it's empty, not broken.. guess that makes me the asshole!
      }
      logger.log("broken...", this.head.id, Object.keys(this.thingsById));
      return;
    }
    fn(cThing);
    let i = 0;
    let max = Object.keys(this.thingsById).length + 10; //+10 for sanity.. shouldn't ever go more than once for each item
    if (!curr.older) {
      //umm.. feel like something must be broken if this happens.

      logger.log('broke somethin?');
      throw new Error("wtf");

    }
    while (curr = curr.older) {
      if (i > max) {
        logger.log('broke somethin?');
        throw new Error("wtf")
      }
      //logger.log('for eachin', curr.id, curr.older.id, curr.newer.id);
      cThing = this.thingsById[curr.id];
      fn(cThing);
      i++;
    }
  }
  _debugQueue() {
    let out = "";
    this.forEach((thing: { id: string; }) => {
      //logger.log(thing)
      out += thing.id + ">"
    })
    logger.log('internal queue:', out);
  }

  add(theThing: T) {
    let id: string = get(theThing, this.idField);

    if (this.thingsById[id]) {
      //logger.log("before:", Object.keys(this.thingsById), id, theThing.id,  JSON.stringify(this.idField))
      this.remove(theThing);
      //logger.log(Object.keys(this.thingsById).length)
    }
    //new thing!

    this.thingsById[id] = theThing;
    for (let f in this.groupByFields) {
      let fieldPath = this.groupByFields[f];
      let value: any = get(theThing, fieldPath);
      if (!this.groups[fieldPath][value]) {
        this.groups[fieldPath][value] = [];
      }
      this.groups[fieldPath][value].push(id);
    }

    let nodeInfo = new LRUInfo(id);
    this.nodeInfoById.set(id, nodeInfo);
    this._markUsed(nodeInfo);
    this._enforceLimit();
  }

  remove(theThing: T) {
    let id: string = get(theThing, this.idField);
    if (!this.thingsById[id]) {
      //can't remove what's not there
      //logger.log(id, this.thingsById[id], this.has(theThing))
      throw new Error("Thing not in collection! -> " + id);

    } else {
      //remove from id lookup and groups
      delete this.thingsById[id];

      let nodeInfo = this.nodeInfoById.get(id);
      if (!nodeInfo) {
        throw new Error("Thing not in collection! -> " + id);
      }
      if (nodeInfo.newer) {
        let newerNode = nodeInfo.newer;
        newerNode.older = nodeInfo.older;
      }
      if (nodeInfo.older) {
        let olderNode = nodeInfo.older;
        olderNode.newer = nodeInfo.newer;
      }
      //@ts-ignore  //it's complaining about head/tail.id, since head/tail could false
      if (nodeInfo.id == this.head.id) {
        this.head = nodeInfo.older;
      }
      //@ts-ignore
      if (nodeInfo.id == this.tail.id) {
        this.tail = nodeInfo.newer;
      }

      this.nodeInfoById.delete(id);

      for (let f in this.groupByFields) {
        let fieldPath = this.groupByFields[f];
        let value: any = get(theThing, fieldPath);
        //logger.log("removing", theThing.id, "from", fieldPath, "value", value);
        if (this.groups[fieldPath][value]) {
          //logger.log("before remove", JSON.stringify(this.groups[fieldPath][value]))
          this.groups[fieldPath][value] = this.groups[fieldPath][value].filter((thisId) => id == thisId)
          //logger.log("after remove", JSON.stringify(this.groups[fieldPath][value]))
        } else {
          logger.log("grouping error:", fieldPath, value, Object.keys(this.groups[fieldPath]))
          throw new Error("Object for removal isn't in all groupings.. I broke something, I'm sorry.");
        }
      }

    }
  }

  hasId(id: string | number) {
    let has = !!this.thingsById[id];
    return has;
  }
  has(aThing: T) {
    let id: any = get(aThing, this.idField);
    let has = this.thingsById[id] != undefined;
    if (has) {
      let info = this.nodeInfoById.get(id);
      //this._markUsed(info);
    }
    return has;
  }
  getAll():T[] {
    return Object.values(this.thingsById);
  }
  getById(id: string) {
    if (!this.thingsById[id]) {
      return false;
    }
    let info = this.nodeInfoById.get(id);
    if (info)
      this._markUsed(info);
    return this.thingsById[id];
  }
  getGroupWithValue(fieldPath: any, value: string | number) {
    let group = this.getGroup(fieldPath);
    if (!group[value]) {
      return false;
    }
    return group[value];
  }
  getGroup(fieldPath: string) {
    if (this.groupByFields.indexOf(fieldPath) == -1) {
      throw new Error("there's no grouping by this field:" + fieldPath);
    }
    return this.groups[fieldPath];
  }

  serialize() {
    let arr: any[] = [];
    //add the id field, then groups, then a false, then the things
    arr.push(this.idField);
    arr.push(this.limits.join("Œ"))
    arr = arr.concat(this.groupByFields);
    arr.push(false);


    let numSerialized = 0;
    let currLimitIndex = 0;
    this.forEach((thing: { serialize: (arg0: number) => any; }) => {

      if (currLimitIndex >= (this.limits.length - 1)) {
        //logger.log("not serializing anymore", numSerialized)
        return;
      }
      //logger.log('serializing thing', thing.id, numSerialized, currLimit, currLimitIndex)
      let serialized = thing.serialize(currLimitIndex + 1);
      arr.push(serialized);
      numSerialized++;

      let currLimit = this.limits[currLimitIndex];
      while (currLimit && numSerialized >= currLimit) {
        currLimit = this.limits[currLimitIndex];
        currLimitIndex++;
        logger.log("next limit", currLimitIndex + 1, "/", this.limits.length, "for serializing", this.limits[currLimitIndex - 1]);
        //check if we're out of limits, if so, stop serializing shit dummy
        if (currLimitIndex >= (this.limits.length - 1)) {
          logger.log("not serializing anymore", numSerialized)
          return;
        }
      }



    })

    //logger.log("serialized", numSerialized, "things")
    return this.serializeSeperator + arr.join(this.serializeSeperator);
  }
  static deserialize(str: string, thingClass: { deserialize: (arg0: any) => any; }) {
    logger.log("deserializin")
    if (!str) {
      throw new Error("wtf are you doin bro")
    }
    let seperator = str.slice(0, 1);
    str = str.substr(1);
    logger.log("deserialize", seperator, str);
    let arr = str.split(seperator);
    let idField = arr.shift();
    let limitStr = arr.shift();
    let limits: any[] = [];//number[] :(
    if (limitStr) {
      limits = limitStr.split("Œ");
    }

    let groups: string[] = [];
    let group: string | boolean = true;
    while (group != "false") {
      group = arr.shift() || false;
      if (typeof group == "string" && group != "false")
        groups.push(group);
    }


    //logger.log("items:", JSON.stringify(arr))
    let inst = new IndexingCollection(idField, groups, limits);
    inst.serializeSeperator = seperator;
    //reverse items before putting them back in, to keep the lru order
    arr = arr.reverse();
    for (let i in arr) {
      let itemObj = arr[i];
      let item = thingClass.deserialize(itemObj);
      //logger.log('adding thing', item.id)
      inst.add(item);
    }
    return inst;
  }
}

