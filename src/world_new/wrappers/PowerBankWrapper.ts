import { KillableWrapper, KillableWrapperData } from "./base/KillableWrapper";
import { StorableCreatableClass } from "shared/utils/memory";
import { registerObjectWrapper } from "./base/AllGameObjects";
import { KillBuilding } from "../actions/military/KillBuilding";
import { ActionDemand } from "../actions/base/ActionDemand";
import Logger from "shared/utils/logger";
let logger = new Logger("PowerBankWrapper");

interface PowerBankWrapperData extends KillableWrapperData {
  power: number;
  ticksToDecay: number;
}

export class PowerBankWrapper extends KillableWrapper<StructurePowerBank> implements StorableCreatableClass<PowerBankWrapper, typeof PowerBankWrapper, PowerBankWrapperData> {
  power: number;
  ticksToDecay: number;
  private _killBuildingAction?: KillBuilding;

  static fromJSON(json: PowerBankWrapperData): PowerBankWrapper {
    const wrapper = new PowerBankWrapper(json.id as Id<StructurePowerBank>);
    wrapper.power = json.power;
    wrapper.ticksToDecay = json.ticksToDecay;
    return wrapper;
  }

  toJSON(): PowerBankWrapperData {
    return {
      ...super.toJSON(),
      power: this.power,
      ticksToDecay: this.ticksToDecay,
    };
  }

  constructor(id: string) {
    super(id as Id<StructurePowerBank>);
    this.power = 0;
    this.ticksToDecay = 0;
  }

  getActionKillBuilding(): KillBuilding {
    if (!this._killBuildingAction) {
      this._killBuildingAction = new KillBuilding(this);
    }
    return this._killBuildingAction;
  }

  update() {
    super.update();
    const powerBank = this.getObject();
    if (powerBank) {
      this.power = powerBank.power;
      this.ticksToDecay = powerBank.ticksToDecay;
    }
  }
}

registerObjectWrapper(StructurePowerBank, PowerBankWrapper);
