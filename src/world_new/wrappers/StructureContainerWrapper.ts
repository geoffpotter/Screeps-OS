import { HasStorageWrapper, HasStorageWrapperData } from "./base/HasStorageWrapper";
import { StorableCreatableClass } from "shared/utils/memory";
import { BaseAction } from "../actions/base/BaseAction";
import CreepWrapper from "./creep/CreepWrapper";
import { registerObjectWrapper } from "./base/AllGameObjects";

interface StructureContainerWrapperData extends HasStorageWrapperData {
  ticksToDecay: number;
}

export class StructureContainerWrapper extends HasStorageWrapper<StructureContainer> implements StorableCreatableClass<StructureContainerWrapper, typeof StructureContainerWrapper, StructureContainerWrapperData> {
  ticksToDecay: number;

  static fromJSON(json: StructureContainerWrapperData): StructureContainerWrapper {
    const wrapper = new StructureContainerWrapper(json.id as Id<StructureContainer>);
    wrapper.ticksToDecay = json.ticksToDecay;
    return wrapper;
  }
  toJSON(): StructureContainerWrapperData {
    return {
      ...super.toJSON(),
      ticksToDecay: this.ticksToDecay,
    };
  }

  constructor(id: string) {
    super(id as Id<StructureContainer>);
    this.ticksToDecay = 0;
  }

  update() {
    super.update();
    const container = this.getObject();
    if (container) {
      this.ticksToDecay = container.ticksToDecay;
    }
  }
}

registerObjectWrapper(StructureContainer, StructureContainerWrapper);
