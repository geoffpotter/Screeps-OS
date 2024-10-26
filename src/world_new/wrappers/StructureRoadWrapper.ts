import { KillableWrapper, KillableWrapperData } from "./base/KillableWrapper";
import { StorableCreatableClass } from "shared/utils/memory";
import { registerObjectWrapper } from "./base/AllGameObjects";

interface StructureRoadWrapperData extends KillableWrapperData {
  ticksToDecay: number;
}

export class StructureRoadWrapper extends KillableWrapper<StructureRoad> implements StorableCreatableClass<StructureRoadWrapper, typeof StructureRoadWrapper, StructureRoadWrapperData> {
  ticksToDecay: number;

  static fromJSON(json: StructureRoadWrapperData): StructureRoadWrapper {
    const wrapper = new StructureRoadWrapper(json.id as Id<StructureRoad>);
    wrapper.ticksToDecay = json.ticksToDecay;
    return wrapper;
  }

  toJSON(): StructureRoadWrapperData {
    return {
      ...super.toJSON(),
      ticksToDecay: this.ticksToDecay,
    };
  }

  constructor(id: string) {
    super(id as Id<StructureRoad>);
    this.ticksToDecay = 0;
  }

  update() {
    super.update();
    const road = this.getObject();
    if (road) {
      this.ticksToDecay = road.ticksToDecay;
    }
  }
}

registerObjectWrapper(StructureRoad, StructureRoadWrapper);
