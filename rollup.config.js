"use strict";

import clear from "rollup-plugin-clear";
import resolve, { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "rollup-plugin-typescript2";
import fg from "fast-glob";
import screeps from 'rollup-plugin-screeps';
import babel from '@rollup/plugin-babel';
import fixGlobals from 'rollup-plugin-node-globals';
import includePaths from 'rollup-plugin-includepaths'

let targetBot = "";
for (let i = 0; i < process.argv.length; i++) {
  if (process.argv[i] === "--config-") {
    targetBot = process.argv[i + 1];
    break;
  }
}

let cfg;
const dest = process.env.DEST;
if (!dest) {
  console.log("No destination specified - code will be compiled but not uploaded");
} else if ((cfg = require("./screeps.json")[dest]) == null) {
  throw new Error("Invalid upload destination");
}
console.log("cfg", cfg)

const screepsExternals = ["game", "game/prototypes", "game/constants", "game/utils", "game/path-finder", "arena", "game/visual"];

function getOptions(botSrc) {
  const outDir = botSrc.replace("src/", "dist/");
  let mainFileName = fg.sync(`${botSrc}/main.*`, { onlyFiles: true });
  console.log(mainFileName)
  const options = {
    input: `${mainFileName}`,
    external: screepsExternals, // <-- suppresses the warning
    output: {
      // dir: outDir,
      file: outDir + "/main.js",
      format: "cjs",
      entryFileNames: "[name].js",
      
      sourcemap:  true,
      // preserveModules: true,
      // preserveModulesRoot: botSrc,
      paths: path => {     
        console.log("processing path", path)   
        // https://rollupjs.org/guide/en/#outputpaths
        // TS requires that we use non-relative paths for these "ambient" modules
        // The game requires relative paths, so prefix all game modules with "/" in the output bundle
        if (path.startsWith("game") || path.startsWith("arena")) {
          return "/" + path;
        }
      }
    },

    plugins: [
      fixGlobals(),
      clear({ targets: targetBot === "" ? ["dist"] : [outDir] }), // If targeted build, only clear target sub-directory
      //need this to resolve relative local paths
      includePaths({
        include: {},
        paths: [botSrc, "src/shared"],
        extensions: ['.js', '.json', '.ts']
      }),
      //guessing I don't need this.. but it may let me bring in node modules
      nodeResolve({
          module: true,
          jsnext: true,
          main: true,
          preferBuiltins: false,

          moduleDirectories: [
            "node_modules",
            // "src/shared"
          ],
          rootDir: "src"
      }),
      resolve({ rootDir: "src"}),
      commonjs({ 
        include: ["src/**"], 
        transformMixedEsModules: true,

      }),
      typescript({ tsconfig: "./tsconfig.json" }),
      babel({ babelHelpers: 'bundled' }),
      screeps({config: cfg, dryRun: cfg == null})
    ]
  };
  return options;
}

console.log("Building for target:", targetBot);

const bot = fg.sync(`src/*world_*${targetBot}*`, { onlyDirectories: true });
if (bot.length === 0) {
  throw new Error("No matching bots found in src/. Exiting");
} else {
  if (targetBot === "") {
    console.log(`No bot targeted. Building all ${bot.length} bots.`);
  } else {
    console.log(`Buidling ${bot.length} bot(s) for target "${targetBot}"`);
  }
}

export default bot.map(getOptions);

