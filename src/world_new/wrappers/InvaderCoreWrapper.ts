import { KillableWrapper, KillableWrapperData } from "./base/KillableWrapper";
import { StorableCreatableClass } from "shared/utils/memory";
import { registerObjectWrapper } from "./base/AllGameObjects";
import { KillBuilding } from "../actions/military/KillBuilding";
import Logger from "shared/utils/logger";
let logger = new Logger("InvaderCoreWrapper");

interface InvaderCoreWrapperData extends KillableWrapperData {
  level: number;
  ticksToDeploy: number;
  effects: RoomObjectEffect[];
}

export class InvaderCoreWrapper extends KillableWrapper<StructureInvaderCore> implements StorableCreatableClass<InvaderCoreWrapper, typeof InvaderCoreWrapper, InvaderCoreWrapperData> {
  level: number;
  ticksToDeploy: number;
  effects: RoomObjectEffect[];
  private _killBuildingAction?: KillBuilding;

  static fromJSON(json: InvaderCoreWrapperData): InvaderCoreWrapper {
    const wrapper = new InvaderCoreWrapper(json.id as Id<StructureInvaderCore>);
    wrapper.level = json.level;
    wrapper.ticksToDeploy = json.ticksToDeploy;
    wrapper.effects = json.effects;
    return wrapper;
  }

  toJSON(): InvaderCoreWrapperData {
    return {
      ...super.toJSON(),
      level: this.level,
      ticksToDeploy: this.ticksToDeploy,
      effects: this.effects,
    };
  }

  constructor(id: string) {
    super(id as Id<StructureInvaderCore>);
    this.level = 0;
    this.ticksToDeploy = 0;
    this.effects = [];
  }

  getActionKillBuilding(): KillBuilding {
    if (!this._killBuildingAction) {
      this._killBuildingAction = new KillBuilding(this);
    }
    return this._killBuildingAction;
  }

  update() {
    super.update();
    const invaderCore = this.getObject();
    if (invaderCore) {
      this.level = invaderCore.level;
      this.ticksToDeploy = invaderCore.ticksToDeploy;
      this.effects = invaderCore.effects;
    }
  }
}

registerObjectWrapper(StructureInvaderCore, InvaderCoreWrapper);
