var logger = require("screeps.logger");
logger = new logger("pr.role.miner");
//logger.enabled = false;

let processClass = require("INeRT.process");
let threadClass = require("INeRT.thread");

let baseRoleClass = require("pr.role.base");



let actionTypes = global.utils.action.classes.actionTypes;
let actionOptIn = global.utils.action.classes.actionOptIn;

class miner extends baseRoleClass {

    init() {
        super.init();
        this.roleName = "miner";

        this.requiredParts = {
            WORK: 8,
        }


        let defaultRange = 150;
        this.actionOptIns = [
            new actionOptIn(actionTypes.MINE, defaultRange, 2, (creep, action) => {
                return action.targetId == this.data.sourceId
            }),
            new actionOptIn(actionTypes.DROP, 1, 1)
        ];
        this.maxCreepCount = this.data.pos.getSurroundingClearSpaces().length;
        this.creepClass = "miner";
        this.spawnPriority = 1;
        this.priorityIncresePerCreep = 2;
    }

    initThreads() {
        let parentThreads = super.initThreads();
        return parentThreads.concat([
            this.createThread("initTick", "init")
        ])
    }

    initTick() {
        logger.log('in miner init tick')
    }
}

module.exports = miner;