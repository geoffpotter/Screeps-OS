import { GameObjectWrapper, GameObjectWrapperData } from "./base/GameObjectWrapper";
import { registerObjectWrapper } from "./base/AllGameObjects";
import { StorableCreatableClass } from "shared/utils/memory";
import { HarvestAction } from "../actions/economy/HarvestAction";
import Logger from "shared/utils/logger";
let logger = new Logger("DepositWrapper");

interface DepositWrapperData extends GameObjectWrapperData {
  depositType: DepositConstant;
  cooldown: number;
  ticksToDecay: number;
}

export class DepositWrapper extends GameObjectWrapper<Deposit> implements StorableCreatableClass<DepositWrapper, typeof DepositWrapper, DepositWrapperData> {
  depositType: DepositConstant;
  cooldown: number;
  ticksToDecay: number;
  private _harvestAction?: HarvestAction;

  static fromJSON(json: DepositWrapperData): DepositWrapper {
    const wrapper = new DepositWrapper(json.id as Id<Deposit>);
    wrapper.depositType = json.depositType;
    wrapper.cooldown = json.cooldown;
    wrapper.ticksToDecay = json.ticksToDecay;
    return wrapper;
  }

  constructor(id: string) {
    super(id as Id<Deposit>);
    this.depositType = RESOURCE_MIST;
    this.cooldown = 0;
    this.ticksToDecay = 0;
  }

  getActionHarvest(): HarvestAction {
    if (!this._harvestAction) {
      this._harvestAction = new HarvestAction(this);
    }
    return this._harvestAction;
  }

  update() {
    super.update();
    const deposit = this.getObject();
    if (deposit) {
      this.depositType = deposit.depositType;
      this.cooldown = deposit.cooldown;
      this.ticksToDecay = deposit.ticksToDecay;
    }
  }

  canBeHarvested(): boolean {
    return this.cooldown === 0;
  }

  toJSON(): DepositWrapperData {
    return {
      ...super.toJSON(),
      depositType: this.depositType,
      cooldown: this.cooldown,
      ticksToDecay: this.ticksToDecay,
    };
  }
}

registerObjectWrapper(Deposit, DepositWrapper);
