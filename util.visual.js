/*

 */

var logger = require("screeps.logger");
logger = new logger("util.visual");




module.exports = {
    hexColor: function(number) {
        let h = Number(number).toString(16);
        if (h.length==1) h = "0" + h;
        return h;
    },
    rgbColor: function(r, g, b) {
        let red = this.hexColor(r);
        let green = this.hexColor(g);
        let blue = this.hexColor(b);
        return red + green + blue;
    },

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
        var charMap = {}
        charMap[TOP] ="⬆";
        charMap[TOP_LEFT] = "↖";
        charMap[TOP_RIGHT] = "↗";
        
        charMap[LEFT] = "⬅";
        charMap[RIGHT] ="➡";
        charMap[BOTTOM] = "⬇";
        charMap[BOTTOM_LEFT] ="↙";
        charMap[BOTTOM_RIGHT] = "↘";
        
        for (var roomName in flow) {
            if (!roomVisuals[roomName]) {
                roomVisuals[roomName] = new RoomVisual(roomName)
            }
            var visual = roomVisuals[roomName];
            for(var x in flow[roomName]) {
                for(var y in flow[roomName][x]) {
                    var pos = new RoomPosition(x, y, roomName);
                    var dir = flow[roomName][x][y];

                    
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

    drawPath: function(path, color, styleOverride = false) {
        if (!color) {
            color = "orange"
        }
        let style = {color: color, lineStyle: "dashed"};
        if (!!styleOverride) {
            for(let field in styleOverride) {
                style[field] = styleOverride[field];
            }
        }
        
        var charMap = {};
        charMap[TOP] ="⬆";
        charMap[TOP_LEFT] = "↖";
        charMap[TOP_RIGHT] = "↗";
        
        charMap[LEFT] = "⬅";
        charMap[RIGHT] ="➡";
        charMap[BOTTOM] = "⬇";
        charMap[BOTTOM_LEFT] ="↙";
        charMap[BOTTOM_RIGHT] = "↘";

        let lastPosition = path[0];
        for (let position of path) {
            if (lastPosition == position) {
                global.utils.visual.drawText("*", lastPosition, color, style);
            } else if (position.roomName === lastPosition.roomName) {
                let direction = lastPosition.getDirectionTo(position);
                global.utils.visual.drawText(charMap[direction], lastPosition, color, style);
                // new RoomVisual(position.roomName)
                //     .line(position, lastPosition, style);
         
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
        
    
    },
    drawTextLines: function(textArr, basePos) {
        var viz = new RoomVisual(basePos.roomName);
        //logger.enabled = true;
        var yS = basePos.y;
        var lines = textArr;
        if (!_.isArray(textArr)) {
            lines = textArr.split("\n");
        }
        
        for(var i in lines) {
            var s = lines[i];
            viz.text(s, basePos.x, yS + i*1, {align:"left"});
        }
        
    
    },
    drawText: function(t, pos, color="#fff", style={}) {
        style.color = color;
        new RoomVisual(pos.roomName).text(t,pos.x-0.0, pos.y, style);
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