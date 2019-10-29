var logger = require("screeps.logger");
logger = new logger("pr.role.worker");
//logger.enabled = false;

let processClass = require("INeRT.process");
let threadClass = require("INeRT.thread");

let baseRoleClass = require("pr.role.base");




class worker extends baseRoleClass {

    init() {
        super.init();
        this.roleName = "worker";

        this.requiredParts = {
            WORK: 10,
        }
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