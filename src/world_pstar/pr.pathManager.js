var logger = require("screeps.logger");
logger = new logger("pr.pathManager");


let processClass = require("INeRT.process");
let threadClass = require("INeRT.thread");

let CachedPath = global.utils.map.classes.CachedPath;
let Node = global.utils.pStar.classes.Node;
let Edge = global.utils.pStar.classes.Edge;
let pStarRoom = global.utils.pStar.classes.pStarRoom;
//let pStar = global.utils.pStar.class;


class pathManager extends processClass {
    init() {
        this.maxEdgesRefinedPerTick = 100;
        this.edgesRefinedThisTick = 0;
    }

    initThreads() {
        return [
            this.createThread("tickInit", "init"),
            this.createThread("updateNetwork", "pathing"),
            this.createThread("displayNetwork", "work"),
            this.createThread("save", "pathing"),
            this.createThread("load", "init")
        ]
    }

    tickInit() {
        this.createBaseNodes();
        
        this.edgesRefinedThisTick = 0;
    }
    createBaseNodes() {
        for(let spawnName in Game.spawns) {
            let spawn = Game.spawns[spawnName];
            let node = new Node(spawn.pos, Node.BASE);
            if (!global.utils.pStar.inst.hasNode(node)) {
                global.utils.pStar.inst.addNode(node);
            }
            
        }
        
        //return threadClass.DONE;
    }

    updateNetwork() {
        global.utils.pStar.inst.addRoomsToNetwork();
        global.utils.pStar.inst.refineRooms();
        let edgesRefined = global.utils.pStar.inst.refineEdges();
        this.edgesRefinedThisTick += edgesRefined;

        logger.log(this.name, "refined", edgesRefined, "edges")
        if (edgesRefined > 0 && this.edgesRefinedThisTick < this.maxEdgesRefinedPerTick) {
            return threadClass.HUNGRY;
        } else {
            return threadClass.TICKDONE;
        }
    }

    displayNetwork() {
        global.utils.pStar.inst.displayNodes();
        global.utils.pStar.inst.displayRooms();
    }

    load() {
        logger.log(this.name, "deserializing!")
        if (Memory.pStar) {
            let start = Game.cpu.getUsed();
            global.utils.pStar.inst = global.utils.pStar.classes.pStar.deserialize(Memory.pStar);
            let cpu = Game.cpu.getUsed() - start;
            logger.log("pStar deserialized", global.utils.pStar.inst.rooms.getAll().length, "cpu used:", cpu)
        }
        return threadClass.DONE;
    }
    save() {
        logger.log(this.name, "serializing!")
        let start = Game.cpu.getUsed();
        let serialized = global.utils.pStar.inst.serialize();
        Memory.pStar = serialized;
        
        let cpu = Game.cpu.getUsed() - start;
        logger.log("serialized length:", serialized.length, "cpu used:", cpu);
        //global.utils.pStar.inst.edges._debugQueue();

        logger.log("rooms queued to be added", JSON.stringify(global.utils.pStar.inst.roomAdditionQueue));

        return 10;
    }
}

module.exports = pathManager;