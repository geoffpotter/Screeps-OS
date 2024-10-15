import { GameObjectWrapper, GameObjectWrapperData } from "./base/GameObjectWrapper";
import { registerObjectWrapper } from "./base/AllGameObjects";
import { StorableCreatableClass } from "shared/utils/memory";
import { Pickup, PickupMemory } from "../actions/economy/Pickup";
import { ResourceInfoCollection } from "shared/utils/Collections/ResourceInfoCollection";
import queues from "../queues";
import Logger from "shared/utils/logger";
import { setInterval } from "shared/polyfills/setInterval";
import empire from "world_new/Empire";

let logger = new Logger("ResourceWrapper");
logger.color = COLOR_RED
logger.enabled = false;

interface ResourceWrapperData extends GameObjectWrapperData {
  resourceType: ResourceConstant;
  amount: number;
  actionPickup: PickupMemory;
}

export class ResourceWrapper extends GameObjectWrapper<Resource> implements StorableCreatableClass<ResourceWrapper, typeof ResourceWrapper, ResourceWrapperData> {
  resourceType: ResourceConstant;
  amount: number;
  supressActions: boolean = false;
  actionPickup: Pickup;


  store: ResourceInfoCollection;

  static fromJSON(json: ResourceWrapperData): ResourceWrapper {
    const wrapper = new ResourceWrapper(json.id as Id<Resource>);
    wrapper.resourceType = json.resourceType;
    wrapper.amount = json.amount;
    wrapper.actionPickup = Pickup.fromJSON(json.actionPickup);
    return wrapper;
  }

  constructor(id: string) {
    super(id as Id<Resource>);
    this.resourceType = RESOURCE_ENERGY;
    this.amount = 0;
    this.store = new ResourceInfoCollection();
    //@ts-ignore
    this.actionPickup = new Pickup(this);
    this.store.setMaxTotal(0);
    this.store.setMax(this.resourceType, 0);
    logger.log('created resource', this.id, this.resourceType, this.amount);

  }


  update() {
    if (!this._exists) {
      return;
    }
    super.update();
    logger.log('updating resource', this.id, this.resourceType, this.amount);
    const resource = this.getObject();
    if (resource) {
      this.resourceType = resource.resourceType;
      this.amount = resource.amount;
      if (!this.supressActions) {
        this.store.setAmount(this.resourceType, this.amount);
        this.store.setMax(this.resourceType, 0);
        let pickupResources = this.store.getTypesByAmountOverMax();
        this.actionPickup.resourceAmounts.updateFromCollection(pickupResources);
        this.actionPickup.currentDemand = this.actionPickup.calculateDemand();
        logger.log("pickup demand", this.actionPickup.currentDemand);
        this.actionPickup.display();
      }
    } else {
      //resource isn't visible.  check if room is, and if so, it's just gone, so delete it.
      if(this.roomWrapper.lastSeen === Game.time) {
        this.delete();
      }
    }
  }
  delete() {
    if (!this._exists) {
      return;
    }
    super.delete();
    this.actionPickup.unassignAll();
    if (this.colony && this.colony.hasAction(this.actionPickup.id)) {
      this.colony.unregisterAction(this.actionPickup);
    }
    // //@ts-ignore
    // delete this.actionPickup;
  }

  registerActions() {
    if (!this._exists) {
      return;
    }
    if (this.supressActions || !this.colony) {
      return;
    }
    super.registerActions();
    if (this.colony) {
      logger.log(this.id, "registering actions");
      this.colony.registerAction(this.actionPickup);
    }
  }

  toJSON(): ResourceWrapperData {
    return {
      ...super.toJSON(),
      resourceType: this.resourceType,
      amount: this.amount,
      //@ts-ignore
      actionPickup: this.actionPickup,
    };
  }
}

registerObjectWrapper(Resource, ResourceWrapper);
