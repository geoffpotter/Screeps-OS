import { BodyPartConstant } from "game/constants";
import { RequiredInfo, RequiredInfoCollection } from "./RequiredInfoCollection";

class BodyPartInfo extends RequiredInfo<BodyPartConstant> {
  constructor(type: BodyPartConstant) {
    super(type);
  }
}

export class BodyPartInfoCollection extends RequiredInfoCollection<BodyPartConstant, BodyPartInfo> {

  constructor(store:BodyPartInfoCollection|false=false, maxTotalAmount:number|false=false) {
    super(BodyPartInfo, store, maxTotalAmount);
  }
}
