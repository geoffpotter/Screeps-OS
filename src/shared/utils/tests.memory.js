// postcrafter 20 May 2017 at 00:32
//let origMemory =

function shitStringify(obj) {
  let objType = typeof obj;
  if(objType == "number" || objType == "bigint" || objType == "boolean") {
    return obj;
  }
  if(objType == "string") {
    return `"${obj}"`
  }
  if(Array.isArray(obj)) {
    let len = obj.length;
    let str = "[";
    let first = true;
    for(let i=0;i<len;i++) {
      let item = obj[i];
      let strVal;
      let itemType = typeof item;
      if(itemType == "string") {
        strVal = '"'+item+'"'
      } else if(itemType == "number" || itemType == "bigint" || itemType == "boolean") {
        strVal = item
      } else {
        strVal = shitStringify(item);
      }
      if(!first) {
        str += "," + strVal;
        continue;
      }
      str += strVal;
      first = false;
    }
    str += "]"
    return str;
  }
  if(objType == "object") {
    let str = '{';
    let first = true;
    for(let field in obj) {
      let propVal = obj[field];
      let strVal;
      if(typeof propVal == "string") {
        strVal = '"'+propVal+'"'
      } else if(typeof propVal == "number" || typeof propVal == "bigint" || typeof propVal == "boolean") {
        strVal = propVal
      } else {
        strVal = shitStringify(propVal);
      }
      //let comma = first ? "" : ","
      //parts.push(`${comma}"${field}":${strVal}` )
      if(!first) {
        str += `,"${field}":${strVal}`
        continue;
      }
      str += `"${field}":${strVal}`
      first = false;
    }
    str += "}"
    return str;
  }


  return obj;
  // switch(typeof obj) {
  //   case "bigint":
  //   case "number":
  //     return obj;
  //   case "string":
  //     return `"${obj}"`;
  //   case "object":
  //     if(Array.isArray(obj)) {
  //       let len = obj.length;
  //       let str = "[";
  //       for (let i = 0; i < len; i++) {
  //         let item = obj[i];
  //         if (i != len) {
  //           str += shitStringify(item) + ",";
  //         } else {
  //           str += shitStringify(item);
  //         }
  //       }
  //       str += "]"
  //       return str;
  //     }
  //     let str = '{';
  //     let first = true;
  //     for (let field in obj) {
  //       let propVal = obj[field];
  //       let strVal = shitStringify(propVal);
  //       //let comma = first ? "" : ","
  //       //parts.push(`${comma}"${field}":${strVal}` )
  //       if (!first) {
  //         str += `,"${field}":${strVal}`
  //         continue;
  //       }
  //       str += `"${field}":${strVal}`
  //       first = false;
  //     }
  //     str += "}"
  //     return str;

  //   default:
  //     return "null";
  // }
}

function wrapLoop(fn) {
  let memory;
  let tick;
  let avgCpuRead = 0;
  let avgCpuWrite = 0
  return () => {
    console.log('------------------------------------------------')
    let start =  Game.cpu.getUsed();
    if (tick && tick + 1 === Game.time && memory) {
      // this line is required to disable the default Memory deserialization
      delete global.Memory;
      Memory = memory;
    } else {
      //memory = Memory;

      memory = eval("("+RawMemory.get()+")");
    }
    let end =  Game.cpu.getUsed();
    let used = end-start;
    if(avgCpuRead == 0) avgCpuRead = used;
    avgCpuRead = avgCpuRead * 0.95 + used *0.05;
    console.log("memory read time:", used, "avg", avgCpuRead)

    tick = Game.time;

    fn();

    // there are two ways of saving Memory with different advantages and disadvantages
    // 1. RawMemory.set(JSON.stringify(Memory));
    // + ability to use custom serialization method
    // - you have to pay for serialization
    // - unable to edit Memory via Memory watcher or console
    // 2. RawMemory._parsed = Memory;
    // - undocumented functionality, could get removed at any time
    // + the server will take care of serialization, it doesn't cost any CPU on your site
    // + maintain full functionality including Memory watcher and console
    start =  Game.cpu.getUsed();
    //RawMemory.set(JSON.stringify(Memory));
    RawMemory.set(shitStringify(Memory));

    // this implementation uses the official way of saving Memory
    //RawMemory.set(JSON.stringify(Memory)); // 16.50543870086827 //mmo:  24.84855812720727
    //RawMemory._parsed = Memory; //16.349714159287302

    end =  Game.cpu.getUsed();
    used = end-start;
    if(avgCpuWrite == 0) avgCpuWrite = used;
    avgCpuWrite = avgCpuWrite * 0.95 + used *0.05;
    console.log("memory read time:", used, "avg", avgCpuWrite)
  };
}

function makeId(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() *
 charactersLength));
   }
   return result;
}

function makeUpShit(shitsPerTick, maxShits) {
    let keys = Object.keys(Memory.shits);
    let shitKey;
    let shitData;
    for ( var i = 0; i < shitsPerTick; i++ ) {
        if (keys.length >= maxShits) {
            //reshit
            shitKey = keys[Math.floor(Math.random() * keys.length)];
        } else {
            //new shit
            shitKey = makeId(10)
        }
        shitData = makeId(10);
        //console.log("shitting", shitData, "Into", shitKey)
        Memory["shits"][shitKey] = shitData;
   }
   return {"key":shitKey, "data":shitData}
}
let lastShit = {};
let avgCpu = 0;
console.log("======================================before main loop=======================================", Game.shard)
module.exports.loop = wrapLoop(function() {
    console.log("---------------start main loop-----------------------")

    let start = Game.cpu.getUsed();
    //Memory.shits = {};;//reset
    if( !Memory.shits) {
        Memory.shits = {}
    }
    console.log(JSON.stringify(lastShit), Memory.shits[lastShit.key], lastShit.data)

  //Spoilier alert: shit's equal
  console.log("shits equal?", Memory.shits[lastShit.key] == lastShit.data, Memory.shits[lastShit.key], lastShit.data)

  console.log("start tick", start, "num shits:",  Object.keys(Memory.shits).length);

  lastShit = makeUpShit(10000, 60000);
  let end =  Game.cpu.getUsed();
  let cpuUsed = end - start;
  if (avgCpu == 0) {
      avgCpu = cpuUsed;
  }
  avgCpu = avgCpu * 0.95 + cpuUsed *0.05;
  console.log("end tick", cpuUsed, avgCpu, "num shits:", Object.keys(Memory.shits).length)
});


// return;
// 'use strict';

// Object.defineProperty(exports, '__esModule', { value: true });

// const errorMapper  = require("errorMapper");
// const oldBot  = require("oldBot");
// require("vendor");

// function* generator(i) {
//   yield i;
//   yield i + 10;
// }

// const gen = generator(10);
// console.log(typeof gen);
// let wrappedLoop = errorMapper.E.wrapLoop(function () {
//   console.log('START Main Loop'); //let p = aTest();
//   //console.log("atest returned", p)
//   //p.then((() => console.log("atest resolved!")))

//   try {
//     oldBot.l(); //console.log("gen next:", JSON.stringify(gen.next()));
//   } catch (e) {
//     // for(let i in e) {
//     //   console.log(i, e[i]);
//     // }
//     console.log("Error running old bot: ", e.stack);
//     throw e;
//   }

//   console.log('END Main Loop');
// }); //wrappedLoop = asl.wrapAsyncLoop(wrappedLoop)

// let loop = wrappedLoop;

// exports.loop = loop;
