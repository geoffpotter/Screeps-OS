import { HasStorageWrapper, HasStorageWrapperData } from "./base/HasStorageWrapper";
import { StorableCreatableClass } from "shared/utils/memory";
import { registerObjectWrapper } from "./base/AllGameObjects";
import Logger from "shared/utils/logger";

const logger = new Logger("StructureExtensionWrapper");

interface StructureExtensionWrapperData extends HasStorageWrapperData {
}

export class StructureExtensionWrapper extends HasStorageWrapper<StructureExtension> implements StorableCreatableClass<StructureExtensionWrapper, typeof StructureExtensionWrapper, StructureExtensionWrapperData> {
  static fromJSON(json: StructureExtensionWrapperData): StructureExtensionWrapper {
    const wrapper = new StructureExtensionWrapper(json.id as Id<StructureExtension>);
    HasStorageWrapper.fromJSON(json, wrapper);
    return wrapper;
  }

  constructor(id: string) {
    super(id as Id<StructureExtension>);
  }

  update() {
    super.update();
    const extension = this.getObject();
    if (extension && this.my) {

    }
  }

}

registerObjectWrapper(StructureExtension, StructureExtensionWrapper);
