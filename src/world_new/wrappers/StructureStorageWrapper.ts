import { HasStorageWrapper, HasStorageWrapperData } from "./base/HasStorageWrapper";
import { StorableCreatableClass } from "shared/utils/memory";
import { registerObjectWrapper } from "./base/AllGameObjects";
import Logger from "shared/utils/logger";

const logger = new Logger("StructureStorageWrapper");


interface StructureStorageWrapperData extends HasStorageWrapperData {
}

export class StructureStorageWrapper extends HasStorageWrapper<StructureStorage> implements StorableCreatableClass<StructureStorageWrapper, typeof StructureStorageWrapper, StructureStorageWrapperData> {
  static fromJSON(json: StructureStorageWrapperData): StructureStorageWrapper {
    const wrapper = new StructureStorageWrapper(json.id as Id<StructureStorage>);
    HasStorageWrapper.fromJSON(json, wrapper);
    return wrapper;
  }

  constructor(id: string) {
    super(id as Id<StructureStorage>);
  }

  update() {
    super.update();
    const storage = this.getObject();
    if (storage) {
      // Initialize appropriate actions based on storage state
    }
  }

  toJSON(): StructureStorageWrapperData {
    return {
      ...super.toJSON()
    };
  }
}

registerObjectWrapper(StructureStorage, StructureStorageWrapper);
