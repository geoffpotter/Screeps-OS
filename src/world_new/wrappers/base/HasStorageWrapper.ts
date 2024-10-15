import { ResourceInfoCollection, ResourceInfoCollectionJSON } from "shared/utils/Collections/ResourceInfoCollection";
import { Dropoff, DropoffMemory } from "../../actions/economy/Dropoff";
import { Pickup, PickupMemory } from "../../actions/economy/Pickup";
import { GameObject, GameObjectWrapper } from "./GameObjectWrapper";
import { KillableWrapper, KillableWrapperData, killableGameObject } from "./KillableWrapper";
import queues from "../../queues";
import { StorableClass } from "shared/utils/memory";
import Logger from "shared/utils/logger";
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
  actionPickup: PickupMemory | false;
  actionDropoff: DropoffMemory | false;
}

export class HasStorageWrapper<T extends HasStorage> extends KillableWrapper<T> implements StorableClass<HasStorageWrapper<T>, typeof HasStorageWrapper, HasStorageWrapperData> {
  static fromJSON(json: HasStorageWrapperData, wrapper?: HasStorageWrapper<any>): HasStorageWrapper<any> {
    if(!wrapper) {
      throw new Error("HasStorageWrapper.fromJSON requires a wrapper");
    }
    KillableWrapper.fromJSON(json, wrapper);
    wrapper.store = ResourceInfoCollection.fromJSON(json.store);
    wrapper.actionPickup = json.actionPickup ? Pickup.fromJSON(json.actionPickup) : false;
    wrapper.actionDropoff = json.actionDropoff ? Dropoff.fromJSON(json.actionDropoff) : false;
    return wrapper
  }
  toJSON(): HasStorageWrapperData {
    return {
      ...super.toJSON(),
      store: this.store as unknown as ResourceInfoCollectionJSON,
      actionPickup: this.actionPickup ? (this.actionPickup as unknown as PickupMemory) : false,
      actionDropoff: this.actionDropoff ? (this.actionDropoff as unknown as DropoffMemory) : false,
    };
  }
  store: ResourceInfoCollection;
  actionPickup:Pickup|false = false;
  actionDropoff:Dropoff|false = false;
  constructor(id:Id<T>) {
    super(id);
    this.store = new ResourceInfoCollection();
    this.actionPickup = new Pickup(this);
    this.actionDropoff = new Dropoff(this);
  }

  registerActions() {
    logger.log(this.id, "registering actions");
    super.registerActions();
    if(this.colony && this.actionPickup) {
      this.colony.registerAction(this.actionPickup);
    }
    if(this.colony && this.actionDropoff) {
      this.colony.registerAction(this.actionDropoff);
    }
  }

  update() {
    super.update();
    let obj = this.getObject();
    if (obj) {
      this.store.updateFromStore(obj.store);
    } else {
      return;
    }
    //if it's mine or unowned(containers)
    if(this.my || this.neutral) {
      let maybeMax = obj.store.getCapacity();
      if(maybeMax == null)
        maybeMax = obj.store.getCapacity(RESOURCE_ENERGY)
      if(maybeMax)
        this.store.setMaxTotal(maybeMax);

      this.updatePickup();
      this.updateDropoff();

      // if(this.actionDropoff)
      //   this.actionDropoff.display();
      // if(this.actionPickup)
      //   this.actionPickup.display();
    }
  }

  updateDropoff() {
    // if (this.constructor.name == "SpawnWrapper") {
    //   logger.enabled = true;
    // } else {
    //   logger.enabled = false;
    // }
    let dropoffResources = this.store.getTypesByAmountAllowed();
    let dropoffResourceKeys = dropoffResources.getTypes();
    logger.log("dropoffResources", dropoffResourceKeys, JSON.stringify(this.store), this.id);
    if(dropoffResourceKeys.length > 0) {
      if(!this.actionDropoff) {
        logger.log(this.id, "making dropoff")
        this.actionDropoff = new Dropoff(this);
      }
      this.actionDropoff.resourceAmounts.updateFromCollection(dropoffResources);
      this.actionDropoff.currentDemand = this.actionDropoff.calculateDemand();
    } else if(this.actionDropoff) {
      // logger.log(this.id, "empty dropoff")
      this.actionDropoff.currentDemand = {};
    }
  }

  updatePickup() {
    let pickupResources = this.store.getTypesByAmountOverMax();
    let pickupResourceKeys = pickupResources.getTypes();
    // logger.log("pickupResources", pickupResourceKeys, JSON.stringify(this.store), this.id);
    if(pickupResourceKeys.length > 0) {
      if(!this.actionPickup) {
        logger.log(this.id, "making Pickup")
        this.actionPickup = new Pickup(this);
      }
      this.actionPickup.resourceAmounts.updateFromCollection(pickupResources);
      this.actionPickup.currentDemand = this.actionPickup.calculateDemand();
    } else if(this.actionPickup) {
      // logger.log(this.id, "empty pickup")
      this.actionPickup.currentDemand = {};
    }
  }
}

