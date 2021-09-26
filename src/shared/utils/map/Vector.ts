import { DirectionConstant } from "game/constants";
import { turnDirection, Turns } from "./Direction";
import { Location } from "./Location";


export const offsetsByDirection = [, [0,-1], [1,-1], [1,0], [1,1], [0,1], [-1,1], [-1,0], [-1,-1]];


export class Vector {
  loc:Location;
  dir:DirectionConstant;
  constructor(loc:Location, dir:DirectionConstant) {
    this.loc = loc;
    this.dir = dir;
  }
  move(direction:DirectionConstant):Vector {
    let offset = offsetsByDirection[direction];
    if(!offset) {
      throw new Error("invalid Vector!")
    }
    //get new location at offset
    let newLoc = Location.getLocation(this.loc.x+offset[0], this.loc.y+offset[1]);
    //return new Vector at new location and pointing in that dir.
    return new Vector(newLoc, direction);
  }
  forward() {
    return this.move(this.dir);
  }

  slight_right() {
    let newDir = turnDirection(this.dir, Turns.slight_right);
    return this.move(newDir);
  }
  right() {
    let newDir = turnDirection(this.dir, Turns.right);
    return this.move(newDir);
  }
  hard_right() {
    let newDir = turnDirection(this.dir, Turns.hard_right);
    return this.move(newDir);
  }
  uturn() {
    let newDir = turnDirection(this.dir, Turns.uturn);
    return this.move(newDir);
  }
  hard_left() {
    let newDir = turnDirection(this.dir, Turns.hard_left);
    return this.move(newDir);
  }
  left() {
    let newDir = turnDirection(this.dir, Turns.left);
    return this.move(newDir);
  }
  slight_left() {
    let newDir = turnDirection(this.dir, Turns.slight_left);
    return this.move(newDir);
  }
}
