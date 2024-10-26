import { GameObjectWrapper, GameObjectWrapperData } from "./base/GameObjectWrapper";
import { registerObjectWrapper } from "./base/AllGameObjects";
import { StorableCreatableClass } from "shared/utils/memory";
import { HarvestAction } from "../actions/economy/HarvestAction";

interface SourceWrapperData extends GameObjectWrapperData {
  energy: number;
  energyCapacity: number;
  ticksToRegeneration: number;
}

export class SourceWrapper extends GameObjectWrapper<Source> implements StorableCreatableClass<SourceWrapper, typeof SourceWrapper, SourceWrapperData> {
  energy: number;
  energyCapacity: number;
  ticksToRegeneration: number;
  private _harvestAction?: HarvestAction;

  static fromJSON(json: SourceWrapperData): SourceWrapper {
    const wrapper = new SourceWrapper(json.id as Id<Source>);
    wrapper.energy = json.energy;
    wrapper.energyCapacity = json.energyCapacity;
    wrapper.ticksToRegeneration = json.ticksToRegeneration;
    return wrapper;
  }

  constructor(id: string) {
    super(id as Id<Source>);
    this.energy = 0;
    this.energyCapacity = 0;
    this.ticksToRegeneration = 0;
  }

  getActionHarvest(): HarvestAction {
    if (!this._harvestAction) {
      this._harvestAction = new HarvestAction(this);
    }
    return this._harvestAction;
  }

  update() {
    super.update();
    const source = this.getObject();
    if (source) {
      this.energy = source.energy;
      this.energyCapacity = source.energyCapacity;
      this.ticksToRegeneration = source.ticksToRegeneration;
    }
  }

  toJSON(): SourceWrapperData {
    return {
      ...super.toJSON(),
      energy: this.energy,
      energyCapacity: this.energyCapacity,
      ticksToRegeneration: this.ticksToRegeneration,
    };
  }
}

registerObjectWrapper(Source, SourceWrapper);
