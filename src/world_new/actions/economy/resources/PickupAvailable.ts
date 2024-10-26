// src/world_new/actions/economy/resources/PickupAvailable.ts

import { HasStorage, HasStorageWrapper } from "../../../wrappers/base/HasStorageWrapper";
import { ResourceInfoCollection } from "shared/utils/Collections/ResourceInfoCollection";
import { BasePickup } from "./BasePickup";
import WorldPosition from "shared/utils/map/WorldPosition";
import { ActionDemand } from "../../base/ActionDemand";

export class PickupAvailable extends BasePickup {
  constructor(
    target: HasStorageWrapper<HasStorage> | WorldPosition,
    resourceDemand: ResourceInfoCollection
  ) {
    super(target, resourceDemand);
  }

  calculateDemand(): ActionDemand<ResourceConstant> {
    let demand = new ActionDemand<ResourceConstant>();
    let typesAvailable = this.resourceDemand.getTypesByAmountAvailable();
    for (let info of typesAvailable.getInfos()) {
      demand.set(info.type as ResourceConstant, info.amount);
    }
    return demand;
  }
}

