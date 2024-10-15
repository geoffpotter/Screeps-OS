import { GameObjectWrapper, GameObjectWrapperData } from "./base/GameObjectWrapper";
import { registerObjectWrapper } from "./base/AllGameObjects";
import { StorableCreatableClass } from "shared/utils/memory";
import { HasStorageWrapper, HasStorageWrapperData } from "./base/HasStorageWrapper";


// lie to ts that Ruin has hits and hitsMax
declare global {
    interface Ruin {
        hits: number;
        hitsMax: number;
    }
}

interface RuinWrapperData extends HasStorageWrapperData {
  destroyTime: number;
  ticksToDecay: number;
  structure: StructureConstant;
}

export class RuinWrapper extends HasStorageWrapper<Ruin> implements StorableCreatableClass<RuinWrapper, typeof RuinWrapper, RuinWrapperData> {
  destroyTime: number;
  ticksToDecay: number;
  structure: StructureConstant;

  static fromJSON(json: RuinWrapperData): RuinWrapper {
    const wrapper = new RuinWrapper(json.id as Id<Ruin>);
    wrapper.destroyTime = json.destroyTime;
    wrapper.ticksToDecay = json.ticksToDecay;
    wrapper.structure = json.structure;
    return wrapper;
  }

  toJSON(): RuinWrapperData {
    return {
      ...super.toJSON(),
      destroyTime: this.destroyTime,
      ticksToDecay: this.ticksToDecay,
      structure: this.structure,
    };
  }

  constructor(id: string) {
    super(id as Id<Ruin>);
    this.destroyTime = 0;
    this.ticksToDecay = 0;
    this.structure = STRUCTURE_SPAWN;
  }

  update() {
    super.update();
    const ruin = this.getObject();
    if (ruin) {
      this.destroyTime = ruin.destroyTime;
      this.ticksToDecay = ruin.ticksToDecay;
      this.structure = ruin.structure.structureType;
      this.store.updateFromStore(ruin.store);
    }
  }
}

registerObjectWrapper(Ruin, RuinWrapper);
