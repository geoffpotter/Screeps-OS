import { ResourceConstant, RESOURCE_ENERGY } from "game/constants";
import { GameObject, Store, Structure } from "game/prototypes";
import { getSettings } from "shared/utils";
import { ResourceInfoCollection } from "shared/utils/Collections/ResourceInfoCollection";
import { deleteAction } from "../planning/actions/BaseAction";
import { Dropoff } from "../planning/actions/economy/Dropoff";
import { Pickup } from "../planning/actions/economy/Pickup";
import { baseGameObject, createObjectWrapper, GameObjectWrapper, getObjectWrapper } from "./GameObjectWrapper";
import { killableGameObject, StructureWrapper } from "./StructureWrapper";

export interface HasStorage extends killableGameObject {
  store: Store<ResourceConstant>;
}

export class HasStorageWrapper<T extends HasStorage> extends StructureWrapper<T> {

  store: ResourceInfoCollection;
  actionPickup:Pickup|false = false;
  actionDropoff:Dropoff|false = false;
  constructor(structure: T) {
    super(structure);
    this.store = new ResourceInfoCollection();
    this.store.updateFromStore(structure.store);
  }
  update(autoPickup:boolean = true, autoDropoff:boolean = true) {
    super.update();
    //if it's mine or unowned(containers)
    if(this.my || this.neutral) {
      //console.log("updating structure with storage", this.id, this.store, this.get().store)
      //console.log('updating hasStorageWrapper', this.id, this.store)
      this.store.updateFromStore(this.get().store);
      let maybeMax = this.get().store.getCapacity();
      if(maybeMax == null)
        maybeMax = this.get().store.getCapacity(RESOURCE_ENERGY)
      if(maybeMax)
        this.store.setMaxTotal(maybeMax);

      //console.log("updated structure with storage", this.id, this.store, this.get().store)
      //console.log('updated hasStorageWrapper', this.id, this.store)
      //create pickup and dropoff tasks, if applicapable.
      if(autoPickup)
        this.updatePickup();
      if(autoDropoff)
        this.updateDropoff();

      if(this.actionDropoff)
        this.actionDropoff.display();
      if(this.actionPickup)
        this.actionPickup.display();
    } else {
      //console.log('not updating enemy hasStorageWrapper', this.id)
    }
  }
  updateDropoff() {
    let dropoffResources = this.store.getTypesByAmountAllowed();
    let dropoffResourceKeys = dropoffResources.getTypes();
    //console.log(this.id, 'updating dropoff resources', dropoffResources)
    if(dropoffResourceKeys.length > 0) {
      //create/update action
      if(!this.actionDropoff) {
        console.log(this.id, "making dropoff")
        this.actionDropoff = new Dropoff(this);
      }
      this.actionDropoff.resourceAmounts.updateFromCollection(dropoffResources);
    } else if(this.actionDropoff) {
      console.log(this.id, "deleting dropoff")
      //if we've got no resources to pickup but have a pickup task, delete it.
      this.cancelDropoff();
    }
  }
  cancelDropoff() {
    if(this.actionDropoff)
      deleteAction(this.actionDropoff);
    this.actionDropoff = false;
  }

  updatePickup() {
    let pickupResources = this.store.getTypesByAmountOverMax();
    let pickupResourceKeys = pickupResources.getTypes();
    //console.log(this.id, 'updating pickup resources', pickupResources)
    if(pickupResourceKeys.length > 0) {
      //create/update action
      if(!this.actionPickup) {
        console.log(this.id, "making Pickup")
        this.actionPickup = new Pickup(this);
      }
      this.actionPickup.resourceAmounts.updateFromCollection(pickupResources);
    } else if(this.actionPickup) {
      console.log(this.id, "deleting pickup")
      //if we've got no resources to pickup but have a pickup task, delete it.
      this.cancelPickup();
    }
  }
  cancelPickup() {
    if(this.actionPickup)
      deleteAction(this.actionPickup);
    this.actionPickup = false;
  }
}

