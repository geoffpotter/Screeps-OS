import { registerObjectWrapper } from "./base/AllGameObjects";
import { GameObjectWrapper } from "./base/GameObjectWrapper";
import { StorableCreatableClass } from "shared/utils/memory";
import { BaseAction } from "../actions/base/BaseAction";
import { HarvestAction } from "../actions/economy/HarvestAction";
import CreepWrapper from "./creep/CreepWrapper";
import { GameObjectWrapperData } from "./base/GameObjectWrapper";
import { getRoomIntel, playerName } from "shared/subsystems/intel/intel";
import Logger from "shared/utils/logger";
import Empire from "world_new/Empire";
let logger = new Logger("SourceWrapper");

interface SourceWrapperJSON extends GameObjectWrapperData {
  energy: number;
  energyCapacity: number;
  ticksToRegeneration: number;
}

export class SourceWrapper extends GameObjectWrapper<Source> implements StorableCreatableClass<SourceWrapper, typeof SourceWrapper, SourceWrapperJSON> {
  static fromJSON(json: SourceWrapperJSON): SourceWrapper {
    let wrapper = new SourceWrapper(json.id as Id<Source>);
    wrapper.energy = json.energy;
    wrapper.energyCapacity = json.energyCapacity;
    wrapper.ticksToRegeneration = json.ticksToRegeneration;
    return wrapper;
  }

  energy: number;
  energyCapacity: number;
  ticksToRegeneration: number;
  harvestAction: HarvestAction;

  constructor(id: string) {
    super(id as Id<Source>);
    this.energy = 0;
    this.energyCapacity = 0;
    this.ticksToRegeneration = 0;
    this.harvestAction = new HarvestAction(this);
  }
  delete() {
    super.delete();
    Empire.unregisterAction(this.harvestAction);
  }
  init() {
    super.init();
    this.update();
    this.harvestAction.display();
  }
  registerActions(): void {
    super.registerActions();
    if (this.colony) {
      this.colony.registerAction(this.harvestAction);
    }
  }
  update() {
    super.update();
    let source = this.getObject();
    if (source) {

      this.energy = source.energy;
      this.energyCapacity = source.energyCapacity;
      this.ticksToRegeneration = source.ticksToRegeneration;

      this.harvestAction.currentDemand = this.harvestAction.calculateDemand();
      if (this.harvestAction.maxAssignments == 0) {
        let surrounding = this.wpos.toRoomPosition().getSurroundingClearSpaces();
        // logger.log("SourceWrapper", "update", "surrounding", surrounding.length, surrounding.map(s=>s.x+","+s.y));
        this.harvestAction.maxAssignments = surrounding.length;
      }
    }
  }

  canBeHarvested(): boolean {
    return this.energy > 0;
  }

  toJSON(): SourceWrapperJSON {
    return {
      ...super.toJSON(),
      energy: this.energy,
      energyCapacity: this.energyCapacity,
      ticksToRegeneration: this.ticksToRegeneration,
    };
  }
}

registerObjectWrapper(Source, SourceWrapper);
