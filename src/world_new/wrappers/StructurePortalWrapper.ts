import { GameObjectWrapper, GameObjectWrapperData } from "./base/GameObjectWrapper";
import { StorableCreatableClass } from "shared/utils/memory";
import { BaseAction } from "../actions/base/BaseAction";
import CreepWrapper from "./creep/CreepWrapper";
import { registerObjectWrapper } from "./base/AllGameObjects";
import { KillableWrapper, KillableWrapperData } from "./base/KillableWrapper";

interface StructurePortalWrapperData extends KillableWrapperData {
  destination: {
    shard: string | null;
    room: string | null;
    x: number | null;
    y: number | null;
  };
  ticksToDecay: number | undefined;
}

export class StructurePortalWrapper extends KillableWrapper<StructurePortal> implements StorableCreatableClass<StructurePortalWrapper, typeof StructurePortalWrapper, StructurePortalWrapperData> {
  destination: {
    shard: string | null;
    room: string | null;
    x: number | null;
    y: number | null;
  };
  ticksToDecay: number | undefined;

  static fromJSON(json: StructurePortalWrapperData): StructurePortalWrapper {
    const wrapper = new StructurePortalWrapper(json.id as Id<StructurePortal>);
    wrapper.destination = json.destination;
    wrapper.ticksToDecay = json.ticksToDecay;
    return wrapper;
  }

  toJSON(): StructurePortalWrapperData {
    return {
      ...super.toJSON(),
      destination: this.destination,
      ticksToDecay: this.ticksToDecay,
    };
  }

  constructor(id: string) {
    super(id as Id<StructurePortal>);
    this.destination = {
      shard: null,
      room: null,
      x: null,
      y: null,
    };
    this.ticksToDecay = undefined;
  }

  update() {
    super.update();
    const portal = this.getObject();
    if (portal) {
      if (portal.destination instanceof RoomPosition) {
        this.destination = {
          shard: null,
          room: portal.destination.roomName,
          x: portal.destination.x,
          y: portal.destination.y,
        };
      } else {
        this.destination = {
          shard: portal.destination.shard,
          room: portal.destination.room,
          x: null,
          y: null,
        };
      }
      this.ticksToDecay = portal.ticksToDecay;
    }
  }
}

registerObjectWrapper(StructurePortal, StructurePortalWrapper);
