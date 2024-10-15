import { HasStorageWrapper, HasStorageWrapperData } from "./base/HasStorageWrapper";
import { StorableCreatableClass } from "shared/utils/memory";
import { BaseAction } from "../actions/base/BaseAction";
import CreepWrapper from "./creep/CreepWrapper";
import { registerObjectWrapper } from "./base/AllGameObjects";

interface StructureTerminalWrapperData extends HasStorageWrapperData {
  cooldown: number;
}

export class StructureTerminalWrapper extends HasStorageWrapper<StructureTerminal> implements StorableCreatableClass<StructureTerminalWrapper, typeof StructureTerminalWrapper, StructureTerminalWrapperData> {
  cooldown: number;

  static fromJSON(json: StructureTerminalWrapperData): StructureTerminalWrapper {
    const wrapper = new StructureTerminalWrapper(json.id as Id<StructureTerminal>);
    wrapper.cooldown = json.cooldown;
    return wrapper;
  }
  toJSON(): StructureTerminalWrapperData {
    return {
      ...super.toJSON(),
      cooldown: this.cooldown,
    };
  }

  constructor(id: string) {
    super(id as Id<StructureTerminal>);
    this.cooldown = 0;
  }

  update() {
    super.update();
    const terminal = this.getObject();
    if (terminal) {
      this.cooldown = terminal.cooldown;
    }
  }

}

registerObjectWrapper(StructureTerminal, StructureTerminalWrapper);
