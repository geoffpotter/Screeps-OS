import { GameObjectWrapper, GameObjectWrapperData } from "./base/GameObjectWrapper";
import { registerObjectWrapper } from "./base/AllGameObjects";
import { StorableCreatableClass } from "shared/utils/memory";
import { HarvestAction } from "../actions/economy/HarvestAction";
import Logger from "shared/utils/logger";
let logger = new Logger("MineralWrapper");

interface MineralWrapperData extends GameObjectWrapperData {
  mineralType: MineralConstant;
  density: number;
  mineralAmount: number;
}

export class MineralWrapper extends GameObjectWrapper<Mineral> implements StorableCreatableClass<MineralWrapper, typeof MineralWrapper, MineralWrapperData> {
  mineralType: MineralConstant;
  density: number;
  mineralAmount: number;
  private _harvestAction?: HarvestAction;

  static fromJSON(json: MineralWrapperData): MineralWrapper {
    const wrapper = new MineralWrapper(json.id as Id<Mineral>);
    wrapper.mineralType = json.mineralType;
    wrapper.density = json.density;
    wrapper.mineralAmount = json.mineralAmount;
    return wrapper;
  }

  constructor(id: string) {
    super(id as Id<Mineral>);
    this.mineralType = RESOURCE_HYDROGEN;
    this.density = 1;
    this.mineralAmount = 0;
  }

  getActionHarvest(): HarvestAction {
    if (!this._harvestAction) {
      this._harvestAction = new HarvestAction(this);
    }
    return this._harvestAction;
  }

  update() {
    super.update();
    const mineral = this.getObject();
    if (mineral) {
      this.mineralType = mineral.mineralType;
      this.density = mineral.density;
      this.mineralAmount = mineral.mineralAmount;
    }
  }

  canBeHarvested(): boolean {
    return this.mineralAmount > 0;
  }

  toJSON(): MineralWrapperData {
    return {
      ...super.toJSON(),
      mineralType: this.mineralType,
      density: this.density,
      mineralAmount: this.mineralAmount,
    };
  }
}

registerObjectWrapper(Mineral, MineralWrapper);
