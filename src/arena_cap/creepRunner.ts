
import {
  Creep,
} from 'game/prototypes';

import "./prototypeCreep";


export class creepRunner {
  creeps: Map<string, Creep>;
  constructor() {
    this.creeps = new Map();
  }
  updateCreeps(creeps:Creep[]) {
    for(let creep of creeps) {
      this.creeps.set(creep.id, creep);
    }
  }
  runCreeps() {
    for(let creep of this.creeps.values()) {
      this.runCreep(creep);
    }
  }
  runCreep(creep:Creep):void {
    creep.run();
  }
}