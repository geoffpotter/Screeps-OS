import { KillableWrapper, KillableWrapperData } from "./base/KillableWrapper";
import { StorableCreatableClass } from "shared/utils/memory";
import { BaseAction } from "../actions/base/BaseAction";
import CreepWrapper from "./creep/CreepWrapper";
import { registerObjectWrapper } from "./base/AllGameObjects";

interface StructureKeeperLairWrapperData extends KillableWrapperData {
  ticksToSpawn: number | null;
}

export class StructureKeeperLairWrapper extends KillableWrapper<StructureKeeperLair> implements StorableCreatableClass<StructureKeeperLairWrapper, typeof StructureKeeperLairWrapper, StructureKeeperLairWrapperData> {
  ticksToSpawn: number | null;

  static fromJSON(json: StructureKeeperLairWrapperData): StructureKeeperLairWrapper {
    const wrapper = new StructureKeeperLairWrapper(json.id as Id<StructureKeeperLair>);
    wrapper.ticksToSpawn = json.ticksToSpawn;
    return wrapper;
  }

  toJSON(): StructureKeeperLairWrapperData {
    return {
      ...super.toJSON(),
      ticksToSpawn: this.ticksToSpawn,
    };
  }

  constructor(id: string) {
    super(id as Id<StructureKeeperLair>);
    this.ticksToSpawn = null;
  }

  update() {
    super.update();
    const keeperLair = this.getObject();
    if (keeperLair) {
      this.ticksToSpawn = keeperLair.ticksToSpawn || null;
    }
  }
}

registerObjectWrapper(StructureKeeperLair, StructureKeeperLairWrapper);
