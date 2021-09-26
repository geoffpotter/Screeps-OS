import { escape } from "shared/polyfills/FakeDash";
import { SourceMapConsumer } from "source-map";
import sourceMaps from "./sourceMaps"
export class ErrorMapper {
  // Cache consumer
  private static _consumer: Map<String, SourceMapConsumer> = new Map();

  public static getConsumer(file: string): SourceMapConsumer | false {
    if (!this._consumer.has(file)) {
      if (!sourceMaps[file]) {
        return false;
      }
      let fileMapData = sourceMaps[file]();
      this._consumer.set(
        file,
        new SourceMapConsumer(fileMapData)
      );
    }
    //@ts-ignore ts doesn't understand above will mean file is in _consumer
    return this._consumer.get(file);
  }

  // Cache previously mapped traces to improve performance
  public static cache: { [key: string]: string } = {};

  /**
  * Generates a stack trace using a source map generate original symbol names.
  *
  * WARNING - EXTREMELY high CPU cost for first call after reset - >30 CPU! Use sparingly!
  * (Consecutive calls after a reset are more reasonable, ~0.1 CPU/ea)
  *
  * @param {Error | string} error The error or original stack trace
  * @returns {string} The source-mapped stack trace
  */
  public static sourceMappedStackTrace(error: Error | string): string {
    const stack: string = error instanceof Error ? (error.stack as string) : error;

    if (Object.prototype.hasOwnProperty.call(this.cache, stack)) {
      return this.cache[stack];
    }

    // eslint-disable-next-line no-useless-escape
    const re = /^\s+at\s+(.+?\s+)?\(?([0-z._\-\\\/]+):(\d+):(\d+)\)?$/gm;
    let match: RegExpExecArray | null;
    let outStack = error.toString();
    while ((match = re.exec(stack))) {
      const fileMap = this.getConsumer(match[2]);
      if (fileMap) {

        const pos = fileMap.originalPositionFor({
          column: parseInt(match[4], 10),
          line: parseInt(match[3], 10)
        });
        if (pos.line != null) {
          if (pos.name) {
            outStack += `\n at ${pos.name} (${pos.source}:${pos.line}:${pos.column})`;
          } else {
            if (match[1]) {
              // no original source file name known - use file name from given trace
              outStack += `\n at ${match[1]} (${pos.source}:${pos.line}:${pos.column})`;
            } else {
              // no original source file name known or in given trace - omit name
              outStack += `\n at ${pos.source}:${pos.line}:${pos.column}`;
            }
          }
        } else {
          // no known position
          outStack += `\n${match[0]}`;
        }
      } else {
        outStack += `\n${match[0]}`;
      }
    }

    this.cache[stack] = outStack;
    return outStack;
  }

  public static wrapLoop(loop: () => void): () => void {
    return () => {
      try {
        loop();
      } catch (e) {
        if (e instanceof Error) {
          if ("sim" in Game.rooms) {
            const message = `Source maps don't work in the simulator - displaying original error`;
            console.log(`<span style='color:red'>${message}<br>${escape(e.stack)}</span>`);
          } else {
            try {
              let start = Game.cpu.getUsed();
              console.log(`<span style='color:red'>${escape(this.sourceMappedStackTrace(e))}</span>`);
              console.log("cpu used:", Game.cpu.getUsed() - start)
            } catch (e2) {
              //we suck.
              throw e2;
            }
          }
        } else {
          // can't handle it
          throw e;
        }
      }
    };
  }
}
