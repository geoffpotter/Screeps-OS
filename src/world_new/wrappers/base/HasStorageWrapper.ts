import { ResourceInfoCollection, ResourceInfoCollectionJSON } from "shared/utils/Collections/ResourceInfoCollection";

import { GameObject, GameObjectWrapper } from "./GameObjectWrapper";
import { KillableWrapper, KillableWrapperData, killableGameObject } from "./KillableWrapper";

import { StorableClass } from "shared/utils/memory";
import Logger from "shared/utils/logger";
import { BasePickup } from "world_new/actions/economy/resources/BasePickup";
import { BaseDropoff } from "world_new/actions/economy/resources/BaseDropoff";
import { DropoffAllowed } from "world_new/actions/economy/resources/DropoffAllowed";
import { DropoffRequired } from "world_new/actions/economy/resources/DropoffRequired";
import { DropoffAny } from "world_new/actions/economy/resources/DropoffAny";
import { PickupAvailable } from "world_new/actions/economy/resources/PickupAvailable";
import { PickupOverMax } from "world_new/actions/economy/resources/PickupOverMax";
import { PickupAny } from "world_new/actions/economy/resources/PickupAny";

const logger = new Logger("HasStorageWrapper");
logger.color = COLOR_YELLOW
logger.enabled = false;

export interface HasStorage extends killableGameObject {
  store: Store<ResourceConstant, false>;
}

export interface StructureWithStorage extends HasStorage {
  structureType: StructureConstant;
}

export type StructureWrapper = KillableWrapper<Structure>;
export type StructureWithStorageWrapper = HasStorageWrapper<StructureWithStorage>;

export interface HasStorageWrapperData extends KillableWrapperData {
  store: ResourceInfoCollectionJSON;
}

type ResourceActionType = typeof BasePickup | typeof BaseDropoff;
type ResourceActionInstance = BasePickup | BaseDropoff;

export class HasStorageWrapper<T extends HasStorage> extends KillableWrapper<T> implements StorableClass<HasStorageWrapper<T>, typeof HasStorageWrapper, HasStorageWrapperData> {
  store: ResourceInfoCollection;

  // Resource Actions
  protected _actionPickupAllowed?: PickupAvailable;
  protected _actionPickupRequired?: PickupOverMax;
  protected _actionPickupAny?: PickupAny;
  protected _actionDropoffAllowed?: DropoffAllowed;
  protected _actionDropoffRequired?: DropoffRequired;
  protected _actionDropoffAny?: DropoffAny;

  constructor(id: Id<T>) {
    super(id);
    this.store = new ResourceInfoCollection();
  }

  // Action getters
  getActionPickupAny(): PickupAny {
    if (!this._actionPickupAny) {
      this._actionPickupAny = new PickupAny(this, this.store);
    }
    return this._actionPickupAny;
  }
  getActionPickupAllowed(): PickupAvailable {
    if (!this._actionPickupAllowed) {
      this._actionPickupAllowed = new PickupAvailable(this, this.store);
    }
    return this._actionPickupAllowed;
  }
  getActionPickupRequired(): PickupOverMax {
    if (!this._actionPickupRequired) {
      this._actionPickupRequired = new PickupOverMax(this, this.store);
    }
    return this._actionPickupRequired;
  }


  getActionDropoffAllowed(): DropoffAllowed {
    if (!this._actionDropoffAllowed) {
      this._actionDropoffAllowed = new DropoffAllowed(this, this.store);
    }
    return this._actionDropoffAllowed;
  }

  getActionDropoffRequired(): DropoffRequired {
    if (!this._actionDropoffRequired) {
      this._actionDropoffRequired = new DropoffRequired(this, this.store);
    }
    return this._actionDropoffRequired;
  }

  getActionDropoffAny(): DropoffAny {
    if (!this._actionDropoffAny) {
      this._actionDropoffAny = new DropoffAny(this, this.store);
    }
    return this._actionDropoffAny;
  }

  static fromJSON(json: HasStorageWrapperData, wrapper?: HasStorageWrapper<any>): HasStorageWrapper<any> {
    if(!wrapper) {
      throw new Error("HasStorageWrapper.fromJSON requires a wrapper");
    }
    KillableWrapper.fromJSON(json, wrapper);
    wrapper.store = ResourceInfoCollection.fromJSON(json.store);
    return wrapper
  }
  toJSON(): HasStorageWrapperData {
    return {
      ...super.toJSON(),
      store: this.store as unknown as ResourceInfoCollectionJSON
    };
  }

  update() {
    super.update();
    let obj = this.getObject();
    if (!obj) {
      return;
    }

    if (this.my || this.neutral) {
      this.store.updateFromStore(obj.store);
      let maybeMax = obj.store.getCapacity();
      if (maybeMax == null)
        maybeMax = obj.store.getCapacity(RESOURCE_ENERGY);
      if (maybeMax)
        this.store.setMaxTotal(maybeMax);

      if (this.wrapperType !== "CreepWrapper") {
        if (this._actionDropoffAny) {
          this._actionDropoffAny.display();
        }
        if (this._actionDropoffAllowed) {
          this._actionDropoffAllowed.display();
        }
        if (this._actionDropoffRequired) {
          this._actionDropoffRequired.display();
        }
        if (this._actionPickupAny) {
          this._actionPickupAny.display();
        }
        if (this._actionPickupAllowed) {
          this._actionPickupAllowed.display();
        }
        if (this._actionPickupRequired) {
          this._actionPickupRequired.display();
        }
      }
    }
  }
}
