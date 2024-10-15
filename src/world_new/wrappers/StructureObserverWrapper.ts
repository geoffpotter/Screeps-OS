import { KillableWrapper, KillableWrapperData } from "./base/KillableWrapper";
import { StorableCreatableClass } from "shared/utils/memory";
import { BaseAction } from "../actions/base/BaseAction";
import CreepWrapper from "./creep/CreepWrapper";
import { registerObjectWrapper } from "./base/AllGameObjects";

interface StructureObserverWrapperData extends KillableWrapperData {
  // Add any observer-specific properties here
}

export class StructureObserverWrapper extends KillableWrapper<StructureObserver> implements StorableCreatableClass<StructureObserverWrapper, typeof StructureObserverWrapper, StructureObserverWrapperData> {
  static fromJSON(json: StructureObserverWrapperData): StructureObserverWrapper {
    return new StructureObserverWrapper(json.id as Id<StructureObserver>);
  }
  toJSON(): StructureObserverWrapperData {
    return {
      ...super.toJSON(),
      // Add any observer-specific properties here
    };
  }

  constructor(id: string) {
    super(id as Id<StructureObserver>);
  }

  update() {
    super.update();
    const observer = this.getObject();
    if (observer) {
      // Update observer-specific properties here
    }
  }

}

registerObjectWrapper(StructureObserver, StructureObserverWrapper);
