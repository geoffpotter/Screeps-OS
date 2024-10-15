import { builtInQueues } from "shared/polyfills/tasks";
import { setInterval } from "shared/polyfills/setInterval";
import Logger from "shared/utils/logger";


const logger = new Logger("util.visual");


let roomPositionsUsedThisTick: {
    [roomName: string]: {
        [x: number]: {
            [y: number]: boolean
        }
    }
} = {};
setInterval(() => {
  roomPositionsUsedThisTick = {};
}, 1, builtInQueues.START_TICK);


export default {
    hexColor(number: number): string {
        number = Math.max(0, Math.min(255, number));
        let h = number.toString(16);
        if (h.length === 1) h = "0" + h;
        return h;
    },

    rgbColor(r: number, g: number, b: number): string {
        const red = this.hexColor(r);
        const green = this.hexColor(g);
        const blue = this.hexColor(b);
        return red + green + blue;
    },

    /**
     * Draw a circle at position
     * @param pos - The position to draw the circle
     * @param color - The color of the circle
     * @param opacity - The opacity of the circle (default: 1)
     * @param radius - The radius of the circle (default: 0.45)
     */
    circle(pos: RoomPosition, color: string, opacity = 1, radius = 0.45): void {
        new RoomVisual(pos.roomName).circle(pos, {
            radius,
            fill: "transparent",
            stroke: color,
            strokeWidth: 0.15,
            opacity
        });
    },

    drawFlowField(dest: RoomPosition, flow: Record<string, Record<string, Record<string, DirectionConstant>>>): void {
        this.circle(dest, "red");
        const roomVisuals: Record<string, RoomVisual> = {};

        const charMap: Record<DirectionConstant, string> = {
            [TOP]: "⬆",
            [TOP_LEFT]: "↖",
            [TOP_RIGHT]: "↗",
            [LEFT]: "⬅",
            [RIGHT]: "➡",
            [BOTTOM]: "⬇",
            [BOTTOM_LEFT]: "↙",
            [BOTTOM_RIGHT]: "↘"
        };

        for (const roomName in flow) {
            if (!roomVisuals[roomName]) {
                roomVisuals[roomName] = new RoomVisual(roomName);
            }
            const visual = roomVisuals[roomName];
            for (const x in flow[roomName]) {
                for (const y in flow[roomName][x]) {
                    const pos = new RoomPosition(parseInt(x), parseInt(y), roomName);
                    const dir = flow[roomName][x][y];
                    visual.text(charMap[dir], pos.x, pos.y + 0.3, { color: 'red', font: 0.8 });
                }
            }
        }
    },

    /**
     * Serialize a path, traveler style. Returns a string of directions.
     * @param path - The path to draw
     * @param color - The color of the path (default: "orange")
     * @param styleOverride - Optional style overrides
     */
    drawPath(path: RoomPosition[], color = "orange", styleOverride: Partial<LineStyle> = {}): void {
        let style: LineStyle = { color, lineStyle: "dashed" };
        Object.assign(style, styleOverride);

        const charMap: Record<DirectionConstant, string> = {
            [TOP]: "⬆",
            [TOP_LEFT]: "↖",
            [TOP_RIGHT]: "↗",
            [LEFT]: "⬅",
            [RIGHT]: "➡",
            [BOTTOM]: "⬇",
            [BOTTOM_LEFT]: "↙",
            [BOTTOM_RIGHT]: "↘"
        };

        let lastPosition = path[0];
        for (const position of path) {
            if (lastPosition.isEqualTo(position)) {
                this.drawText("*", lastPosition, color, style);
            } else if (position.roomName === lastPosition.roomName) {
                const direction = lastPosition.getDirectionTo(position);
                this.drawText(charMap[direction], lastPosition, color, style, true);
            }
            lastPosition = position;
        }
    },

    drawTextWall(text: string, basePos: RoomPosition): void {
        const viz = new RoomVisual(basePos.roomName);
        const lines = text.split("\n");
        lines.forEach((s, i) => {
            viz.text(s, basePos.x, basePos.y + i, { align: "left" });
        });
    },

    drawTextLines(textArr: string[] | string, basePos: RoomPosition): void {
        const viz = new RoomVisual(basePos.roomName);
        const lines = Array.isArray(textArr) ? textArr : textArr.split("\n");
        lines.forEach((s, i) => {
            viz.text(s, basePos.x, basePos.y + i, { align: "left" });
        });
    },

    drawText(t: string, pos: RoomPosition, color = "#fff", style: LineStyle = {}, ignorePosition = true): void {
        if (!ignorePosition) {
            if (!roomPositionsUsedThisTick[pos.roomName]) {
                roomPositionsUsedThisTick[pos.roomName] = {};
            }
            if (!roomPositionsUsedThisTick[pos.roomName][pos.x]) {
                roomPositionsUsedThisTick[pos.roomName][pos.x] = [];
            }
            // logger.log("Drawing text", t, pos, roomPositionsUsedThisTick[pos.x][pos.y]);
            while(roomPositionsUsedThisTick[pos.roomName][pos.x][pos.y]) {
                pos = pos.moveInDir(BOTTOM);
                // logger.log("Moving down", pos);
            }
        }
        style.color = color;
        new RoomVisual(pos.roomName).text(t, pos.x, pos.y, style);
        if (!ignorePosition) {
            roomPositionsUsedThisTick[pos.roomName][pos.x][pos.y] = true;
        }
    },

    drawCross(t: string, pos: RoomPosition, style: LineStyle): void {
        if (!pos) return;
        const v = new RoomVisual(pos.roomName);
        v.text(t, pos.x, pos.y);
        v.line(pos.x - 0.5, pos.y, pos.x + 0.5, pos.y, style);
        v.line(pos.x, pos.y - 0.5, pos.x, pos.y + 0.5, style);
    }
};
