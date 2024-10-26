// src/world_new/actions/economy/resources/DropoffRequired.ts

import { HasStorage, HasStorageWrapper } from "../../../wrappers/base/HasStorageWrapper";
import { ResourceInfoCollection } from "shared/utils/Collections/ResourceInfoCollection";
import { BaseDropoff } from "./BaseDropoff";
import WorldPosition from "shared/utils/map/WorldPosition";
import { ActionDemand } from "../../base/ActionDemand";

export class DropoffRequired extends BaseDropoff {
  constructor(
    target: HasStorageWrapper<HasStorage> | WorldPosition,
    resourceDemand: ResourceInfoCollection
  ) {
    super(target, resourceDemand);
  }

  calculateDemand(): ActionDemand<ResourceConstant> {
    let demand = new ActionDemand<ResourceConstant>();
    let typesRequired = this.resourceDemand.getTypesByAmountRequired();
    for (let info of typesRequired.getInfos()) {
      demand.set(info.type as ResourceConstant, info.amount);
    }
    return demand;
  }
}

