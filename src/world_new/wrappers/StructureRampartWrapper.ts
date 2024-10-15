import { KillableWrapper, KillableWrapperData } from "./base/KillableWrapper";
import { StorableCreatableClass } from "shared/utils/memory";
import { BaseAction } from "../actions/base/BaseAction";
import CreepWrapper from "./creep/CreepWrapper";
import { registerObjectWrapper } from "./base/AllGameObjects";

interface StructureRampartWrapperData extends KillableWrapperData {
  isPublic: boolean;
  ticksToDecay: number;
}

export class StructureRampartWrapper extends KillableWrapper<StructureRampart> implements StorableCreatableClass<StructureRampartWrapper, typeof StructureRampartWrapper, StructureRampartWrapperData> {
  isPublic: boolean;
  ticksToDecay: number;

  static fromJSON(json: StructureRampartWrapperData): StructureRampartWrapper {
    const wrapper = new StructureRampartWrapper(json.id as Id<StructureRampart>);
    wrapper.isPublic = json.isPublic;
    wrapper.ticksToDecay = json.ticksToDecay;
    return wrapper;
  }
  toJSON(): StructureRampartWrapperData {
    return {
      ...super.toJSON(),
      isPublic: this.isPublic,
      ticksToDecay: this.ticksToDecay,
    };
  }

  constructor(id: string) {
    super(id as Id<StructureRampart>);
    this.isPublic = false;
    this.ticksToDecay = 0;
  }

  update() {
    super.update();
    const rampart = this.getObject();
    if (rampart) {
      this.isPublic = rampart.isPublic;
      this.ticksToDecay = rampart.ticksToDecay;
    }
  }

}

registerObjectWrapper(StructureRampart, StructureRampartWrapper);
