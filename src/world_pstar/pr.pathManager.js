var logger = require("screeps.logger");
logger = new logger("pr.pathManager");


let processClass = require("INeRT.process");
let threadClass = require("INeRT.thread");

let map = require("util.map");
let pstar = require("util.pStar");
let CachedPath = map.classes.CachedPath;
let Node = pstar.classes.Node;
let Edge = pstar.classes.Edge;
let pStarRoom = pstar.classes.pStarRoom;
//let pStar = pstar.class;


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
            if (!pstar.inst.hasNode(node)) {
                pstar.inst.addNode(node);
            }

        }

        //return threadClass.DONE;
    }

    updateNetwork() {
        pstar.inst.addRoomsToNetwork();
        pstar.inst.refineRooms();
        let edgesRefined = pstar.inst.refineEdges();
        this.edgesRefinedThisTick += edgesRefined;

        logger.log(this.name, "refined", edgesRefined, "edges")
        if (edgesRefined > 0 && this.edgesRefinedThisTick < this.maxEdgesRefinedPerTick) {
            return threadClass.HUNGRY;
        } else {
            return threadClass.TICKDONE;
        }
    }

    displayNetwork() {
        pstar.inst.displayNodes();
        pstar.inst.displayRooms();
    }

    load() {
        logger.log(this.name, "deserializing!")
        if (Memory.pStar) {
            let start = Game.cpu.getUsed();
            pstar.inst = pstar.classes.pStar.deserialize(Memory.pStar);
            let cpu = Game.cpu.getUsed() - start;
            logger.log("pStar deserialized", pstar.inst.rooms.getAll().length, "cpu used:", cpu)
        }
        return threadClass.DONE;
    }
    save() {
        logger.log(this.name, "serializing!")
        let start = Game.cpu.getUsed();
        let serialized = pstar.inst.serialize();
        Memory.pStar = serialized;

        let cpu = Game.cpu.getUsed() - start;
        logger.log("serialized length:", serialized.length, "cpu used:", cpu);
        //pstar.inst.edges._debugQueue();

        logger.log("rooms queued to be added", JSON.stringify(pstar.inst.roomAdditionQueue));

        return 10;
    }
}

module.exports = pathManager;
