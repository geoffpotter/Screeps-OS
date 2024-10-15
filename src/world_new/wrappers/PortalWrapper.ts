import { GameObjectWrapper, GameObjectWrapperData } from "./base/GameObjectWrapper";
import { registerObjectWrapper } from "./base/AllGameObjects";
import { StorableCreatableClass } from "shared/utils/memory";
import { BaseAction } from "../actions/base/BaseAction";
import CreepWrapper from "./creep/CreepWrapper";

interface PortalWrapperData extends GameObjectWrapperData {
  destination: {
    shard: string | null;
    room: string | null;
    x: number | null;
    y: number | null;
  };
  ticksToDecay: number | undefined;
}

export class PortalWrapper extends GameObjectWrapper<StructurePortal> implements StorableCreatableClass<PortalWrapper, typeof PortalWrapper, PortalWrapperData> {
  destination: {
    shard: string | null;
    room: string | null;
    x: number | null;
    y: number | null;
  };
  ticksToDecay: number | undefined;

  static fromJSON(json: PortalWrapperData): PortalWrapper {
    const wrapper = new PortalWrapper(json.id as Id<StructurePortal>);
    wrapper.destination = json.destination;
    wrapper.ticksToDecay = json.ticksToDecay;
    return wrapper;
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

  toJSON(): PortalWrapperData {
    return {
      ...super.toJSON(),
      destination: this.destination,
      ticksToDecay: this.ticksToDecay,
    };
  }
}
