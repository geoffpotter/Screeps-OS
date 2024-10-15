import { KillableWrapper, KillableWrapperData } from "./base/KillableWrapper";
import { StorableCreatableClass } from "shared/utils/memory";
import { BaseAction } from "../actions/base/BaseAction";
import CreepWrapper from "./creep/CreepWrapper";
import { registerObjectWrapper } from "./base/AllGameObjects";

interface StructureRoadWrapperData extends KillableWrapperData {
  // Add any road-specific properties here
}

export class StructureRoadWrapper extends KillableWrapper<StructureRoad> implements StorableCreatableClass<StructureRoadWrapper, typeof StructureRoadWrapper, StructureRoadWrapperData> {
  static fromJSON(json: StructureRoadWrapperData): StructureRoadWrapper {
    return new StructureRoadWrapper(json.id as Id<StructureRoad>);
  }
  toJSON(): StructureRoadWrapperData {
    return {
      ...super.toJSON(),
      // Add any road-specific properties here
    };
  }

  constructor(id: string) {
    super(id as Id<StructureRoad>);
  }

  update() {
    super.update();
    const road = this.getObject();
    if (road) {
      // Update road-specific properties here
    }
  }

}

registerObjectWrapper(StructureRoad, StructureRoadWrapper);
