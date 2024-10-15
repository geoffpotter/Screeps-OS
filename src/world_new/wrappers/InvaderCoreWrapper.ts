import { KillableWrapper, KillableWrapperData } from "./base/KillableWrapper";
import { StorableCreatableClass } from "shared/utils/memory";
import { registerObjectWrapper } from "./base/AllGameObjects";
import { KillBuilding, KillBuildingMemory } from "../actions/military/KillBuilding";
import { ActionDemand } from "../actions/base/ActionHelpers";
import Logger from "shared/utils/logger";
let logger = new Logger("InvaderCoreWrapper");

interface InvaderCoreWrapperData extends KillableWrapperData {
  level: number;
  ticksToDeploy: number;
  effects: RoomObjectEffect[];
  killBuildingAction: KillBuildingMemory;
}

export class InvaderCoreWrapper extends KillableWrapper<StructureInvaderCore> implements StorableCreatableClass<InvaderCoreWrapper, typeof InvaderCoreWrapper, InvaderCoreWrapperData> {
  level: number;
  ticksToDeploy: number;
  effects: RoomObjectEffect[];
  killBuildingAction: KillBuilding;

  static fromJSON(json: InvaderCoreWrapperData): InvaderCoreWrapper {
    const wrapper = new InvaderCoreWrapper(json.id as Id<StructureInvaderCore>);
    wrapper.level = json.level;
    wrapper.ticksToDeploy = json.ticksToDeploy;
    wrapper.effects = json.effects;
    wrapper.killBuildingAction = KillBuilding.fromJSON(json.killBuildingAction);
    return wrapper;
  }
  toJSON(): InvaderCoreWrapperData {
    return {
      ...super.toJSON(),
      level: this.level,
      ticksToDeploy: this.ticksToDeploy,
      effects: this.effects,
      killBuildingAction: this.killBuildingAction as unknown as KillBuildingMemory,
    };
  }

  constructor(id: string) {
    super(id as Id<StructureInvaderCore>);
    this.level = 0;
    this.ticksToDeploy = 0;
    this.effects = [];
    this.killBuildingAction = new KillBuilding(this);
  }

  update() {
    super.update();
    const invaderCore = this.getObject();
    if (invaderCore) {
      this.level = invaderCore.level;
      this.ticksToDeploy = invaderCore.ticksToDeploy;
      this.effects = invaderCore.effects;
      this.killBuildingAction.currentDemand = this.ticksToDeploy > 0 ? { [ATTACK]: 1, [RANGED_ATTACK]: 1 } : {} as ActionDemand;
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

registerObjectWrapper(StructureInvaderCore, InvaderCoreWrapper);
