/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('pr.init');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("pr.pStar");


let processClass = require("INeRT.process");
let threadClass = require("INeRT.thread");


class indexingCollection {
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
        if (!this.thingsById[id]) {
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
        } else {
            //it's already here.. why are you calling this?
            throw new Error("Thing already in collection! -> " + id);
        }
    }

    remove(theThing) {
        let id = _.get(theThing, this.idField);
        if (!this.thingsById[id]) {
            //can't remove what's not there
            throw new Error("Thing already in collection! -> " + id);
            
        } else {
            //remove from id lookup and groups
            delete this.thingsById[id];

            for(let f in this.groupByFields) {
                let fieldPath = this.groupByFields[f];
                let value = _.get(theThing, fieldPath);
                if (this.groups[fieldPath][value]) {
                    _.remove(this.groups[fieldPath][value], id);
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
}


class Node {
    static get BASE() { return "🏠" }
    static get CONTROLLER_OWNED() { return "💡" }
    static get CONTROLLER_RESERVED() { return "🕯️" }
    static get STATIC_RESOURCE() { return "🔌" }
    static get BUILDING() { return "🏢" }
    static get ROOM_EXIT() { return "💨" }
    static get INTERSECTION() { return "🚦" }

    
    static get TYPES() { return [
        Node.BASE,
        Node.CONTROLLER_OWNED,
        Node.CONTROLLER_RESERVED,
        Node.STATIC_RESOURCE,
        Node.BUILDING,
        Node.ROOM_EXIT,
        Node.INTERSECTION
    ] }


    get id() {
        return `${this.pos.x}-${this.pos.y}-${this.pos.roomName}`;
    }
    constructor(pos, type) {
        if (Node.TYPES.indexOf(type) == -1) {
            throw new Error("invalid node type:", type);
        }
        this.pos = pos;
        this.type = type;

        //map of destinationNodeId => edgeObj
        this.edges = {};
    }

    /**
     * 
     * @param {Node} destinationNode 
     */
    addEdge(destinationNode, path, cost) {
        this.edges[destinationNode.id] = new Edge(destinationNode.id, path, cost);
    }

    removeEdge(destinationNode) {
        delete this.edges[destinationNode.id];
    }

    displayNode() {
        global.utils.visual.drawText(this.type, this.pos);
        for(let destinationNodeId in this.edges) {
            let edge = this.edges[destinationNodeId];
            let path = edge.path;
            //logger.log('-------')
            //logger.log(JSON.stringify(path));
            if (!path || path.length == 0) {
                logger.log('no path');
                //new RoomVisual(this.pos.roomName)
                //    .line(this.pos, {color: color, lineStyle: "dashed"});
                continue;
            }
            global.utils.visual.drawPath(path, COLOR_RED);
        }
    }
}

class Edge {
    constructor(destinationNodeId, path, cost) {
        this.destinationNodeId = destinationNodeId;
        this.path = path;
        this.cost = cost;
    }
}

class pStar {
    constructor() {
        this.nodes = new indexingCollection("id", ["pos.roomName", "type"]);
        
    }

    hasNode(node) {
        if (!(node instanceof Node)) {
            throw new Error("Adding invalid Node:", node);
        }
        return this.nodes.has(node);
    }

    addNode(node) {
        if (!(node instanceof Node)) {
            throw new Error("Adding invalid Node:", node);
        }
        this.nodes.add(node);
        this.addNodeEdges(node);
    }

    getNode(nodeId) {
        return this.nodes.getById(nodeId);
    }

    /**
     * 
     * @param {Node} node 
     */
    addNodeEdges(node) {
        switch(node.type) {
            case Node.ROOM_EXIT:
                
                //for every other room exit, if the global range is < 3 or 4 or whatever, connect them.
                //point is to connect room exit nodes on either side of a room exit
                /**
                 * @type {[Node]}
                 */
                let roomExitNodes = this.nodes.getGroupWithValue("type", Node.ROOM_EXIT);
                //logger.log("finding exits for", JSON.stringify(node));
                //logger.log(JSON.stringify(roomExitNodes));
                let thisNodePos = new RoomPosition(node.pos.x, node.pos.y, node.pos.roomName);
                let thisNodeWPos = thisNodePos.toWorldPosition();
                let ourNodes = _.filter(roomExitNodes, (nodeId) => {
                    if (nodeId == node.id) {
                        return false;
                    }
                    let n = this.getNode(nodeId);
                    //logger.log("???", JSON.stringify(n));
                    let nodePos = new RoomPosition(n.pos.x, n.pos.y, n.pos.roomName);
                    let d = thisNodeWPos.getRangeTo(nodePos);
                    //logger.log(d)
                    if (d < 4) {
                        return true;
                    }
                    return false;
                });
                //logger.log(node.pos.roomName, "matching nodes", ourNodes)
                _.each(ourNodes, (nodeId) => {
                    let n = this.getNode(nodeId);
                    let nodePos = new RoomPosition(n.pos.x, n.pos.y, n.pos.roomName);

                    let path = PathFinder.search(node.pos, {pos: nodePos, range: 0}, {maxRooms: 16});
                    //logger.log("-----------------", nodePos, node.pos)
                    //logger.log(JSON.stringify(path))
                    let cost = path.cost;
                    //global.no();
                    node.addEdge(n, path.path, cost);
                    n.addEdge(node, path.path.reverse, cost);
                    logger.log("Adding room node connection!", node.pos.roomName, n.pos.roomName);
                })
                
            default:
                let allNodes = this.nodes.getGroupWithValue("pos.roomName", node.pos.roomName);
                for(let n in allNodes) {
                    let otherNodeId = allNodes[n];
                    let otherNode = this.nodes.getById(otherNodeId);
                    if (node.id == otherNode.id || (node.type == Node.ROOM_EXIT && otherNode.type == Node.ROOM_EXIT)) {
                        //likely best to not connect new nodes to themselves
                        continue;
                    }
                    node.addEdge(otherNode);
                    otherNode.addEdge(node);
                }
                break;
        }
    }

    removeNode(node) {
        if (!(node instanceof Node)) {
            throw new Error("Adding invalid Node:", node);
        }
        this.nodes.remove(node);
    }

    displayNodes() {
        let allNodes = this.nodes.getAll();
        for(let n in allNodes) {
            let node = allNodes[n];
            node.displayNode();
        }
    }
}


class pStarProc extends processClass {
    /**
     * @returns Node
     */
    nodeClass() {
        return Node;
    }
    init() {
        this.pStar = new pStar();
    }
    initThreads() {
        return [
            this.createThread("work", "work"),
            this.createThread("displayNodes", "work")
        ];
    }
    work() {
        logger.log(this.name, "init")
        
        
        
    }

    displayNodes() {
        this.pStar.displayNodes();
    }

    hasNode(node) {
        return this.pStar.hasNode(node);
    }

    addNode(node) {
        this.pStar.addNode(node);
    }

    removeNode(node) {
        this.pStar.removeNode(node);
    }

    addRoomExitNodes(room) {
        //for each edge, grab the exits, group em
        // add a node in the middle of the group, they come back in order, so middle of the array is the middle of the exit segment
        this.addRoomEdgeNodes(room, TOP);
        this.addRoomEdgeNodes(room, LEFT);
        this.addRoomEdgeNodes(room, BOTTOM);
        this.addRoomEdgeNodes(room, RIGHT);
    }

    addRoomEdgeNodes(room, direction) {
        let findTerm = '';
        let dx = 0;
        let dy = 0;
        let byX = true;
        switch (direction) {
            case TOP:
                findTerm = FIND_EXIT_TOP;
                dy = 1;
                break;
            case LEFT:
                findTerm = FIND_EXIT_LEFT;
                dx = 1;
                byX = false;
                break;
            case BOTTOM:
                findTerm = FIND_EXIT_BOTTOM;
                dy = -1;
                break;
            case RIGHT:
                findTerm = FIND_EXIT_RIGHT;
                dx = -1;
                byX = false;
                break;
            default:
                throw new Error("invalid direction!" + direction)
        }
        //right
        let exits = room.find(findTerm);
        let groups = this.groupExits(exits, byX, 7);
        //logger.log('adding exits', room.name, direction, groups.length)
        for(let g in groups) {
            let group = groups[g];
            let centerExit = group[Math.floor(group.length/2)];
            //make exit node one square towards center of room
            //logger.log("adding Node", direction, centerExit.x + dx, centerExit.y + dy, centerExit.roomName )
            let exitNodePos = new RoomPosition(centerExit.x + dx, centerExit.y + dy, centerExit.roomName);
            let node = new Node(exitNodePos, Node.ROOM_EXIT);
            if (!this.hasNode(node)) {
                this.addNode(node);
            }
            
        }
    }

    groupExits(exits, byX = true, lengthLimit = 0) {
        let field = byX ? "x" : "y";
        exits = _.sortBy(exits, [field]);
        //logger.log('----', JSON.stringify(exits))
        let exitGroups = [];
        let currentGroup = 0;
        
        let currentLoc = 0;
        //step through exits and compare the last exit's x/y value + 1 to this exit's x/y value, 
        //if they don't match, there's a break, make a new array and start adding to that.
        //do the same when the current array is over the limit
        for(let e in exits) {
            let exit = exits[e];
            if(currentLoc == 0) {
                //if this is the first exit, create the first group
                exitGroups[currentGroup] = [];
                //store current loc and increment
                currentLoc = exit[field];

            }
            //logger.log("checking", exit, currentLoc)
            if (exit[field] != currentLoc || exitGroups[currentGroup].length >= lengthLimit) {
                //there's a break!
                currentGroup++;
                exitGroups[currentGroup] = [];
                currentLoc = exit[field];
            }
            exitGroups[currentGroup].push( exit );
            currentLoc++;
        }
        return exitGroups;
    }
}



module.exports = pStarProc;