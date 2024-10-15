import { HasStorageWrapper, HasStorageWrapperData } from "./base/HasStorageWrapper";
import { StorableCreatableClass } from "shared/utils/memory";
import { BaseAction } from "../actions/base/BaseAction";
import CreepWrapper from "./creep/CreepWrapper";
import { registerObjectWrapper } from "./base/AllGameObjects";

interface StructureLinkWrapperData extends HasStorageWrapperData {
  cooldown: number;
}

export class StructureLinkWrapper extends HasStorageWrapper<StructureLink> implements StorableCreatableClass<StructureLinkWrapper, typeof StructureLinkWrapper, StructureLinkWrapperData> {
  cooldown: number;

  static fromJSON(json: StructureLinkWrapperData): StructureLinkWrapper {
    const wrapper = new StructureLinkWrapper(json.id as Id<StructureLink>);
    wrapper.cooldown = json.cooldown;
    return wrapper;
  }

  toJSON(): StructureLinkWrapperData {
    return {
      ...super.toJSON(),
      cooldown: this.cooldown,
    };
  }

  constructor(id: string) {
    super(id as Id<StructureLink>);
    this.cooldown = 0;
  }

  update() {
    super.update();
    const link = this.getObject();
    if (link) {
      this.cooldown = link.cooldown;
    }
  }
}

registerObjectWrapper(StructureLink, StructureLinkWrapper);
