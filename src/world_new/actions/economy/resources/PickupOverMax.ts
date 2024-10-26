// src/world_new/actions/economy/resources/PickupOverMax.ts

import { HasStorage, HasStorageWrapper } from "../../../wrappers/base/HasStorageWrapper";
import { ResourceInfoCollection } from "shared/utils/Collections/ResourceInfoCollection";
import { BasePickup } from "./BasePickup";
import WorldPosition from "shared/utils/map/WorldPosition";
import { ActionDemand } from "../../base/ActionDemand";

export class PickupOverMax extends BasePickup {
  constructor(
    target: HasStorageWrapper<HasStorage> | WorldPosition,
    resourceDemand: ResourceInfoCollection
  ) {
    super(target, resourceDemand);
  }

  calculateDemand(): ActionDemand<ResourceConstant> {
    let demand = new ActionDemand<ResourceConstant>();
    let typesOverMax = this.resourceDemand.getTypesByAmountOverMax();
    for (let info of typesOverMax.getInfos()) {
      demand.set(info.type as ResourceConstant, info.amount);
    }
    return demand;
  }
}

