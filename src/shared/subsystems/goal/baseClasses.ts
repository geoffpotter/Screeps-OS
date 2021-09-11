import { Creep } from "game/prototypes";
import { FakeGameObject } from "shared/utils/settings";

declare module "game/prototypes" {
  interface Creep {
    goalId:string
  }
}


export type idType = string;

/**
 * Common interface for goals, jobs, and actions
 */
export class planComponent {
  static type = "unimplemented";

  id: idType;
  private parent: planComponent | false;


  constructor(id: idType, parent: planComponent | false = false) {
    this.id = id;
    this.parent = parent;
  }

  getParent() {
    return this.parent;
  }
  getRoot() {
    let root: planComponent = this;
    while (root.parent) {
      root = root.parent;
    }
    return root;
  }

  serialize(): string {
    throw new TypeError("Serialize not implemented")
  }
  deserialize(strValue: string): planComponent {
    throw new TypeError("Serialize not implemented")
  }
}


export let goals = new Map<idType, baseGoal>();
export let jobs = new Map<idType, baseJob>();
export let actions = new Map<idType, baseAction>();


export class baseAction extends planComponent {
  static type = "baseAction";
  constructor(id: idType, parent: baseJob | baseGoal) {
    super(id, parent);
    if(actions.has(id)) {
      //trying to make action with dupe id, throw
      throw new TypeError(`ActionId already exists! ${id}`)
    }
    actions.set(id, this);
  }
  /**
   * performs the action with the given actor
   */
  runAction(actor: any): void {
    throw new TypeError("runAction not implemented")
  }
}

export class baseJob extends planComponent {
  static type = "baseJob";
  constructor(id: idType, parent: baseGoal) {
    super(id, parent);
    if(jobs.has(id)) {
      //trying to make action with dupe id, throw
      throw new TypeError(`JobId already exists! ${id}`)
    }
    jobs.set(id, this);
  }
  /**
   * performs the job's per tick stuff
   */
  runJob(): void {
    throw new TypeError("runJob not implemented")
  }
}

export interface Goal {
  assignCreep(creep:Creep):boolean;
  assignTarget(target:FakeGameObject):boolean;
  runGoal(): void;
}

export class baseGoal extends planComponent {
  static type = "baseGoal";
  constructor(id: idType, parent: baseGoal | false = false) {
    super(id, parent);
    if(goals.has(id)) {
      //trying to make action with dupe id, throw
      throw new TypeError(`goalId already exists! ${id}`)
    }
    goals.set(id, this);
  }
}
