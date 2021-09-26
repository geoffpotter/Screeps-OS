
import { ResourceConstant } from "game/constants";
import { Store } from "game/prototypes";
import { TypeInfo, TypeInfoCollection } from "./TypeInfoCollection";

export class RequiredInfo<ItemType> extends TypeInfo<ItemType> {
  min:number = 0;
  max:number = 0;
  /**
   * amount allowed before max is hit
   */
  get amountAllowed() {
    return Math.max(this.max - this.amount, 0)
  }
  /**
   * amount needed before min is hit
   */
  get amountRequired() {
    return Math.max(this.min - this.amount, 0)
  }

  /**
   * Amount over min that could be used
   */
  get amountAvailable() {
    return Math.max(this.amount - this.min,0);
  }

  /**
   * Amount over the max that needs to be removed
   */
  get amountOverMax() {
    return Math.max(this.amount - this.max,0)
  }

  constructor(item: ItemType) {
    super(item);
  }
}

export class RequiredInfoCollection<Type,
                                    InfoType extends RequiredInfo<Type> = RequiredInfo<Type>,
                                    InfoConstructorType extends { new(type: Type): InfoType } = { new(type: Type): InfoType }
                                    > extends TypeInfoCollection<Type, InfoType, InfoConstructorType> {

  getTypesByAmountRequired() {
    let typesRequired = new RequiredInfoCollection<Type, InfoType, InfoConstructorType>(this.infoConstructor);
    let validTypes = Array.from(this.types.values()).filter(r=>r.amountRequired>0).sort((a,b)=>a.amountRequired-b.amountRequired);
    validTypes.forEach(type=>{
      typesRequired.setAmount(type.type, type.amountRequired);
    })
    return typesRequired;
  }
  getTypesByAmountOverMax() {
    let typesOverMax = new RequiredInfoCollection<Type, InfoType, InfoConstructorType>(this.infoConstructor);
    let validTypes = Array.from(this.types.values()).filter(r=>r.amountOverMax>0).sort((a,b)=>a.amountOverMax-b.amountOverMax);
    validTypes.forEach(type=>{
      typesOverMax.setAmount(type.type, type.amountOverMax);
    })
    return typesOverMax;
  }
  getTypesByAmountAllowed() {
    let typesAllowed = new RequiredInfoCollection<Type, InfoType, InfoConstructorType>(this.infoConstructor);
    let validTypes = Array.from(this.types.values()).filter(r=>r.amountAllowed>0).sort((a,b)=>a.amountAllowed-b.amountAllowed);
    validTypes.forEach(type=>{
      typesAllowed.setAmount(type.type, type.amountAllowed);
    })
    return typesAllowed;
  }
  getTypesByAmountAvailable() {
    let typesAvailable = new RequiredInfoCollection<Type, InfoType, InfoConstructorType>(this.infoConstructor);
    let validTypes = Array.from(this.types.values()).filter(r=>r.amountAvailable>0).sort((a,b)=>a.amountAvailable-b.amountAvailable);
    validTypes.forEach(type=>{
      typesAvailable.setAmount(type.type, type.amountAvailable);
    })
    return typesAvailable;
  }

  private maxTotalAmount:number|false = false;
  setMaxTotal(newMax:number) {
    this.maxTotalAmount = newMax;
  }
  get maxTotal() {
    if(this.maxTotalAmount)
      return this.maxTotalAmount;
    return 0;
  }

  get totalFree() {
    return this.maxTotal - this.total;
  }


  constructor(infoConstructor: InfoConstructorType, store:StoreDefinition|Store<ResourceConstant>|RequiredInfoCollection<Type>|false=false, maxTotalAmount:number|false=false) {
    super(infoConstructor)
    this.maxTotalAmount = maxTotalAmount;
    if(store instanceof RequiredInfoCollection) {
      this.updateFromCollection(store);
    } else if(store) {
      this.updateFromStore(store);
    }
  }


  updateMaxTotal(newTotal:number) {
    this.maxTotalAmount = newTotal;
  }

  getConflictingAmounts(otherCollection:RequiredInfoCollection<Type>) {
    let conflictingAmounts = new RequiredInfoCollection<Type, InfoType, InfoConstructorType>(this.infoConstructor);
    let typeInOtherCollection = otherCollection.getTypes();
    for(let type of typeInOtherCollection) {
      let ourTypeInfo = this.get(type);
      let theirTypeInfo = otherCollection.get(type);
      console.log("checking for conflict", ourTypeInfo, theirTypeInfo)
      if((theirTypeInfo.amount+ourTypeInfo.amount) > ourTypeInfo.amountAllowed) {
        //adding this type would put us over the limit, add the diff to the conflict
        let conflictAmt = theirTypeInfo.amount - ourTypeInfo.amountAllowed;
        conflictingAmounts.setAmount(type, conflictAmt);
      }
    }
    return conflictingAmounts;
  }



  getMin(type: Type) {
    if(!this.has(type)) return 0;
    let tInfo = this.get(type)
    return tInfo.min;
  }
  getMax(type: Type) {
    if(!this.has(type)) return 0;
    let tInfo = this.get(type)
    return tInfo.max;
  }



  setMin(type: Type, amount:number) {
    let tInfo = this.get(type)
    tInfo.min = amount;
  }
  setMax(type: Type, amount:number) {
    let tInfo = this.get(type)
    tInfo.max = amount;
  }
}
