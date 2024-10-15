import { KillableWrapper, KillableWrapperData } from "./base/KillableWrapper";
import { StorableCreatableClass } from "shared/utils/memory";
import { registerObjectWrapper } from "./base/AllGameObjects";
import { KillBuilding, KillBuildingMemory } from "../actions/military/KillBuilding";
import { ActionDemand } from "../actions/base/ActionHelpers";
import Logger from "shared/utils/logger";
let logger = new Logger("PowerBankWrapper");

interface PowerBankWrapperData extends KillableWrapperData {
  power: number;
  ticksToDecay: number;
  killBuildingAction: KillBuildingMemory;
}

export class PowerBankWrapper extends KillableWrapper<StructurePowerBank> implements StorableCreatableClass<PowerBankWrapper, typeof PowerBankWrapper, PowerBankWrapperData> {
  power: number;
  ticksToDecay: number;
  killBuildingAction: KillBuilding;

  static fromJSON(json: PowerBankWrapperData): PowerBankWrapper {
    const wrapper = new PowerBankWrapper(json.id as Id<StructurePowerBank>);
    wrapper.power = json.power;
    wrapper.ticksToDecay = json.ticksToDecay;
    wrapper.killBuildingAction = KillBuilding.fromJSON(json.killBuildingAction);
    return wrapper;
  }

  toJSON(): PowerBankWrapperData {
    return {
      ...super.toJSON(),
      power: this.power,
      ticksToDecay: this.ticksToDecay,
      killBuildingAction: this.killBuildingAction as unknown as KillBuildingMemory,
    };
  }

  constructor(id: string) {
    super(id as Id<StructurePowerBank>);
    this.power = 0;
    this.ticksToDecay = 0;
    this.killBuildingAction = new KillBuilding(this);
  }

  update() {
    super.update();
    const powerBank = this.getObject();
    if (powerBank) {
      this.power = powerBank.power;
      this.ticksToDecay = powerBank.ticksToDecay;
      this.killBuildingAction.currentDemand = this.power > 0 ? { [ATTACK]: 25 } : {} as ActionDemand;
    }
  }

  registerActions() {
    super.registerActions();
    if (this.colony) {
      logger.log(this.id, "registering actions");
      this.colony.registerAction(this.killBuildingAction);
    }
  }
}

registerObjectWrapper(StructurePowerBank, PowerBankWrapper);
