import { HasStorageWrapper, HasStorageWrapperData } from "./base/HasStorageWrapper";
import { StorableCreatableClass } from "shared/utils/memory";
import { Colony } from "../Colony";
import { registerObjectWrapper } from "./base/AllGameObjects";

interface StructureStorageWrapperData extends HasStorageWrapperData {
  // Add any storage-specific properties here
}

export class StructureStorageWrapper extends HasStorageWrapper<StructureStorage> implements StorableCreatableClass<StructureStorageWrapper, typeof StructureStorageWrapper, StructureStorageWrapperData> {
  static fromJSON(json: StructureStorageWrapperData): StructureStorageWrapper {
    const wrapper = new StructureStorageWrapper(json.id as Id<StructureStorage>);
    HasStorageWrapper.fromJSON(json, wrapper);
    return wrapper;
  }

  constructor(id: string) {
    super(id as Id<StructureStorage>);
    // No additional actions needed for StructureStorage
  }

  update() {
    super.update();
    const storage = this.getObject();
    if (storage) {
      // Update storage-specific properties here if needed
    }
  }

  toJSON(): StructureStorageWrapperData {
    return {
      ...super.toJSON(),
      // Add any storage-specific properties here
    };
  }
}

registerObjectWrapper(StructureStorage, StructureStorageWrapper);
