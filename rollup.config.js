  
"use strict";

import clean from "rollup-plugin-clean";
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { babel } from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: "src/test.js",
  output: {
    file: "build/main.js",
    sourcemap: false,
    format: "cjs"
  },

  plugins: [
    clean({targets: ["buid", "dist"]}),
    nodeResolve({
        module: true,
        jsnext: true,
        main: true,
        preferBuiltins: false,
    }),
    commonjs({
        include: 'node_modules/**',  // Default: undefined
        ignoreGlobal: false,  // Default: false
    }),
    babel({
        babelHelpers: 'bundled',
        //exclude: './node_modules/**',
        "presets": [
          [
            "@babel/preset-env",
            {
              "targets": {
                "node": "10"
              },
              modules: "commonjs",
            }
          ]
        ],
        "plugins": [

            ["@babel/plugin-transform-arrow-functions", { "spec": false }]
        ],
      })
  ]
}