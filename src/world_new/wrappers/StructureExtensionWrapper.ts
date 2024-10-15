import { HasStorageWrapper, HasStorageWrapperData } from "./base/HasStorageWrapper";
import { StorableCreatableClass } from "shared/utils/memory";
import { BaseAction } from "../actions/base/BaseAction";
import CreepWrapper from "./creep/CreepWrapper";
import { registerObjectWrapper } from "./base/AllGameObjects";

interface StructureExtensionWrapperData extends HasStorageWrapperData {
  // Add any extension-specific properties here
}

export class StructureExtensionWrapper extends HasStorageWrapper<StructureExtension> implements StorableCreatableClass<StructureExtensionWrapper, typeof StructureExtensionWrapper, StructureExtensionWrapperData> {
  static fromJSON(json: StructureExtensionWrapperData): StructureExtensionWrapper {
    return new StructureExtensionWrapper(json.id as Id<StructureExtension>);
  }

  toJSON(): StructureExtensionWrapperData {
    return {
      ...super.toJSON(),
      // Add any extension-specific properties here
    };
  }

  constructor(id: string) {
    super(id as Id<StructureExtension>);
  }

  update() {
    super.update();
    const extension = this.getObject();
    if (extension) {
      // Update extension-specific properties here
    }
  }
}

registerObjectWrapper(StructureExtension, StructureExtensionWrapper);
