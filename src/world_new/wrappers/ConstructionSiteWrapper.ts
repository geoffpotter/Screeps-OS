import { GameObjectWrapper, GameObjectWrapperData } from "./base/GameObjectWrapper";
import { registerObjectWrapper } from "./base/AllGameObjects";
import { StorableCreatableClass } from "shared/utils/memory";
import { Build, BuildMemory } from "../actions/economy/Build";
import { ActionDemand } from "../actions/base/ActionHelpers";
import Logger from "shared/utils/logger";
let logger = new Logger("ConstructionSiteWrapper");
interface ConstructionSiteWrapperData extends GameObjectWrapperData {
  structureType: StructureConstant;
  progress: number;
  progressTotal: number;
  buildAction: BuildMemory;
}

export class ConstructionSiteWrapper extends GameObjectWrapper<ConstructionSite> implements StorableCreatableClass<ConstructionSiteWrapper, typeof ConstructionSiteWrapper, ConstructionSiteWrapperData> {
  structureType: StructureConstant;
  progress: number;
  progressTotal: number;
  buildAction: Build;

  static fromJSON(json: ConstructionSiteWrapperData): ConstructionSiteWrapper {
    const wrapper = new ConstructionSiteWrapper(json.id as Id<ConstructionSite>);
    wrapper.structureType = json.structureType;
    wrapper.progress = json.progress;
    wrapper.progressTotal = json.progressTotal;
    wrapper.buildAction = Build.fromJSON(json.buildAction);
    return wrapper;
  }

  toJSON(): ConstructionSiteWrapperData {
    return {
      ...super.toJSON(),
      structureType: this.structureType,
      progress: this.progress,
      progressTotal: this.progressTotal,
      buildAction: this.buildAction as unknown as BuildMemory,
    };
  }

  constructor(id: string) {
    super(id as Id<ConstructionSite>);
    this.structureType = STRUCTURE_SPAWN;
    this.progress = 0;
    this.progressTotal = 0;
    this.buildAction = new Build(this);
  }

  update() {
    super.update();
    const site = this.getObject();
    if (site) {
      this.structureType = site.structureType;
      this.progress = site.progress;
      this.progressTotal = site.progressTotal;
      this.buildAction.currentDemand = {
        [WORK]: Math.ceil((this.progressTotal - this.progress) / BUILD_POWER)
      } as ActionDemand;
    }
  }

  registerActions() {
    super.registerActions();
    if (this.colony) {
      logger.log(this.id, "registering actions");
      this.colony.registerAction(this.buildAction);
    }
  }
}

registerObjectWrapper(ConstructionSite, ConstructionSiteWrapper);
