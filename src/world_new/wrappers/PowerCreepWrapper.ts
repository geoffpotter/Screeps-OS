import { HasStorageWrapper, HasStorageWrapperData } from "./base/HasStorageWrapper";
import { StorableCreatableClass } from "shared/utils/memory";
import { registerObjectWrapper } from "./base/AllGameObjects";

interface PowerCreepWrapperData extends HasStorageWrapperData {
  level: number;
  className: PowerClassConstant;
  shard: string | null;
  spawnCooldownTime: number | null;
}

export class PowerCreepWrapper extends HasStorageWrapper<PowerCreep> implements StorableCreatableClass<PowerCreepWrapper, typeof PowerCreepWrapper, PowerCreepWrapperData> {
  level: number;
  className: PowerClassConstant;
  shard: string | null;
  spawnCooldownTime: number | null;

  static fromJSON(json: PowerCreepWrapperData): PowerCreepWrapper {
    const wrapper = new PowerCreepWrapper(json.id as Id<PowerCreep>);
    wrapper.level = json.level;
    wrapper.className = json.className;
    wrapper.shard = json.shard;
    wrapper.spawnCooldownTime = json.spawnCooldownTime;
    return wrapper;
  }

  toJSON(): PowerCreepWrapperData {
    return {
      ...super.toJSON(),
      level: this.level,
      className: this.className,
      shard: this.shard,
      spawnCooldownTime: this.spawnCooldownTime,
    };
  }

  constructor(id: string) {
    super(id as Id<PowerCreep>);
    this.level = 0;
    this.className = POWER_CLASS.OPERATOR;
    this.shard = null;
    this.spawnCooldownTime = null;
  }

  update() {
    super.update();
    const powerCreep = this.getObject();
    if (powerCreep) {
      this.level = powerCreep.level;
      this.className = powerCreep.className;
      this.shard = powerCreep.shard || null;
      this.spawnCooldownTime = powerCreep.spawnCooldownTime || null;
      this.store.updateFromStore(powerCreep.store);
    }
  }
}

registerObjectWrapper(PowerCreep, PowerCreepWrapper);
