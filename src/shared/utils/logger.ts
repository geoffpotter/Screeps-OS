import { SourceMapConsumer } from 'source-map'

var colorMap:string[] = [];
colorMap[COLOR_RED] = "#ff0000";
colorMap[COLOR_PURPLE] = "#800080";
colorMap[COLOR_BLUE] = "#0000ff";
colorMap[COLOR_CYAN] = "#00ffff";
colorMap[COLOR_GREEN] = "#008000";
colorMap[COLOR_YELLOW] = "#ffff00";
colorMap[COLOR_ORANGE] = "#ffa500";
colorMap[COLOR_BROWN] = "#8b4513";
colorMap[COLOR_GREY] = "#808080";
colorMap[COLOR_WHITE] = "#ffffff";
export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG'
}

interface SourcePosition {
    fileName: string;
    lineNumber: number;
    column: number;
}

interface CallSite {
    fileName?: string;
    lineNumber?: number;
    column?: number;
}

let sourceMapConsumer: SourceMapConsumer = new SourceMapConsumer(require("main.js.map"));

export default class Logger {
    private group: string;
    enabled: boolean;
    color: number | string;
    private static logLevels: Map<string, LogLevel> = new Map();
    private static defaultLogLevel: LogLevel = LogLevel.INFO;
    private static callerCache: Map<string, CallSite> = new Map();
    private static lastCacheTick: number = 0;

    constructor(group: string, color: number | string = COLOR_WHITE) {
        this.group = group;
        this.enabled = true;
        this.color = color;
    }

    private getOriginalPosition(line: number, column: number): SourcePosition | null {
        try {
            const original = sourceMapConsumer.originalPositionFor({
                line,
                column
            });

            if (!original.source || !original.line) return null;

            return {
                fileName: original.source.split('/').pop() || '',
                lineNumber: original.line,
                column: original.column || 0
            };
        } catch (e) {
            return null;
        }
    }

    private getCallerInfo(): CallSite {
        if (Game.time !== Logger.lastCacheTick) {
            Logger.callerCache.clear();
            Logger.lastCacheTick = Game.time;
        }

        const err = new Error();
        const stack = err.stack?.split('\n');
        if (!stack || stack.length < 4) return {};

        // Look for the first non-logger call in the stack
        let callerLine = '';
        for (let i = 3; i < stack.length; i++) {
            if (!stack[i].includes('at Logger')) {
                callerLine = stack[i];
                break;
            }
        }
        // console.log("---------", callerLine)
        if (!callerLine) return {};

        const cached = Logger.callerCache.get(callerLine);
        if (cached) return cached;

        const match = callerLine.match(/\((.*):(\d+):(\d+)\)$/);
        if (!match) return {};

        const info: CallSite = {
            fileName: match[1].split('/').pop(),
            lineNumber: parseInt(match[2]),
            column: parseInt(match[3])
        };

        Logger.callerCache.set(callerLine, info);
        return info;
    }

    private formatMessage(args: unknown[]): string {
        const timestamp = Game.time;
        const callSite = this.getCallerInfo();

        let locationStr = '';
        if (callSite.fileName && callSite.lineNumber && callSite.column) {
            const originalPos = this.getOriginalPosition(
                callSite.lineNumber,
                callSite.column
            );

            if (originalPos) {
                locationStr = `[${originalPos.fileName}:${originalPos.lineNumber}]`;
            } else {
                locationStr = `[${callSite.fileName}:${callSite.lineNumber}]`;
            }
        }

        const prefix = `[${timestamp}] ${locationStr}> `;
        return prefix + args.map(arg =>
            (typeof arg === 'object') ? JSON.stringify(arg) : String(arg)
        ).join(' ');
    }

    // Add static method to set global log level
    public static setLogLevel(level: LogLevel): void {
        Logger.defaultLogLevel = level;
    }

    private shouldLog(level: LogLevel): boolean {
        if (!this.enabled) return false;

        const levels: LogLevel[] = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG];
        const levelIndex = levels.indexOf(level);

        // Check group level first
        const groupLevel = Logger.logLevels.get(this.group);
        if (groupLevel) {
            return levelIndex <= levels.indexOf(groupLevel);
        }

        // Fall back to default level
        return levelIndex <= levels.indexOf(Logger.defaultLogLevel);
    }

    private colorize(line: string, color: number | string): string {
        const htmlColor = typeof color === 'number' ? colorMap[color] : color;
        return `<span style='color:${htmlColor}'>${line}</span>`;
    }

    public log(...args: unknown[]): void {
        this.info(args)
    }
    public info(...args: unknown[]): void {
        if (!this.shouldLog(LogLevel.INFO)) return;
        const line = this.formatMessage(args);
        console.log(this.colorize(line, this.color));
    }

    public warn(...args: unknown[]): void {
        if (!this.shouldLog(LogLevel.WARN)) return;
        const line = this.formatMessage(args);
        console.log(this.colorize(line, COLOR_YELLOW));
    }

    public error(...args: unknown[]): void {
        if (!this.shouldLog(LogLevel.ERROR)) return;
        const line = this.formatMessage(args);
        console.log(this.colorize(line, COLOR_RED), "\n", new Error().stack);
    }

    public debug(...args: unknown[]): void {
        if (!this.shouldLog(LogLevel.DEBUG)) return;
        const line = this.formatMessage(args);
        console.log(this.colorize(line, COLOR_GREY));
    }

    // Synchronous versions for when you don't need source mapping
    public infoSync(...args: unknown[]): void {
        if (!this.shouldLog(LogLevel.INFO)) return;
        const line = this.formatMessage(args);
        console.log(this.colorize(line, this.color));
    }

    // Static method to set log level for a group
    public static setGroupLevel(group: string, level: LogLevel): void {
        this.logLevels.set(group, level);
    }

    // Static method to set default log level
    public static setDefaultLogLevel(level: LogLevel): void {
        this.defaultLogLevel = level;
    }
}
