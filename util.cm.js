/*

 */

var logger = require("screeps.logger");
logger = new logger("util.cm");



class pStarCostMatrix extends PathFinder.CostMatrix {
    constructor(roomName, type="default") {
        super();
        this.roomName = roomName;
        this.type = type;
    }

    get id() {
        return this.roomName + "-" + this.type;
    }


}
let cms = new global.utils.array.classes.IndexingCollection("id", ["roomName", "type"], [1000,10000]);
module.exports = {
    /**
     * 
     * @param {*} roomName 
     * @param {*} type 
     * 
     * @returns {pStarCostMatrix}
     */
    getCM: function(roomName, type='default') {
        let id = roomName + "-" + type;
        let cm = cms.getById(id);
        if (!cm) {
            cm = new pStarCostMatrix(roomName, type);
            cms.add(cm);
        }
        return cm;
    },


    /**
     * 
     * @param {pStarCostMatrix} cm 
     * @param {[RoomPosition]} path 
     */
    clearPathFromCM(cm, path) {
        for(let p in path) {
            let pos = path[p];
            cm.set(pos.x, pos.y, 0);
        }
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
}