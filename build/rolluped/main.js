var foo = "hello from test!";

function test2() {
    console.log("test2 start");
    // comments and shit
    console.log("test2 end", foo);
}

// comments and shit
var test3=test2;
function loop() {
    console.log("main loop start", foo);
    test2();// comments and shit
    console.log("main loop end??", [1, 2, 3].map(num => num * 2));
}

export { loop, test3 };
