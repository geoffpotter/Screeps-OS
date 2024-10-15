import { HasStorageWrapper, HasStorageWrapperData } from "./base/HasStorageWrapper";
import { StorableCreatableClass } from "shared/utils/memory";
import { BaseAction } from "../actions/base/BaseAction";

import CreepWrapper from "./creep/CreepWrapper";
import { registerObjectWrapper } from "./base/AllGameObjects";

interface StructureTowerWrapperData extends HasStorageWrapperData {
  // Add any tower-specific properties here
}

export class StructureTowerWrapper extends HasStorageWrapper<StructureTower> implements StorableCreatableClass<StructureTowerWrapper, typeof StructureTowerWrapper, StructureTowerWrapperData> {


  static fromJSON(json: StructureTowerWrapperData): StructureTowerWrapper {
    const wrapper = new StructureTowerWrapper(json.id as Id<StructureTower>);
    // Initialize specific properties if any
    return wrapper;
  }
  toJSON(): StructureTowerWrapperData {
    return {
      ...super.toJSON(),
      // Add any tower-specific properties here
    };
  }

  constructor(id: string) {
    super(id as Id<StructureTower>);

  }

  update() {
    super.update();
    const tower = this.getObject();
    if (tower) {
      // Update our actions

    }
  }

  registerActions() {
    super.registerActions();
  }


}

registerObjectWrapper(StructureTower, StructureTowerWrapper);
