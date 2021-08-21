var path = require("path");

var clean = require( "rollup-plugin-clean");
var nodeResolve = require('@rollup/plugin-node-resolve').default;
var commonjs = require('@rollup/plugin-commonjs');

var includePaths = require('rollup-plugin-includepaths');
var replace = require('@rollup/plugin-replace');
var fixGlobals = require("rollup-plugin-node-globals");
var typescript = require('@rollup/plugin-typescript');
var babel = require('@rollup/plugin-babel').default;
var inject = require('@rollup/plugin-inject');

const screepsExternals = [
  "game", "game/prototypes", "game/constants", "game/utils", "game/path-finder", "arena",
  "/game", "/game/prototypes", "/game/constants", "/game/utils", "/game/path-finder", "/arena"
]

module.exports = function (grunt) {
  require('time-grunt')(grunt);

  // Pull defaults (including username and password) from .screeps.json
  var config = require('./.screeps.json')

  
  grunt.option('stack', true);

  var currentdate = new Date();
  grunt.log.subhead('Task Start: ' + currentdate.toLocaleString())

  // Load needed tasks
  grunt.loadNpmTasks('grunt-screeps')
  grunt.loadNpmTasks('grunt-contrib-clean')
  grunt.loadNpmTasks('grunt-contrib-copy')
  grunt.loadNpmTasks('grunt-file-append')
  grunt.loadNpmTasks("grunt-jsbeautifier")
  grunt.loadNpmTasks('grunt-rollup');
  grunt.loadNpmTasks('grunt-shell');
  grunt.loadNpmTasks('grunt-contrib-watch');

  let worldBots = grunt.file.expand({ filter: 'isDirectory'}, "src/world_*");
  let arenaBots = grunt.file.expand({ filter: 'isDirectory'}, "src/arena_*");

  let deployConfig = {};
  let rollupConfig = {};
  let copyConfig = {
    updateRequireToImport: {
      options: {
        process: function(content, srcpath) {
          const regex2 = /(var|let)\W*([^=]*)\W*=\W*require\W*\(['" ]+([^'"]*)['" ]+\);?/gi;
          
          return content.replace(regex2, function(a, b, c, d){
            return `import ${c} from "${d}";`;
          });
        
        }
      },
      files: [{
        expand: true,
        cwd: 'src/',
        src: '**',
        dest: 'build/importUpdate/',
        filter: 'isFile',
        
      }],
    }
  };
  let watchConfig = {};
  let cleanConfig = {};

  let allBots = [
    ...worldBots,
    ...arenaBots
  ]
console.log(allBots)
  for(let bot in allBots) {
    let botFolder = allBots[bot];
    let isArenaBot = arenaBots.includes(botFolder);
    //console.log(bot, botFolder, isArenaBot)
    let worldName = botFolder.replace("src/", "");
    let baseName = botFolder.replace("src/world_", "").replace("src/arena_", "");

    let mainFile = grunt.file.expand( {filter: 'isFile'}, botFolder + "/main.*s");
    if (mainFile.length == 0) {
      continue;
    }
    //console.log(bot, botFolder, isArenaBot)
    mainFile = mainFile[0];
    let workingDir = "src";
    let step1Dir = `build/step1-copy`;
    let step2Dir = `build/step2-rollup`;
    let step3Dir = `build/step3-babeled`;
    let outputDir = `dist/${worldName}/`;

    let ourConfig = isArenaBot ? config.arena[baseName] : config.world[baseName];
    if (!ourConfig) {
      console.log("no config found for", baseName, "using defaults")
      ourConfig = {
          "env": {
              "_DEBUG_": "true"
          }
      }
    }
    let branch = grunt.option('branch') || ourConfig.branch || "default";
    let email = grunt.option('email') || ourConfig.email;
    let password = grunt.option('password') || ourConfig.password;
    let host = grunt.option('host') || ourConfig.host || "screeps.com";
    let port = grunt.option('port') || ourConfig.port || "21025";
    let http = grunt.option('http') ? true : ourConfig.http || false;
    let ptr = grunt.option('ptr') ? true : ourConfig.ptr || false;
    let env = ourConfig.env || {};
    let autoChunk = grunt.option('autoChunk') ? true : ourConfig.autoChunk || false;
    let chunks = ourConfig.chunks || {};
    //setup deploy config for this world
    deployConfig[worldName] = {
        src: [`${outputDir}/*.js`, `${outputDir}/*.map`],
        options: {
          server: {
            host: host,
            port: port,
            http: http
          },
          email: email,
          password: password,
          branch: branch,
          ptr: ptr
        },
    };
    //setup rollup config for world(step 2, 3)
    rollupConfig[worldName + "_step2"] = {
      options: { 
        chunkFileNames: '[name].js',// + (isArenaBot ? "mjs" : "js"),
        //entryFileNames: '[name].' + (isArenaBot ? "mjs" : "js"),
        //format: isArenaBot ? "es" : "cjs",
        treeshake: true,
        sourcemap: true,
        sourcemapExcludeSources: true,
        external:  screepsExternals,
        plugins: function () {
          return [
            fixGlobals(),
            replace({
              preventAssignment: true,
              values: {
                "_VERSION_": currentdate.getTime(),
                "_WORLD_": !isArenaBot,
                "__PROFILER_ENABLED__": false,
                ...env
              }
            }),
            //need this to resolve relative local paths
            includePaths({
              include: {},
              paths: [workingDir, "src/shared"],
              external:  screepsExternals,
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
                  "src/shared"
                ]
            }),
            commonjs({
                include: ['node_modules/**'],  // Default: undefined
                //include: 'src/**', 
                ignoreGlobal: false,  // Default: false
            }),
            typescript(),
            babel({ babelHelpers: 'bundled' }),
            // inject({
            //   Promise: path.resolve('shared/polyfills/promisepolyfill/index.js'),
            //   setInterval: path.resolve('shared/polyfills/setintervalpolyfill/index.js'),
            //   setTimeout: path.resolve('shared/polyfills/settimeoutpolyfill/index.js'),
            //   clearInterval: path.resolve('shared/polyfills/clearintervalpolyfill/index.js'),
            //   clearTimeout: path.resolve('shared/polyfills/cleartimeoutpolyfill/index.js')
            // }),
            clean({comments: "none"}),
          ];
        },
        manualChunks(id, {getModuleInfo}) {
          for(let chunk in chunks) {
            let searchTerm = chunks[chunk];
            //console.log(chunk, searchTerm)
            if (id.includes(searchTerm)) {
              return chunk;
            }
          }
          //This lets you build sub modules by putting a main.js inside a folder.
          //only the main.js file is gaurenteed to be in a seperate file here
          //ie: if you include another file from the directory, it may be included in a different file.
          //This shouldn't result in duplicate code though, it should only be in once place.
          //if you import everything in the sub directory into the main file and export it, then incldue from there, it should avoid this.
          if (autoChunk) {
            let parentDir = path.dirname(id).split(path.sep).pop()
            if (parentDir != step2Dir && (id.includes("main.js") || id.includes("main.ts") || id.includes("main.mjs"))) {
              return parentDir;
            }
          }
        }
      },
      files: [{
        expand: true,
        cwd: botFolder,
        src: ['main.js', 'main.ts', 'main.mjs'],
        dest: step2Dir,
        ext: ['.js', '.ts', '.mjs'],
        filter: 'isFile'
      }],
    };
    rollupConfig[worldName + "_step3"] = {
      options: {
        chunkFileNames: '[name].' + (isArenaBot ? "mjs" : "js"),
        entryFileNames: '[name].' + (isArenaBot ? "mjs" : "js"),
        format: isArenaBot ? "es" : "cjs",
        treeshake: true,
        sourcemap: false,
        preserveModules: true,
        external:  screepsExternals,
        paths: (path) => {
          // https://rollupjs.org/guide/en/#outputpaths
          // TS requires that we use non-relative paths for these "ambient" modules
          // The game requires relative paths, so prefix all game modules with "/" in the output bundle
          if (path.startsWith("game") || path.startsWith("arena")) {
            return "/" + path;
          }
        },
        plugins: function () {
          return [
            replace({
              preventAssignment: true,
              values: {
                "_SOURCE_MAPS_": function() {
                  // let inputs = grunt.file.expand({ filter: 'isFile'}, "shared/**/sourceMaps.js");
                  // let output = inputs[0].replace("src","");//String(inputs[0]).replace("src","");
        
                  let mapFiles = grunt.file.expand({ filter: 'isFile'}, step2Dir + "/**/*.map");
                  let mapFileBlocks = [];
                  for(let i in mapFiles) {
                    let mapFile = mapFiles[i].replace(".js.map", ".map");
                    let file = path.basename(mapFile).replace(".map", "");
                    let mapBlock = `
"${file}_inst":null,
"${file}": function() {
if(!this.${file}_inst) {
  this.${file}_inst = require("${mapFile.replace(step2Dir + "/", "")}");
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
              paths: [step2Dir],
              external:  screepsExternals,
              extensions: ['.js', '.json']
            }),
            //guessing I don't need this.. but it may let me bring in node modules
            nodeResolve({
                module: true,
                jsnext: true,
                main: true,
                preferBuiltins: false,
                moduleDirectories: [
                  "node_modules",
                  step2Dir
                ]
            }),
            commonjs({
                include: 'node_modules/**',  // Default: undefined
                ignoreGlobal: false  // Default: false
            })
          ];
        },
      },
      files: [{
        expand: true,
        cwd: step2Dir,
        src: ['main.js', "main.mjs"],
        dest: step3Dir,
        ext: ['.js', '.mjs'],
        filter: 'isFile',
      }],
    };


    //setup watch
    watchConfig[worldName] = {
      files: [
        botFolder + '/**/*.*s',
        'src/shared/**/*.*s'
      ],
      tasks: [`build:${worldName}`],
      options: {
        interrupt: true,
      },
    };

    //setup copy for world(step 1,4)
    copyConfig[worldName + "_step1"] = {
      options: {
        process: function(content, srcpath) {
          if (isArenaBot) {
            //remove leading slash from /game and /arena imports
            //only checking for ' or ", so technically will remove the slash any strings starting with
            // /game or /arena anywhere in an arena script
            const regex2 = /(['"])\/(game|arena)/gi;
            content = content.replace(regex2, function(a, b, c, d){
              return `${b}${c}`;
            })
          }
          if (content.includes("require")) {
            const regex1 = /(var|let|const)\W*([^=]*)\W*=\W*require\W*\(['" ]+([^'"]*)['" ]+\);?/gi;
            const regex1_2 = /^require\W*\(['" ]+([^'"]*)['" ]+\);?/gmi;

            

            content = content.replace(regex1, function(a, b, c, d){
              return `import ${c} from "${d}";`;
            }).replace(regex1_2, function(a, b, c, d){
              return `import "${b}"`;
            })
          }
          if (content.includes("module.exports")) {
            const regex2 = /module\.exports = ({.*?});/gi;
            const regex3 = /module\.exports = ([^;]*);/gi;
            content = content.replace(regex2, function(a, b) {
              return `export default ${b};`
            }).replace(regex3, function(a, b) {
              return `export default ${b};`
            });
          }
          return content;
        
        }
      },
      files: [{
        expand: true,
        cwd: botFolder,
        src: '**',
        dest: step1Dir,
        filter: 'isFile',
        
      }],
    }
    copyConfig[worldName + "_step4"] = {
      options: {
        process: function(content, srcpath) {
          if (String(srcpath).endsWith(".map")) {
            let newContent = String(content);
            newContent = newContent
              .replace(/\.\.\//g, '')
              .replace(/step1-copy/g, "");
              
            //this is a map file, which is just a json object, throw it in a module.exports so we can read it.
            return `module.exports = ${newContent}`
          }
          //remove the ./ at the begining and the .js at the end of the module names in require to make them compatable with screeps
          const regex1 = /(var|let|const)\W*([^=]*)\W*=\W*require\W*\(['" ]+\.\/([^'"]*)\.js['" ]+\);?/gi;
          const regex1_2 = /^require\W*\(['" ]+\.\/([^'"]*)\.js['" ]+\);?/gmi;
          return content.replace(regex1, function(a, b, c, d){
            return `const ${c} = require("${d}");`;
          }).replace(regex1_2, function(a, b, c, d){
            return `require("${b}");`;
          });
        
        }
      },
      files: [{//copy actual source files
        expand: true,
        cwd: step3Dir,
        src: '**',
        dest: outputDir,
        filter: 'isFile',
      },
      { //copy source  maps generated in step 2
        expand: true,
        cwd: step2Dir,
        src: '*.js.map',
        dest: outputDir,
        filter: 'isFile',
        rename: function(dest, src) {
          return dest + path.sep + src.replace(".js.map", ".map.js");
        }
      }],
    };


    cleanConfig[worldName] = outputDir;

    let actions =  [`clean:${worldName}`, `clean:build`, `copy:${worldName}_step1`, `rollup:${worldName}_step2`, `rollup:${worldName}_step3`, `copy:${worldName}_step4`];
    if (!isArenaBot)
      actions.push(`screeps:${worldName}`);
    
    grunt.registerTask(`build:${worldName}`, actions)
  }
  
  grunt.initConfig({

    watch: watchConfig,
    screeps: deployConfig,
    rollup: rollupConfig,


    
    copy: copyConfig,




    // Remove all files from the dist folder.
    clean: {
      ...cleanConfig,
      'build': ['build']
    },


    // Apply code styling
    jsbeautifier: {
      modify: {
        src: ["src/**/*.js"],
        options: {
          config: '.jsbeautifyrc'
        }
      },
      verify: {
        src: ["src/**/*.js"],
        options: {
          mode: 'VERIFY_ONLY',
          config: '.jsbeautifyrc'
        }
      }
    }

  })

  // Combine the above into a default task
  //grunt.registerTask('deploy-private',  ['screeps']);

  grunt.registerTask('test',     ['jsbeautifier:verify']);
  grunt.registerTask('pretty',   ['jsbeautifier:modify']);
}