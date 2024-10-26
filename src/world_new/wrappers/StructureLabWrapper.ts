import { HasStorageWrapper, HasStorageWrapperData } from "./base/HasStorageWrapper";
import { StorableCreatableClass } from "shared/utils/memory";
import { registerObjectWrapper } from "./base/AllGameObjects";
import Logger from "shared/utils/logger";

const logger = new Logger("StructureLabWrapper");

interface StructureLabWrapperData extends HasStorageWrapperData {
  cooldown: number;
  mineralType: MineralConstant | MineralCompoundConstant | null;
}

export class StructureLabWrapper extends HasStorageWrapper<StructureLab> implements StorableCreatableClass<StructureLabWrapper, typeof StructureLabWrapper, StructureLabWrapperData> {
  cooldown: number;
  mineralType: MineralConstant | MineralCompoundConstant | null;

  static fromJSON(json: StructureLabWrapperData): StructureLabWrapper {
    const wrapper = new StructureLabWrapper(json.id as Id<StructureLab>);
    HasStorageWrapper.fromJSON(json, wrapper);
    wrapper.cooldown = json.cooldown;
    wrapper.mineralType = json.mineralType;
    return wrapper;
  }

  toJSON(): StructureLabWrapperData {
    return {
      ...super.toJSON(),
      cooldown: this.cooldown,
      mineralType: this.mineralType,
    };
  }

  constructor(id: string) {
    super(id as Id<StructureLab>);
    this.cooldown = 0;
    this.mineralType = null;
  }

  update() {
    super.update();
    const lab = this.getObject();
    if (lab) {
      this.cooldown = lab.cooldown;
      this.mineralType = lab.mineralType;
    }
  }

}

registerObjectWrapper(StructureLab, StructureLabWrapper);
