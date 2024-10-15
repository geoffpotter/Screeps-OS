import { HasStorageWrapper, HasStorageWrapperData } from "./base/HasStorageWrapper";
import { StorableCreatableClass } from "shared/utils/memory";
import { BaseAction } from "../actions/base/BaseAction";
import CreepWrapper from "./creep/CreepWrapper";
import { registerObjectWrapper } from "./base/AllGameObjects";

interface StructurePowerSpawnWrapperData extends HasStorageWrapperData {
  // Add any power spawn-specific properties here
}

export class StructurePowerSpawnWrapper extends HasStorageWrapper<StructurePowerSpawn> implements StorableCreatableClass<StructurePowerSpawnWrapper, typeof StructurePowerSpawnWrapper, StructurePowerSpawnWrapperData> {
  static fromJSON(json: StructurePowerSpawnWrapperData): StructurePowerSpawnWrapper {
    return new StructurePowerSpawnWrapper(json.id as Id<StructurePowerSpawn>);
  }

  constructor(id: string) {
    super(id as Id<StructurePowerSpawn>);
  }

  update() {
    super.update();
    const powerSpawn = this.getObject();
    if (powerSpawn) {
      // Update power spawn-specific properties here
    }
  }

  toJSON(): StructurePowerSpawnWrapperData {
    return {
      ...super.toJSON(),
      // Add any power spawn-specific properties here
    };
  }
}

registerObjectWrapper(StructurePowerSpawn, StructurePowerSpawnWrapper);
