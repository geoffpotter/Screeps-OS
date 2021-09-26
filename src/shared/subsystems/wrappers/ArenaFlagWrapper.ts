import { Flag } from "arena/prototypes";
import { getSettings } from "shared/utils";
import { createObjectWrapper, GameObjectWrapper, getObjectWrapper } from "./GameObjectWrapper";
import { StructureWrapper } from "./StructureWrapper";


declare module "arena" {
  interface Flag {
    getWrapper():ArenaFlagWrapper;
  }
}

Flag.prototype.getWrapper = function() {
  let wrapper:ArenaFlagWrapper|false = getObjectWrapper(this);
  if(wrapper)
    return wrapper;

  wrapper = createObjectWrapper<Flag, ArenaFlagWrapper>(ArenaFlagWrapper, this);
  return wrapper;
}


export class ArenaFlagWrapper extends GameObjectWrapper<Flag> {

  get my() {
    //@ts-ignore .my could not exist, pretty sure I've handled it though(!!s)
    return !!this.get().my;
  }
  get enemy() {
    //@ts-ignore
    return !!this.get().my === false;
  }
  get neutral() {
    //@ts-ignore
    return !!this.get().my === undefined;
  }


  constructor(flag: Flag) {
    super(flag);
  }
}
