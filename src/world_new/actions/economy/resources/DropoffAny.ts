// src/world_new/actions/economy/resources/DropoffAllowed.ts

import { HasStorage, HasStorageWrapper } from "../../../wrappers/base/HasStorageWrapper";
import { ResourceInfoCollection } from "shared/utils/Collections/ResourceInfoCollection";
import { BaseDropoff } from "./BaseDropoff";
import WorldPosition from "shared/utils/map/WorldPosition";
import { ActionDemand } from "../../base/ActionDemand";

export class DropoffAny extends BaseDropoff {
  constructor(
    target: HasStorageWrapper<HasStorage> | WorldPosition,
    resourceDemand: ResourceInfoCollection
  ) {
    super(target, resourceDemand);
  }

  calculateDemand(): ActionDemand<ResourceConstant> {
    let demand = new ActionDemand<ResourceConstant>();
    let typesAllowed = this.resourceDemand;
    let totalFree = this.resourceDemand.totalFree
    for (let info of typesAllowed.getInfos()) {
      demand.set(info.type as ResourceConstant, totalFree);
    }
    return demand;
  }
}

