import { GameObjectWrapper, GameObjectWrapperData } from "./base/GameObjectWrapper";
import { registerObjectWrapper } from "./base/AllGameObjects";
import { StorableCreatableClass } from "shared/utils/memory";
import WorldPosition from "shared/utils/map/WorldPosition";

interface NukeWrapperData extends GameObjectWrapperData {
  timeToLand: number;
  launchRoomName: string;
}

export class NukeWrapper extends GameObjectWrapper<Nuke> implements StorableCreatableClass<NukeWrapper, typeof NukeWrapper, NukeWrapperData> {
  timeToLand: number;
  launchRoomName: string;

  static fromJSON(json: NukeWrapperData): NukeWrapper {
    const wrapper = new NukeWrapper(json.id as Id<Nuke>);
    wrapper.timeToLand = json.timeToLand;
    wrapper.launchRoomName = json.launchRoomName;
    return wrapper;
  }

  constructor(id: string) {
    super(id as Id<Nuke>);
    this.timeToLand = 0;
    this.launchRoomName = "";
  }

  update() {
    super.update();
    const nuke = this.getObject();
    if (nuke) {
      this.timeToLand = nuke.timeToLand;
      this.launchRoomName = nuke.launchRoomName;
    }
  }

  toJSON(): NukeWrapperData {
    return {
      ...super.toJSON(),
      timeToLand: this.timeToLand,
      launchRoomName: this.launchRoomName,
    };
  }
}

registerObjectWrapper(Nuke, NukeWrapper);
