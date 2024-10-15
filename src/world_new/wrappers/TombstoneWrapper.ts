import { GameObjectWrapper, GameObjectWrapperData } from "./base/GameObjectWrapper";
import { registerObjectWrapper } from "./base/AllGameObjects";
import { StorableCreatableClass } from "shared/utils/memory";
import { HasStorageWrapper, HasStorageWrapperData } from "./base/HasStorageWrapper";


// lie to ts that Tombstone has hits and hitsMax
declare global {
    interface Tombstone {
        hits: number;
        hitsMax: number;
    }
}

interface TombstoneWrapperData extends HasStorageWrapperData {
  deathTime: number;
  ticksToDecay: number;
}

export class TombstoneWrapper extends HasStorageWrapper<Tombstone> implements StorableCreatableClass<TombstoneWrapper, typeof TombstoneWrapper, TombstoneWrapperData> {
  deathTime: number;
  ticksToDecay: number;

  static fromJSON(json: TombstoneWrapperData): TombstoneWrapper {
    const wrapper = new TombstoneWrapper(json.id as Id<Tombstone>);
    wrapper.deathTime = json.deathTime;
    wrapper.ticksToDecay = json.ticksToDecay;
    return wrapper;
  }
  toJSON(): TombstoneWrapperData {
    return {
      ...super.toJSON(),
      deathTime: this.deathTime,
      ticksToDecay: this.ticksToDecay,
    };
  }

  constructor(id: string) {
    super(id as Id<Tombstone>);
    this.deathTime = 0;
    this.ticksToDecay = 0;
    this.timeout = 1;
  }

  update() {
    super.update();
    const tombstone = this.getObject();
    if (tombstone) {
      this.deathTime = tombstone.deathTime;
      this.ticksToDecay = tombstone.ticksToDecay;
    }
  }

}

registerObjectWrapper(Tombstone, TombstoneWrapper);
