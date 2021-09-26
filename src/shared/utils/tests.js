let pos1 = {
	x: 20,
  y: 40,
  roomName: "w0n0"
}
let pos2 = {
	x: 50,
  y: 30,
  roomName: "w0n1"
}
let pos3 = {
	x: 30,
  y: 10,
  roomName: "w0n2"
}

let shallowObj = {
	p1_x: pos1.x,
  p1_y: pos1.y,
  p1_roomName: pos1.roomName,

	p2_x: pos2.x,
  p2_y: pos2.y,
  p2_roomName: pos2.roomName,

	p3_x: pos3.x,
  p3_y: pos3.y,
  p3_roomName: pos3.roomName,
  data:[1,2,3,4,5,6,7,true]
}

let deepObj = {
  posList: [pos1, pos2, pos3],
  data:[1,2,3,4,5,6,7,true]
}


let shallowJSON = JSON.stringify(shallowObj);
let deepJSON = JSON.stringify(deepObj);

let shallowObj2 = {x:109238091,y:120938};
let deepObj2 = {a:{b:{x:1,y:1}}};
//deepObj2 = {a:{b:{x:109238091,y:120938}}}
let shallowJSON2 = JSON.stringify(shallowObj2);
let deepJSON2 = JSON.stringify(deepObj2);

let shit1 = shitStringify(shallowObj);
let shit2 = shitStringify(shallowObj2);
let shit3 = shitStringify(deepObj);
let shit4 = shitStringify(deepObj2);
console.log(shit1, shallowJSON, shit1 == shallowJSON, JSON.parse(shit1));
console.log(shit2, shit2 == shallowJSON2);
console.log(shit3, shit3 == deepJSON);
console.log(shit4, shit4 == deepJSON2);
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


function testStringify(name, data, times=1) {
  //console.log(name, "testing with:", data, "len:", data.length)
  console.time("JSON.stringify "+name);
  let stringed;
  for(let i=0;i<times;i++) {
    stringed = JSON.stringify(data);
  }
  console.log(stringed)
  console.timeEnd("JSON.stringify "+name)
}
function testShitString(name, data, times=1) {
  //console.log(name, "testing with:", data, "len:", data.length)
  console.time("shitStringify "+name);
  let stringed;
  for(let i=0;i<times;i++) {
    stringed = shitStringify(data);
  }
  console.log(stringed)
  console.timeEnd("shitStringify "+name)
}

function testParse(name, data, times=1) {
  //console.log(name, "testing with:", data, "len:", data.length)
  console.time("JSON.parse "+name);
  let parsed;
  for(let i=0;i<times;i++) {
    parsed = JSON.parse(data);
  }
  console.log(parsed)
  console.timeEnd("JSON.parse "+name)
}
function testEval(name, data, times=1) {
  //console.log(name, "testing with:", data, "len:", data.length)
  console.time("eval "+name)
  let parsed;
  for(let i=0;i<times;i++) {
    parsed = eval("("+data+")");

  }
  console.log(parsed)
  console.timeEnd("eval "+name)
}
let times = 100000;

testParse("shallow", shallowJSON, times);
// testEval("shallow", shallowJSON, times);

// testParse("deep", deepJSON, times);
// testEval("deep", deepJSON, times);

// testParse("shallow2", shallowJSON2, times);
// testEval("shallow2", shallowJSON2, times);

// testParse("deep2", deepJSON2, times);
// testEval("deep2", deepJSON2, times);

testStringify("shallow", shallowObj, times)
testShitString("shallow", shallowObj, times)
testStringify("deep", deepObj, times)
testShitString("deep", deepObj, times)
testStringify("shallow2", shallowObj2, times)
testShitString("shallow2", shallowObj2, times)
testStringify("deep2", deepObj2, times)
testShitString("deep2", deepObj2, times)
