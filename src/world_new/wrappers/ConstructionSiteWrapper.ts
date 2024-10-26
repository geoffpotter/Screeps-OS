import { GameObjectWrapper, GameObjectWrapperData } from "./base/GameObjectWrapper";
import { registerObjectWrapper } from "./base/AllGameObjects";
import { StorableCreatableClass } from "shared/utils/memory";
import { Build } from "../actions/economy/Build";
import Logger from "shared/utils/logger";
let logger = new Logger("ConstructionSiteWrapper");
interface ConstructionSiteWrapperData extends GameObjectWrapperData {
  structureType: StructureConstant;
  progress: number;
  progressTotal: number;
}

export class ConstructionSiteWrapper extends GameObjectWrapper<ConstructionSite> implements StorableCreatableClass<ConstructionSiteWrapper, typeof ConstructionSiteWrapper, ConstructionSiteWrapperData> {
  structureType: StructureConstant;
  progress: number;
  progressTotal: number;

  private _buildAction?: Build;

  static fromJSON(json: ConstructionSiteWrapperData): ConstructionSiteWrapper {
    const wrapper = new ConstructionSiteWrapper(json.id as Id<ConstructionSite>);
    wrapper.structureType = json.structureType;
    wrapper.progress = json.progress;
    wrapper.progressTotal = json.progressTotal;
    return wrapper;
  }

  toJSON(): ConstructionSiteWrapperData {
    return {
      ...super.toJSON(),
      structureType: this.structureType,
      progress: this.progress,
      progressTotal: this.progressTotal
    };
  }

  constructor(id: string) {
    super(id as Id<ConstructionSite>);
    this.structureType = STRUCTURE_SPAWN;
    this.progress = 0;
    this.progressTotal = 0;
  }

  getActionBuild(): Build {
    if (!this._buildAction) {
      this._buildAction = new Build(this);
    }
    return this._buildAction;
  }

  update() {
    super.update();
    const site = this.getObject();
    if (site) {
      this.structureType = site.structureType;
      this.progress = site.progress;
      this.progressTotal = site.progressTotal;
    }
  }
}

registerObjectWrapper(ConstructionSite, ConstructionSiteWrapper);
