import {
  getTicks
} from 'game/utils';

let promise = new Promise(resolve => {
  console.log("here?");
  if (getTicks() % 5 == 4) {
    resolve("done!")
  }
});
promise.then((res) => console.log(res, getTicks()));
export function loop() {
  console.log('Current tick:', getTicks());
  // the promise becomes resolved immediately upon creation


}