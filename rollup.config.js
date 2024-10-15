"use strict";

//@ts-ignore
import clear from "rollup-plugin-clear";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "rollup-plugin-typescript2";
import fg from "fast-glob";
import screeps from 'rollup-plugin-screeps';
import babel from '@rollup/plugin-babel';
import replace from '@rollup/plugin-replace';
//@ts-ignore
import fixGlobals from 'rollup-plugin-node-globals';

import includePaths from 'rollup-plugin-includepaths';
import inject from '@rollup/plugin-inject';
import path from 'path';



let targetBot = "";
for (let i = 0; i < process.argv.length; i++) {
  if (process.argv[i] === "--config-") {
    targetBot = process.argv[i + 1];
    break;
  }
}

/**
 * @type {null}
 */
let cfg;
const dest = process.env.DEST;
if (!dest) {
  console.log("No destination specified - code will be compiled but not uploaded");
} else if ((cfg = require("./screeps.json")[dest]) == null) {
  throw new Error("Invalid upload destination");
}
console.log("cfg", cfg)

const screepsExternals = ["game", "game/prototypes", "game/constants", "game/utils", "game/path-finder", "arena", "game/visual"];

/**
 * @param {string} botSrc
 */
function getOptions(botSrc) {
  const outDir = botSrc.replace("src/", "dist/");
  let mainFileName = fg.sync(`${botSrc}/main.*`, { onlyFiles: true });
  console.log('main filename:', mainFileName)
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
    },

    plugins: [
      fixGlobals(),
      clear({ targets: targetBot === "" ? ["dist"] : [outDir] }), // If targeted build, only clear target sub-directory
      replace({
        preventAssignment: true,
        values: {
          "_SOURCE_MAPS_": function() {
            console.log("building source maps")
            // let inputs = grunt.file.expand({ filter: 'isFile'}, "shared/**/sourceMaps.js");
            // let output = inputs[0].replace("src","");//String(inputs[0]).replace("src","");

            let mapFiles = fg.sync(botSrc + "/**/*.map");
            let mapFileBlocks = [];
            for(let i in mapFiles) {
              let mapFile = mapFiles[i].replace(".js.map", ".map");
              let file = path.basename(mapFile).replace(".map", "");
              let mapBlock = `
"${file}_inst":null,
"${file}": function() {
if(!this.${file}_inst) {
this.${file}_inst = require("${mapFile.replace(outDir + "/", "")}");
}
return this.${file}_inst
},`;
  mapFileBlocks.push(mapBlock);
            }
            let sourceMapCode = `
${mapFileBlocks.join("")}
`

            return sourceMapCode;
          }
        }
      }),
      //need this to resolve relative local paths
      includePaths({
        include: {},
        paths: [botSrc, "src/shared"],
        extensions: ['.js', '.json', '.ts']
      }),
      //guessing I don't need this.. but it may let me bring in node modules
      resolve({
          module: true,
          jsnext: true,
          main: true,
          preferBuiltins: false,
          // browser: true,
          rootDir: "src"
      }),
      // resolve({ rootDir: "src"}),
      commonjs({
        include: ["src/**", 'node_modules/**'],
        transformMixedEsModules: true,
        esmExternals: true,
        requireReturnsDefault: 'auto',
        ignoreGlobal: true,
      }),
      typescript({ tsconfig: "./tsconfig.json" }),
      // inject({
      //   Promise: path.resolve('src/shared/polyfills/Promise.ts'),
      //   // setInterval: path.resolve('src/shared/polyfills/setInterval.ts'),
      //   // setTimeout: path.resolve('src/shared/polyfills/setTimeout.ts'),
      // }),
      babel({ babelHelpers: 'bundled' }),
      screeps({config: cfg, dryRun: cfg == null})
    ]
  };
  return options;
}

console.log("Building for target:", targetBot);

const bot = fg.sync(`src/world_${targetBot}`, { onlyDirectories: true });
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

