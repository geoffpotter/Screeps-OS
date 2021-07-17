var babel = require( '@rollup/plugin-babel').default;

var clean = require( "rollup-plugin-clean");
var nodeResolve = require('@rollup/plugin-node-resolve').default;
var babel = require('@rollup/plugin-babel').default;
var commonjs = require('@rollup/plugin-commonjs');

var includePaths = require('rollup-plugin-includepaths');
 
let includePathOptions = {
    include: {},
    paths: ['src/'],
    external: [],
    extensions: ['.js', '.json', '.html']
};

module.exports = function (grunt) {
  require('time-grunt')(grunt);

  // Pull defaults (including username and password) from .screeps.json
  var config = require('./.screeps.json')

  // Allow grunt options to override default configuration
  var branch_public = grunt.option('branch') || config.public.branch;
  var email_public = grunt.option('email') || config.public.email;
  var password_public = grunt.option('password') || config.public.password;
  var ptr = grunt.option('ptr') ? true : config.public.ptr

  var branch_private = grunt.option('branch') || config.private.branch;
  var email_private = grunt.option('email') || config.private.email;
  var password_private = grunt.option('password') || config.private.password;
  var host_private = grunt.option('host') ? true : config.private.host
  var port_private = grunt.option('port') ? true : config.private.port
  var http_private = grunt.option('http') ? true : config.private.http

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

  grunt.initConfig({

    shell: {
      runRollup: {
        command: 'rollup -c'
      },
      runBabel: {
        command: 'npx babel build/rolluped/* --out-dir dist'
      }
    },

    screeps: {
      private: {
        src: ['dist/*.js'],
        options: {
          server: {
            host: host_private,
            port: port_private,
            http: http_private
          },
          email: email_private,
          password: password_private,
          branch: branch_private,
          ptr: false
        },
      },
      
      public: {
        src: ['dist/*.js'],
        options: {
          email: email_public,
          password: password_public,
          branch: branch_public,
          ptr: ptr
        }
      }

    },


    // Copy all source files into the dist folder, flattening the folder
    // structure by converting path delimiters to underscores
    copy: {
      // Pushes the game code to the dist folder so it can be modified before
      // being send to the screeps server.
      screeps: {
        options: {
          process: function(content, srcpath) {
            //This regex hopes to replace only /s found in import statements
            const regex = /(?<=import.*?from.*?)\//gi;
            //this regex aims to replace only /s in require statements
            //require expressions seem to dangerous, 
            const regex2 = /(?<=require\(.*?)\//gi;
            
            return content.replace(regex, '_').replace(regex2, '_');
          }
        },
        files: [{
          expand: true,
          cwd: 'src/',
          src: '**',
          dest: 'build/flattened/',
          filter: 'isFile',
          rename: function (dest, src) {
            console.log("here")
            // Change the path name utilize underscores for folders
            return dest + src.replace(/\//g,'_');
          },
          
        }],
      }
    },

    rollup: {
      options: {
        plugins: function () {
          return [
            //need this to resolve local paths
            includePaths(includePathOptions),
            //guessing I don't need this.. but it may let me bring in node modules
            nodeResolve({
                module: true,
                jsnext: true,
                main: true,
                preferBuiltins: false,
            }),
            commonjs({
                include: 'node_modules/**',  // Default: undefined
                //include: 'src/**', 
                ignoreGlobal: false,  // Default: false
            }),
            // babel({
            //     babelHelpers: 'bundled',
            //     //exclude: './node_modules/**',
            //     "presets": [
            //       [
            //         "@babel/preset-env",
            //         {
            //           "targets": {
            //             "node": "10"
            //           },
            //           modules: false,
            //         }
            //       ]
            //     ],
            //     "plugins": [
                    
            //         ["@babel/plugin-transform-arrow-functions", { "spec": false }]
            //     ],
            //   })
            
            //clean({comments: "none"}),
          ];
        },
      },
      main: {
        files: [{
          expand: true,
          cwd: 'build/flattened/',
          src: 'main.js',
          dest: 'build/rolluped/',
          filter: 'isFile',
        }],
      },
    },


    // Add version variable using current timestamp.
    file_append: {
      versioning: {
        files: [
          {
            append: "\nglobal.SCRIPT_VERSION = "+ currentdate.getTime() + "\n",
            input: 'build/flattened/version.js',
          }
        ]
      }
    },


    // Remove all files from the dist folder.
    clean: {
      'dist': ['dist'],
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
  grunt.registerTask('default',  ['clean', 'copy:screeps',  'file_append:versioning', 'rollup', 'shell:runBabel', 'screeps:public']);
  grunt.registerTask('private',  ['clean', 'copy:screeps',  'file_append:versioning', 'rollup', 'shell:runBabel', 'screeps:private']);
  //grunt.registerTask('deploy-private',  ['screeps']);
  grunt.registerTask('test',     ['jsbeautifier:verify']);
  grunt.registerTask('pretty',   ['jsbeautifier:modify']);
}