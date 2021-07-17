'use strict'
/**
babel.config.js with useful plugins. 
*/
module.exports = function(api) {
  api.cache(true);

  const presets = [
                    [
                      "@babel/preset-env", {
                        "targets": {
                          "esmodules": true,
                          "node":true
                        }
                      }
                    ]
                  ];
  const plugins = [
    ['@babel/plugin-transform-modules-commonjs'],
    ["@babel/plugin-transform-arrow-functions", { "spec": false }]

  ];

  return {
    presets,
    plugins
  }
}