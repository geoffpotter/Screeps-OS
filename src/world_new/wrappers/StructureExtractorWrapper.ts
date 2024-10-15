import { KillableWrapper, KillableWrapperData } from "./base/KillableWrapper";
import { StorableCreatableClass } from "shared/utils/memory";
import { BaseAction } from "../actions/base/BaseAction";
import CreepWrapper from "./creep/CreepWrapper";
import { registerObjectWrapper } from "./base/AllGameObjects";

interface StructureExtractorWrapperData extends KillableWrapperData {
  cooldown: number;
}

export class StructureExtractorWrapper extends KillableWrapper<StructureExtractor> implements StorableCreatableClass<StructureExtractorWrapper, typeof StructureExtractorWrapper, StructureExtractorWrapperData> {
  cooldown: number;

  static fromJSON(json: StructureExtractorWrapperData): StructureExtractorWrapper {
    const wrapper = new StructureExtractorWrapper(json.id as Id<StructureExtractor>);
    wrapper.cooldown = json.cooldown;
    return wrapper;
  }
  toJSON(): StructureExtractorWrapperData {
    return {
      ...super.toJSON(),
      cooldown: this.cooldown,
    };
  }

  constructor(id: string) {
    super(id as Id<StructureExtractor>);
    this.cooldown = 0;
  }

  update() {
    super.update();
    const extractor = this.getObject();
    if (extractor) {
      this.cooldown = extractor.cooldown;
    }
  }

}

registerObjectWrapper(StructureExtractor, StructureExtractorWrapper);
