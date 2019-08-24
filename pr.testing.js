/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('pr.init');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("pr.testing");


let processClass = require("INeRT.process");
let threadClass = require("INeRT.thread");

let CachedPath = global.utils.map.CachedPath;
let Node = global.utils.pStar.Node;
let Edge = global.utils.pStar.Edge;
//let pStar = global.utils.pStar.class;


class serializeFlag {
    constructor(flagName) {
        this.flagName = flagName;
        this.pos = false;
        this.color = false;
        this.secondColor = false;
    }
    get id() {
        return this.flagName;
    }
    loadFlag() {
        logger.log(this.flagName, "loading flag.. to simulate having actually done something")
        let flag = Game.flags[this.flagName];
        this.pos = flag.pos;
        this.color = flag.color;
        this.secondColor = flag.secondaryColor;
        global.utils.visual.circle(this.pos, "green", 1, 0.5);
    }
    displayFlag() {
        if (this.pos) {
            //we have pos, display flag name at pos
            global.utils.visual.drawText(this.flagName, this.pos);
        } else {
            //no pos to use for display... 
            logger.log(this.flagName, "has no pos to display at!")
        }
    }
    serialize(level) {
        let arr = [];
        arr.push(this.flagName);//always store flag name
        //if we're on level 1, also store the other info
        if (level == 1) {
            arr.push(this.pos ? this.pos.toWorldPosition().serialize() : "");
            arr.push(this.color);
            arr.push(this.secondColor);
        }
        return arr.join("|");
    }

    static deserialize(str) {
        let [name, pos, color, color2] = str.split("|");
        let inst = new serializeFlag(name);
        if (pos) { //if pos is there, the others should be too
            inst.pos = global.WorldPosition.deserialize(pos).toRoomPosition();
            inst.color = color;
            inst.secondColor = color2;
        }
        return inst;
    }
}


class testProc extends processClass {
    init() {


        
        this.flags = new global.utils.array.IndexingCollection("id", ["pos.roomName", "color"], [3, 5, 8]);
    }
    initThreads() {
        return [
            
            this.createThread("init_onTick", "init"),
            this.createThread("run", "empire"),
            this.createThread("displayFlags", "edges"),
            this.createThread("loadFlags", "nodes"),
            this.createThread("save", "work")
        ];
        
    }
    init_onTick() {
        if (Memory.flags) {
            this.flags = global.utils.array.IndexingCollection.deserialize(Memory.flags, serializeFlag);
        }
        return threadClass.DONE;
    }
    displayFlags() {
        let allFlags = this.flags.getAll();
        for(let f in allFlags) {
            /** @type {serializeFlag} */
            let flagObj = allFlags[f];
            flagObj.displayFlag();
        }
    }

    loadFlags() {
        let flagKeys = Object.keys(this.flags.thingsById);
        let numToLoad = 2;
        for(let i=0;i<numToLoad;i++) {
            let flagName = _.sample(flagKeys);
            let flagObj = this.flags.getById(flagName);
            flagObj.loadFlag();
        }
    }

    save() {
        this.flags._debugQueue();
        Memory.flags = this.flags.serialize();
    }
    run() {
        logger.log(this.name, "init")
        

        this.mapFlags();

  
    }

    mapFlags() {
        //rebuild the network every tick
        //global.utils.pStar.inst = new global.utils.pStar.class();
        let num = 1;
        while(Game.flags["Flag" + num]) {
            let flag = Game.flags["Flag" + num];
            logger.log("mapping flag", flag.name)
            let flagObj = new serializeFlag(flag.name);
            if (!this.flags.has(flagObj)) {
                this.flags.add(flagObj);
            }
            num++;
        }
    }
}



module.exports = testProc;