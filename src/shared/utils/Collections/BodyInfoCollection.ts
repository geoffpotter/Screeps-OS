import { RequiredInfo, RequiredInfoCollection, RequiredInfoCollectionJSON, RequiredInfoJSON } from "./RequiredInfoCollection";

interface BodyPartInfoJSON extends RequiredInfoJSON<BodyPartConstant> {}

export interface BodyPartInfoCollectionJSON extends RequiredInfoCollectionJSON<BodyPartInfoJSON> {}

class BodyPartInfo extends RequiredInfo<BodyPartConstant> {
  constructor(type: BodyPartConstant) {
    super(type);
  }
}

//@ts-ignore I dunno why it's complaining about the generics
export class BodyPartInfoCollection extends RequiredInfoCollection<BodyPartConstant, BodyPartInfo, typeof BodyPartInfo> {
  static fromJSON(json: BodyPartInfoCollectionJSON): BodyPartInfoCollection {
    return RequiredInfoCollection.fromJSON(json, BodyPartInfo) as BodyPartInfoCollection;
  }

  constructor(store:BodyPartInfoCollection|false=false, maxTotalAmount:number|false=false) {
    super(BodyPartInfo, store, maxTotalAmount);
  }
}
