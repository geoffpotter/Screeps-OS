import { KillBuilding, KillBuildingMemory } from "../../actions/military/KillBuilding";
import { GameObject, GameObjectWrapper, GameObjectWrapperData } from "./GameObjectWrapper";
import queues from "../../queues";
import { setInterval } from "shared/polyfills";
import { StorableClass } from "shared/utils/memory";
import { KillCreep, KillCreepMemory } from "world_new/actions/military/KillCreep";
import Logger from "shared/utils/logger";
import empire from "world_new/Empire";

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
  actionKill: KillBuildingMemory | KillCreepMemory | false;
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
    if (json.isCreep) {
      wrapper.actionKill = KillCreep.fromJSON(json.actionKill as KillCreepMemory);
    } else {
      wrapper.actionKill = KillBuilding.fromJSON(json.actionKill as KillBuildingMemory);
    }
    return wrapper;
  }
  toJSON(): KillableWrapperData {
    return {
      ...super.toJSON(),
      isCreep: this.isCreep,
      actionKill: this.actionKill ? (this.actionKill as unknown as KillBuildingMemory | KillCreepMemory) : false,
      _hits: this._hits,
      _hitsMax: this._hitsMax,
    };
  }

  registerActions() {
    logger.log(this.id, "registering actions");
    super.registerActions();
    if(this.colony && this.actionKill) {
      this.colony.registerAction(this.actionKill);
    }
  }

  actionKill: KillBuilding | KillCreep | false = false;
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
    if(this.actionKill) {
      this.actionKill.unassignAll();
      empire.unregisterAction(this.actionKill);
    }

  }

  update() {
    // console.log("Killable update", this.id, this.my);
    if (this.enemy)
      this.updateKill();

    let obj = this.getObject();
    if (obj) {
      this._hits = obj.hits;
      this._hitsMax = obj.hitsMax;
    }
  }

  updateKill() {
    if (!this.actionKill) {
      this.actionKill = new KillBuilding(this);
    }
    if (this.actionKill) {
      this.actionKill.display();

      this.actionKill.requiredParts.setAmount(ATTACK, 1)
      this.actionKill.requiredParts.setAmount(RANGED_ATTACK, 1)

      //calculate demand from required parts
    }



  }

}
