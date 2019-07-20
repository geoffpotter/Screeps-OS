/*

 */

var logger = require("screeps.logger");
logger = new logger("util.visual");




module.exports = {
   /**
     * draw a circle at position
     * @param pos
     * @param color
     * @param opacity
     */

    circle: function(pos, color, opacity, radius) {
        if (!radius) 
            radius = .45;
        if (!opacity)
            opacity = 1;
        new RoomVisual(pos.roomName).circle(pos, {
            radius: radius, fill: "transparent", stroke: color, strokeWidth: .15, opacity: opacity});
    },
    
    drawFlowField: function(dest, flow) {
        this.circle(dest, "red");
        var roomVisuals = {};
        //logger.log(JSON.stringify(flow))
        for (var roomName in flow) {
            if (!roomVisuals[roomName]) {
                roomVisuals[roomName] = new RoomVisual(roomName)
            }
            var visual = roomVisuals[roomName];
            for(var x in flow[roomName]) {
                for(var y in flow[roomName][x]) {
                    var pos = new RoomPosition(x, y, roomName);
                    var dir = flow[roomName][x][y];
                    var charMap = {}
                    charMap[TOP] ="⬆";
                    charMap[TOP_LEFT] = "↖";
                    charMap[TOP_RIGHT] = "↗";
                    
                    charMap[LEFT] = "⬅";
                    charMap[RIGHT] ="➡";
                    charMap[BOTTOM] = "⬇";
                    charMap[BOTTOM_LEFT] ="↙";
                    charMap[BOTTOM_RIGHT] = "↘";
                    
                    //logger.log('here', roomName, x, y, dir, LEFT, charMap[dir], visual.circle)
                    //visual.circle(pos, {fill: 'transparent', radius: 0.55, stroke: 'red'})
                    visual.text(charMap[dir], pos.x, pos.y+0.3, {color: 'red', font: 0.8});
                }
            }
        }
    },
    
    /**
     * serialize a path, traveler style. Returns a string of directions.
     * @param startPos
     * @param path
     * @param color
     * @returns {string}
     */

    drawPath: function(path, color) {
        if (!color) {
            color = "orange"
        }
    
        let lastPosition = path[0];
        this.circle(lastPosition, color);
        for (let position of path) {
            if (position.roomName === lastPosition.roomName) {
                new RoomVisual(position.roomName)
                    .line(position, lastPosition, {color: color, lineStyle: "dashed"});
         
            }
            lastPosition = position;
        }
    },
    drawTextWall: function(text, basePos) {
        var viz = new RoomVisual(basePos.roomName);
        //logger.enabled = true;
        var yS = basePos.y;
        var lines = text.split("\n");
        for(var i in lines) {
            var s = lines[i];
            viz.text(s, basePos.x, yS + i*1, {align:"left"});
        }
        //logger.log(this.roomName, status);
        
    
    },
    drawText: function(t, pos) {
        new RoomVisual(pos.roomName).text(t,pos.x-0.0, pos.y);
    },
    drawCross: function(t, pos, style) {
        if (!pos) 
            return;
        var v = new RoomVisual(pos.roomName);
        v.text(t,pos.x-0.0, pos.y)
        v.line(pos.x-0.5, pos.y, pos.x+0.5, pos.y, style);
        v.line(pos.x, pos.y-0.5, pos.x, pos.y+0.5, style);
    }
}