import { KillableWrapper, KillableWrapperData } from "./base/KillableWrapper";
import { StorableCreatableClass } from "shared/utils/memory";
import { registerObjectWrapper } from "./base/AllGameObjects";

interface StructureKeeperLairWrapperData extends KillableWrapperData {
  ticksToSpawn: number | undefined;
}

export class StructureKeeperLairWrapper extends KillableWrapper<StructureKeeperLair> implements StorableCreatableClass<StructureKeeperLairWrapper, typeof StructureKeeperLairWrapper, StructureKeeperLairWrapperData> {
  ticksToSpawn: number | undefined;

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
    this.ticksToSpawn = undefined;
  }

  update() {
    super.update();
    const keeperLair = this.getObject();
    if (keeperLair) {
      this.ticksToSpawn = keeperLair.ticksToSpawn;
    }
  }
}

registerObjectWrapper(StructureKeeperLair, StructureKeeperLairWrapper);
