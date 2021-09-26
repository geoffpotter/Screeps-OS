import { ResourceConstant } from "game/constants";
import { Store } from "game/prototypes";
import { RequiredInfo, RequiredInfoCollection } from "./RequiredInfoCollection";
import { TypeInfo, TypeInfoCollection } from "./TypeInfoCollection";

class ResourceInfo extends RequiredInfo<ResourceConstant> {
  constructor(type: ResourceConstant) {
    super(type);
  }
}

export class ResourceInfoCollection extends RequiredInfoCollection<ResourceConstant, ResourceInfo> {

  constructor(store:StoreDefinition|Store<ResourceConstant>|ResourceInfoCollection|false=false, maxTotalAmount:number|false=false) {
    super(ResourceInfo, store, maxTotalAmount);
  }
}
