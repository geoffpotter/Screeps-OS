import { HasStorageWrapper, HasStorageWrapperData } from "./base/HasStorageWrapper";
import { StorableCreatableClass } from "shared/utils/memory";
import { registerObjectWrapper } from "./base/AllGameObjects";
import Logger from "shared/utils/logger";

const logger = new Logger("StructurePowerSpawnWrapper");

interface StructurePowerSpawnWrapperData extends HasStorageWrapperData {

}

export class StructurePowerSpawnWrapper extends HasStorageWrapper<StructurePowerSpawn> implements StorableCreatableClass<StructurePowerSpawnWrapper, typeof StructurePowerSpawnWrapper, StructurePowerSpawnWrapperData> {

  static fromJSON(json: StructurePowerSpawnWrapperData): StructurePowerSpawnWrapper {
    const wrapper = new StructurePowerSpawnWrapper(json.id as Id<StructurePowerSpawn>);
    HasStorageWrapper.fromJSON(json, wrapper);
    return wrapper;
  }


  constructor(id: string) {
    super(id as Id<StructurePowerSpawn>);
  }

  update() {
    super.update();
    const powerSpawn = this.getObject();
    if (powerSpawn && this.my) {
      this.store.setMin(RESOURCE_POWER, powerSpawn.store.getCapacity(RESOURCE_POWER));
      this.store.setMin(RESOURCE_ENERGY, powerSpawn.store.getCapacity(RESOURCE_ENERGY));
    }
  }

}

registerObjectWrapper(StructurePowerSpawn, StructurePowerSpawnWrapper);
