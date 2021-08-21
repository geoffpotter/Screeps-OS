var logger = require("screeps.logger");
logger = new logger("pr.role.worker");
//logger.enabled = false;

let processClass = require("INeRT.process");
let threadClass = require("INeRT.thread");

let baseRoleClass = require("pr.role.base");



let actionTypes = global.utils.action.classes.actionTypes;
let actionOptIn = global.utils.action.classes.actionOptIn;


class worker extends baseRoleClass {

    init() {
        super.init();
        this.roleName = "worker";

        this.requiredParts = {
            WORK: 10,
        }


        let defaultRange = 150;
        this.actionOptIns = [
            new actionOptIn(actionTypes.PICKUP, defaultRange, 1),
            new actionOptIn(actionTypes.MINE, defaultRange, 1),
            new actionOptIn(actionTypes.DROPOFF_SPAWN, defaultRange, 1),
            new actionOptIn(actionTypes.PRAISE, defaultRange, 1),
        ];
    }

    initThreads() {
        let parentThreads = super.initThreads();
        return parentThreads.concat([
            this.createThread("initTick", "init")
        ])
    }

    initTick() {
        logger.log('in worker init tick')
    }
}

module.exports = worker;