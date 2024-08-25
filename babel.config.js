'use strict'
/**
babel.config.js with useful plugins. 
*/
module.exports = function(api) {
  api.cache(true);

  const presets = [
                    [
                      "@babel/preset-env", {
                        modules: false,
                        //
                        useBuiltIns: "entry",
                        //debug:true,
                        include: [
                          //"transform-async-to-generator"
                        ],
                        "targets": {
                          //"esmodules": true,
                          "node":"10"
                        }
                      }
                    ]
                  ];
  const plugins = [
    //['@babel/plugin-transform-modules-commonjs'],
    //["@babel/plugin-transform-arrow-functions", { "spec": false }],
    // ["babel-plugin-transform-async-to-promises"],
    // ["@babel/plugin-proposal-decorators", {
    //   decoratorsBeforeExport: true, 
    //   //legacy:true
    // }],
    // [
    //   "@babel/plugin-transform-runtime",
    //   {
    //     "regenerator": true,
    //     "helpers": false
    //   }
    // ]
  ];

  return {
    presets,
    plugins
  }
}