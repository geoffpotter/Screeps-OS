import { HasStorageWrapper, HasStorageWrapperData } from "./base/HasStorageWrapper";
import { StorableCreatableClass } from "shared/utils/memory";
import { registerObjectWrapper } from "./base/AllGameObjects";
import Logger from "shared/utils/logger";

const logger = new Logger("StructureTowerWrapper");

interface StructureTowerWrapperData extends HasStorageWrapperData {
}

export class StructureTowerWrapper extends HasStorageWrapper<StructureTower> implements StorableCreatableClass<StructureTowerWrapper, typeof StructureTowerWrapper, StructureTowerWrapperData> {
  static fromJSON(json: StructureTowerWrapperData): StructureTowerWrapper {
    const wrapper = new StructureTowerWrapper(json.id as Id<StructureTower>);
    HasStorageWrapper.fromJSON(json, wrapper);
    return wrapper;
  }

  constructor(id: string) {
    super(id as Id<StructureTower>);
  }

  update() {
    super.update();
    const tower = this.getObject();
    if (tower && this.my) {
    }
  }

}

registerObjectWrapper(StructureTower, StructureTowerWrapper);
