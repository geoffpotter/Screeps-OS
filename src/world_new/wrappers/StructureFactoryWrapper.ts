import { HasStorageWrapper, HasStorageWrapperData } from "./base/HasStorageWrapper";
import { StorableCreatableClass } from "shared/utils/memory";
import { registerObjectWrapper } from "./base/AllGameObjects";
import Logger from "shared/utils/logger";

const logger = new Logger("StructureFactoryWrapper");

interface StructureFactoryWrapperData extends HasStorageWrapperData {
  level: number;
  cooldown: number;
}

export class StructureFactoryWrapper extends HasStorageWrapper<StructureFactory> implements StorableCreatableClass<StructureFactoryWrapper, typeof StructureFactoryWrapper, StructureFactoryWrapperData> {
  level: number;
  cooldown: number;

  static fromJSON(json: StructureFactoryWrapperData): StructureFactoryWrapper {
    const wrapper = new StructureFactoryWrapper(json.id as Id<StructureFactory>);
    HasStorageWrapper.fromJSON(json, wrapper);
    wrapper.level = json.level;
    wrapper.cooldown = json.cooldown;
    return wrapper;
  }

  constructor(id: string) {
    super(id as Id<StructureFactory>);
    this.level = 0;
    this.cooldown = 0;
  }

  update() {
    super.update();
    const factory = this.getObject();
    if (factory) {
      this.level = factory.level || 0;
      this.cooldown = factory.cooldown;
    }
  }

  toJSON(): StructureFactoryWrapperData {
    return {
      ...super.toJSON(),
      level: this.level,
      cooldown: this.cooldown,
    };
  }
}

registerObjectWrapper(StructureFactory, StructureFactoryWrapper);
