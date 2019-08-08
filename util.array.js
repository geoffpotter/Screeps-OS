/*

 */

var logger = require("screeps.logger");
logger = new logger("util.arrays");

class IndexingCollection {
    constructor(idField = "id", groupByFields = []) {

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

    }

    add(theThing) {
        let id = _.get(theThing, this.idField);
        if (this.thingsById[id]) {
            logger.log("before:", Object.keys(this.thingsById).length)
            this.remove(theThing);
            logger.log(Object.keys(this.thingsById).length)
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

        //used to disallow adding existing items, now will update item by removing, then adding
        // } else {
        //     //it's already here.. why are you calling this?
        //     throw new Error("Thing already in collection! -> " + id);
        // }
    }

    remove(theThing) {
        let id = _.get(theThing, this.idField);
        if (!this.thingsById[id]) {
            //can't remove what's not there
            throw new Error("Thing not in collection! -> " + id);
            
        } else {
            //remove from id lookup and groups
            delete this.thingsById[id];

            for(let f in this.groupByFields) {
                let fieldPath = this.groupByFields[f];
                let value = _.get(theThing, fieldPath);
                //logger.log("removing", theThing.id, "from", fieldPath, "value", value);
                if (this.groups[fieldPath][value]) {
                    //logger.log("before remove", JSON.stringify(this.groups[fieldPath][value]))
                    this.groups[fieldPath][value] = _.remove(this.groups[fieldPath][value], (thisId) => id != thisId);
                    //logger.log("after remove", JSON.stringify(this.groups[fieldPath][value]))
                } else {
                    throw new Error("Object for removal isn't in all groupings.. I broke something, I'm sorry.");
                }
            }
            
        }
    }

    has(aThing) {
        let id = _.get(aThing, this.idField);
        return !!this.thingsById[id];
    }
    getAll() {
        return _.values(this.thingsById);
    }
    getById(id) {
        if(!this.thingsById[id]) {
            return false;
        }
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
        arr = arr.concat(this.groupByFields);
        arr.push(false);
        
        let all = this.getAll();
        for(let i in all) {
            let thing = all[i];
            let serialized = thing.serialize();
            arr.push(serialized);
        }
       
        return arr.join("∪");
    }
    static deserialize(str, thingClass) {
        let arr = str.split("∪");
        let idField = arr.shift();
        let groups = [];
        let group = true;
        while(group != "false") {
            group = arr.shift();
            if (group != "false")
                groups.push(group);
        }
        
        
        let inst = new IndexingCollection(idField, groups);
        for(let i in arr) {
            let itemObj = arr[i];
            let item = thingClass.deserialize(itemObj);
            inst.add(item);
        }
        return inst;
    }
}






module.exports = {
    IndexingCollection,

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
    
    setInRange: function(matrix, x_in, y_in, range, cost) {
        var xStart = x_in - range;
        var yStart = y_in - range;
        var xEnd = x_in + range;
        var yEnd = y_in + range;
        
        for(var x = xStart; x < xEnd; x++) {
            for(var y = yStart; y < yEnd; y++) {
                matrix.set(x, y, cost);
            }
        }
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