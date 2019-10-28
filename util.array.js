/*

 */

var logger = require("screeps.logger");
logger = new logger("util.arrays");

class LRUInfo {
    constructor(id) {
        this.id = id;
        this.newer = this.older = false;
    }
}

class IndexingCollection {
    constructor(idField = "id", groupByFields = [], limits = false) {
        if (!limits) {
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
        for(let f in groupByFields) {
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

    /**
     * 
     * @param {LRUInfo} thingInfo 
     */
    _markUsed(thingInfo) {
        //if we have a newer and older then we're 
        if (this.head && thingInfo.id == this.head.id) {
            //logger.log(thingInfo.id, "already most recently used")
            return;
        }
        
        //logger.log("marking", thingInfo.id, "as used.  older? ", thingInfo.older ? thingInfo.older.id : "none", "pref?", thingInfo.newer ? thingInfo.newer.id : "none")
        //this._debugQueue();
        
        
        
        
        
        if (thingInfo.older || thingInfo.newer) { //thing already in path
            //remove thing info.
            let older = thingInfo.older;
            let newer = thingInfo.newer;
            if(older)
                older.newer = newer;
            if(newer)
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
        let finalLimit = this.limits[this.limits.length-1];
        while(this.nodeInfoById.size > finalLimit) {
            logger.log('over limit!',this.nodeInfoById.size, finalLimit);
            let nodeInfoToRemove = this.tail;
            let nodeToRemove = this.thingsById[nodeInfoToRemove.id];
            this._debugQueue();
            logger.log("removing node", JSON.stringify(nodeToRemove));
            this.remove(nodeToRemove);
        }
    }

    forEach(fn) {
        
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
        while(curr = curr.older) {
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
        this.forEach((thing) => {
            //logger.log(thing)
            out += thing.id + ">"
        })
        logger.log('internal queue:', out);
    }

    add(theThing) {
        let id = _.get(theThing, this.idField);

        if (this.thingsById[id]) {
            //logger.log("before:", Object.keys(this.thingsById), id, theThing.id,  JSON.stringify(this.idField))
            this.remove(theThing);
            //logger.log(Object.keys(this.thingsById).length)
        }
        //new thing!

        this.thingsById[id] = theThing;
        for(let f in this.groupByFields) {
            let fieldPath = this.groupByFields[f];
            let value = _.get(theThing, fieldPath);
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

    remove(theThing) {
        let id = _.get(theThing, this.idField);
        if (!this.thingsById[id]) {
            //can't remove what's not there
            //logger.log(id, this.thingsById[id], this.has(theThing))
            throw new Error("Thing not in collection! -> " + id);
            
        } else {
            //remove from id lookup and groups
            delete this.thingsById[id];

            let nodeInfo = this.nodeInfoById.get(id);
            if (nodeInfo.newer) {
                let newerNode = nodeInfo.newer;
                newerNode.older = nodeInfo.older; 
            }
            if (nodeInfo.older) {
                let olderNode = nodeInfo.older;
                olderNode.newer = nodeInfo.newer;
            }
            if (nodeInfo.id == this.head.id) {
                this.head = nodeInfo.older;
            }
            if (nodeInfo.id == this.tail.id) {
                this.tail = nodeInfo.newer;
            }
            
            this.nodeInfoById.delete(id);

            for(let f in this.groupByFields) {
                let fieldPath = this.groupByFields[f];
                let value = _.get(theThing, fieldPath);
                //logger.log("removing", theThing.id, "from", fieldPath, "value", value);
                if (this.groups[fieldPath][value]) {
                    //logger.log("before remove", JSON.stringify(this.groups[fieldPath][value]))
                    this.groups[fieldPath][value] = _.remove(this.groups[fieldPath][value], (thisId) => id != thisId);
                    //logger.log("after remove", JSON.stringify(this.groups[fieldPath][value]))
                } else {
                    throw new Error("Object for removal isn't in all groupings.. I broke something, I'm sorry.", fieldPath, value, Object.keys(this.groups[fieldPath]));
                }
            }
            
        }
    }

    hasId(id) {
        let has = !!this.thingsById[id];
        return has;
    }
    has(aThing) {
        let id = _.get(aThing, this.idField);
        let has = this.thingsById[id] != undefined; 
        if (has) {
            let info = this.nodeInfoById.get(id);
            //this._markUsed(info);
        }
        return has;
    }
    getAll() {
        return _.values(this.thingsById);
    }
    getById(id) {
        if(!this.thingsById[id]) {
            return false;
        }
        let info = this.nodeInfoById.get(id);
        this._markUsed(info);
        return this.thingsById[id];
    }
    getGroupWithValue(fieldPath, value) {
        let group = this.getGroup(fieldPath);
        if (!group[value]) {
            return false;
        }
        return group[value];
    }
    getGroup(fieldPath) {
        if (this.groupByFields.indexOf(fieldPath) == -1) {
            throw new Error("there's no grouping by this field:", fieldPath);
        }
        return this.groups[fieldPath];
    }

    serialize() {
        let arr = [];
        //add the id field, then groups, then a false, then the things
        arr.push(this.idField);
        arr.push(this.limits.join("Œ"))
        arr = arr.concat(this.groupByFields);
        arr.push(false);
        

        let numSerialized = 0;
        let currLimitIndex = 0;
        this.forEach((thing) => {

            if (currLimitIndex >= (this.limits.length-1)) {
                //logger.log("not serializing anymore", numSerialized)
                return;
            }
            //logger.log('serializing thing', thing.id, numSerialized, currLimit, currLimitIndex)
            let serialized = thing.serialize(currLimitIndex+1);
            arr.push(serialized);
            numSerialized++;

            let currLimit = this.limits[currLimitIndex];
            while(currLimit && numSerialized >= currLimit) {
                currLimit = this.limits[currLimitIndex];
                currLimitIndex++;
                logger.log("next limit", currLimitIndex+1, "/", this.limits.length, "for serializing", this.limits[currLimitIndex-1]);
                //check if we're out of limits, if so, stop serializing shit dummy
                if (currLimitIndex >= (this.limits.length-1)) {
                    logger.log("not serializing anymore", numSerialized)
                    return;
                }
            }
            

            
        })

        //logger.log("serialized", numSerialized, "things")
        return this.serializeSeperator + arr.join(this.serializeSeperator);
    }
    static deserialize(str, thingClass) {
        logger.log("deserializin")
        if (!str) {
            throw new Error("wtf are you doin bro")
        }
        let seperator = str.slice(0, 1);
        str = str.substr(1);
        logger.log("deserialize", seperator, str);
        let arr = str.split(seperator);
        let idField = arr.shift();
        let limits = arr.shift().split("Œ");
        let groups = [];
        let group = true;
        while(group != "false") {
            group = arr.shift();
            if (group != "false")
                groups.push(group);
        }
        
        
        //logger.log("items:", JSON.stringify(arr))
        let inst = new IndexingCollection(idField, groups, limits);
        inst.serializeSeperator = seperator;
        //reverse items before putting them back in, to keep the lru order
        arr = arr.reverse();
        for(let i in arr) {
            let itemObj = arr[i];
            let item = thingClass.deserialize(itemObj);
            //logger.log('adding thing', item.id)
            inst.add(item);
        }
        return inst;
    }
}

// global.profiler.registerClass(IndexingCollection,"IndexingCollection");
// IndexingCollection.deserialize = global.profiler.registerFN(IndexingCollection.deserialize, "IndexingCollection.deserialize");

const top = 0;
const parent = i => ((i + 1) >>> 1) - 1;
const left = i => (i << 1) + 1;
const right = i => (i + 1) << 1;

class PriorityQueue {
  constructor(comparator = (a, b) => a > b) {
    this._heap = [];
    this._comparator = comparator;
  }
  size() {
    return this._heap.length;
  }
  isEmpty() {
    return this.size() == 0;
  }
  peek() {
    return this._heap[top];
  }
  push(...values) {
    values.forEach(value => {
      this._heap.push(value);
      this._siftUp();
    });
    return this.size();
  }
  pop() {
    const poppedValue = this.peek();
    const bottom = this.size() - 1;
    if (bottom > top) {
      this._swap(top, bottom);
    }
    this._heap.pop();
    this._siftDown();
    return poppedValue;
  }
  replace(value) {
    const replacedValue = this.peek();
    this._heap[top] = value;
    this._siftDown();
    return replacedValue;
  }
  
  replaceByValue(newValue, cmp = (a,b) => {a == b}) {
      for(let i in this._heap) {
          let item = this._heap[i];
          if (cmp(item, newValue)) {
              //found item, now how to remove it?
              //I assume pop it in place then shift up then down
              this._heap[i] = newValue;
              this._siftDown();
              this._siftUp();
              return true;
          }
      }
      return false;
  }
  _greater(i, j) {
    return this._comparator(this._heap[i], this._heap[j]);
  }
  _swap(i, j) {
    [this._heap[i], this._heap[j]] = [this._heap[j], this._heap[i]];
  }
  _siftUp() {
    let node = this.size() - 1;
    while (node > top && this._greater(node, parent(node))) {
      this._swap(node, parent(node));
      node = parent(node);
    }
  }
  _siftDown() {
    let node = top;
    while (
      (left(node) < this.size() && this._greater(left(node), node)) ||
      (right(node) < this.size() && this._greater(right(node), node))
    ) {
      let maxChild = (right(node) < this.size() && this._greater(right(node), left(node))) ? right(node) : left(node);
      this._swap(node, maxChild);
      node = maxChild;
    }
  }
}


module.exports = {
    classes: {
        IndexingCollection,
        PriorityQueue,
    },
    

    arrayContainsLoc: function(array, pos, debug) {
        for(var i in array) {
            var apos = array[i];
            if (debug)
                logger.log(pos, apos);
            if (apos.x == pos.x && apos.y == pos.y && apos.roomName == pos.roomName)
                return true;
        }
        return false;
    },
    
    


    flagCount: function(flags, color, secondaryColor) {
        var num = 0;
        for(var f in flags) {
            var flag = flags[f];
            if (flag.color == color && flag.secondaryColor == secondaryColor) {
                num++;
            }
        }
        return num;
    },
    
    flagsByColor: function(flags = false, color, secondaryColor = false, roomName = false) {
        var retFlags = [];
        for(var f in flags) {
            var flag = flags[f];
            if (flag.color == color && (secondaryColor == false || flag.secondaryColor == secondaryColor) && (roomName == false || flag.pos.roomName == roomName)) {
                retFlags.push(flag);
            }
        }
            //logger.log(flags, color, secondaryColor)
        return retFlags;
    },
    allFlagsByColor: function(color, secondaryColor = false, roomName = false) {
        let flags = Game.flags;
        var retFlags = [];
        for(var f in flags) {
            var flag = flags[f];
            //logger.log(JSON.stringify(flag), color, secondaryColor)
            if (flag.color == color && (secondaryColor == false || flag.secondaryColor == secondaryColor) && (roomName == false || flag.pos.roomName == roomName)) {
                retFlags.push(flag);
            }
        }
            //logger.log(flags, color, secondaryColor)
        return retFlags;
    },
    flagsAtPos: function(flags, pos) {
        var retFlags = [];
        for(var f in flags) {
            var flag = flags[f];
            if (flag.pos.isEqualTo(pos)) {
                retFlags.push(flag);
            }
        }
            //logger.log(flags, color, secondaryColor)
        return retFlags;
    },
}