import { RequiredInfo, RequiredInfoCollection, RequiredInfoCollectionJSON, RequiredInfoJSON } from "./RequiredInfoCollection";
import { TypeInfo, TypeInfoCollection } from "./TypeInfoCollection";

interface ResourceInfoJSON extends RequiredInfoJSON<ResourceConstant> {}

export interface ResourceInfoCollectionJSON extends RequiredInfoCollectionJSON<ResourceInfoJSON> {}

class ResourceInfo extends RequiredInfo<ResourceConstant> {
  constructor(type: ResourceConstant) {
    super(type);
  }
}

//@ts-ignore I dunno why it's complaining about the generics
export class ResourceInfoCollection extends RequiredInfoCollection<ResourceConstant, ResourceInfo, typeof ResourceInfo> {
  static fromJSON(json: ResourceInfoCollectionJSON): ResourceInfoCollection {
    return RequiredInfoCollection.fromJSON(json, ResourceInfo) as ResourceInfoCollection;
  }

  constructor(store:StoreDefinition|ResourceInfoCollection|false=false, maxTotalAmount:number|false=false) {
    super(ResourceInfo, store, maxTotalAmount);
  }
}
