// src/world_new/actions/economy/resources/DropoffAllowed.ts

import { HasStorage, HasStorageWrapper } from "../../../wrappers/base/HasStorageWrapper";
import { ResourceInfoCollection } from "shared/utils/Collections/ResourceInfoCollection";
import { BasePickup } from "./BasePickup";
import { ActionDemand } from "../../base/ActionDemand";
import WorldPosition from "shared/utils/map/WorldPosition";

export class PickupAny extends BasePickup {
  constructor(
    target: HasStorageWrapper<HasStorage> | WorldPosition,
    resourceDemand: ResourceInfoCollection
  ) {
    super(target, resourceDemand);
  }

  calculateDemand(): ActionDemand<ResourceConstant> {
    let demand = new ActionDemand<ResourceConstant>();
    for (let info of this.resourceDemand.getInfos()) {
      demand.set(info.type as ResourceConstant, info.amount);
    }
    return demand;
  }
}

