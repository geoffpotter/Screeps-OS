let logger = import screeps.logger;
logger = new logger("pr.actionManager");
//logger.color = COLOR_GREY;

let processClass = import INeRT.process;
let threadClass = import INeRT.thread;

let IndexingCollection = global.utils.array.classes.IndexingCollection

let intelClass = import pr.intel;

let baseAction = global.utils.action.classes.baseAction;
let actionOptIn = global.utils.action.classes.actionOptIn;

let Node = global.utils.pStar.classes.Node;

class actionManager extends processClass {
    init() {
        this.actions = new IndexingCollection("id", ["actionType", "pos.roomName"], [1000000,1000000])
    }



    hasAction(actionId) {
        return this.actions.hasId(actionId);
    }
    getActionById(actionId) {
        if (!this.actions.hasId(actionId)) {
            throw new Error("getting action that doesn't exist")
        }

        return this.actions.getById(actionId);
    }
    getAction(action) {
        if (!this.actions.has(action)) {
            throw new Error("getting action that doesn't exist")
        }

        return this.actions.getById(action.id);
    }

    addAction(action) {
        if (this.actions.has(action)) {
            throw new Error("action already exists");
        }

        //create a node for this action
        let node = new Node(action.pos, Node.STATIC_RESOURCE);
        if (!global.utils.pStar.inst.hasNode(node)) {
            global.utils.pStar.inst.addNode(node);
        }
        this.actions.add(action);
    }

    removeAction(action) {
        if (!this.actions.has(action)) {
            throw new Error("trying to delete actiont that doesn't exist, wtf")
        }

        this.actions.remove(action);
    }

    /**
     * get all actions of the given types
     * @param {actionOptIn[]} actionOptIns 
     */
    getActions(actionOptIns, minAmountRemaining, pos) {
        let start = Game.cpu.getUsed();
        let log = (...args) => {
            let usedNow = Game.cpu.getUsed();
            let used = usedNow - start;
            logger.log("cpu used:", used, ...args);
            start = usedNow;
        }

        let requestedActions = [];
        
        for(let t in actionOptIns) {
            let optIn = actionOptIns[t];
            if (!optIn) {
                throw new Error("invalid action type")
            }
            //log("starting option type:" + actionType)
            let actions = this.actions.getGroupWithValue("actionType", optIn.actionType);
            //log('got actions:' + actions.length)
            for(let a in actions) {
                let actionId = actions[a];
                /** @type {baseAction} */
                let action = this.actions.getById(actionId);
                //log("got action")
                let addIt = true;
                if (minAmountRemaining !== false) {
                    //logger.log(pos, action);
                    if (action.amountRemainingByPriorityAndPos(optIn.priority, pos) <= minAmountRemaining) {
                        addIt = false;
                    }
                }

                if (addIt) {
                    requestedActions.push(action);
                }
                //log("action done")
            }
            //log("Done " + actionType);
        }
        return requestedActions;
    }
    


    initThreads() {
        return [
            this.createThread("tickInit", "init"),
            this.createThread("display", "work")
        ]
    }
    tickInit() {
        logger.log("in tick init")
    }

    display() {
        this.actions.forEach((a) => {
            a.display();
        })
    }
}

export default actionManager;