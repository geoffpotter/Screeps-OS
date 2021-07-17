
import {foo} from "test"
import {test2} from "test_test2"
// comments and shit
export var test3=test2;
export function loop() {
    console.log("main loop start", foo);
    test2();// comments and shit
    console.log("main loop end??", [1, 2, 3].map(num => num * 2));
};
