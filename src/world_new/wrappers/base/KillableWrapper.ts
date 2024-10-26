import { KillBuilding } from "../../actions/military/KillBuilding";
import { GameObject, GameObjectWrapper, GameObjectWrapperData } from "./GameObjectWrapper";
import queues from "../../queues";
import { setInterval } from "shared/polyfills";
import { StorableClass } from "shared/utils/memory";
import { KillCreep } from "world_new/actions/military/KillCreep";
import Logger from "shared/utils/logger";
import empire from "world_new/Empire";
import { CreepWrapper } from "..";

const logger = new Logger("KillableWrapper");
logger.color = COLOR_RED
logger.enabled = false;
export type AnyKillableWrapper = KillableWrapper<killableGameObject>;

export interface killableGameObject extends GameObject {
  hits: number,
  hitsMax: number
}

export interface KillableWrapperData extends GameObjectWrapperData {
  isCreep: boolean;
  _hits: number;
  _hitsMax: number;
}

export class KillableWrapper<T extends killableGameObject> extends GameObjectWrapper<T> implements StorableClass<KillableWrapper<T>, typeof KillableWrapper, GameObjectWrapperData> {
  static fromJSON(json: KillableWrapperData, wrapper?: KillableWrapper<any>): KillableWrapper<any> {
    if(!wrapper) {
      throw new Error("KillableWrapper.fromJSON requires a wrapper");
    }
    GameObjectWrapper.fromJSON(json, wrapper);
    wrapper.isCreep = json.isCreep;
    wrapper._hits = json._hits;
    wrapper._hitsMax = json._hitsMax;
    return wrapper;
  }
  toJSON(): KillableWrapperData {
    return {
      ...super.toJSON(),
      isCreep: this.isCreep,
      _hits: this._hits,
      _hitsMax: this._hitsMax,
    };
  }

  private _actionKill?: KillBuilding | KillCreep;

  getActionKill(): KillBuilding | KillCreep {
    if (!this._actionKill) {
      this._actionKill = this.isCreep ? new KillCreep(this as unknown as CreepWrapper) : new KillBuilding(this);
    }
    return this._actionKill;
  }

  actionKill: KillBuilding | KillCreep | undefined = undefined;
  private _hits: number = 0;
  private _hitsMax: number = 0;
  protected isCreep: boolean = false;
  get hits() {
    return this._hits;
  }
  get hitsMax() {
    return this._hitsMax;
  }

  constructor(id: Id<T>) {
    super(id);
  }

  delete() {
    super.delete();
    if(this._actionKill) {
      this._actionKill.unassignAll();
    }
  }

  update() {
    super.update();

    let obj = this.getObject();
    if (obj) {
      this._hits = obj.hits;
      this._hitsMax = obj.hitsMax;
    }
  }
}
