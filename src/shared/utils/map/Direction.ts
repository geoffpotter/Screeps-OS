import { DirectionConstant } from "game/constants";



//enum, values are how much to add to a direction
export enum Turns {
  forward,
  slight_right,
  right,
  hard_right,
  uturn,
  hard_left,
  left,
  slight_left
}

export function turnDirection(dir:DirectionConstant, turnType:Turns):DirectionConstant {
  let newDir = dir + turnType;
  if(newDir <= 0) {
    newDir += 8;
  }
  if(newDir >= 9) {
    newDir -= 8;
  }
  //@ts-ignore type complaint, I'm bounding the new dir, so should be fine.
  return newDir;
}
