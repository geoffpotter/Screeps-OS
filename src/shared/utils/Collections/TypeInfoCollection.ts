import Logger from "shared/utils/logger";
let logger = new Logger("TypeInfoCollection");
logger.enabled = false;
export interface TypeInfoJSON<T> {
  type: T;
  amount: number;
}

export interface TypeInfoCollectionJSON<T> {
  types: T[];
}

export class TypeInfo<ItemType> {
  type: ItemType;
  amount: number = 0;
  constructor(type: ItemType) {
    this.type = type;
  }
}

export class TypeInfoCollection<Type,
                                InfoType extends TypeInfo<Type> = TypeInfo<Type>,
                                InfoConstructorType extends { new(type: Type): InfoType } = { new(type: Type): InfoType }> {
  static fromJSON<T>(json: TypeInfoCollectionJSON<TypeInfoJSON<T>>, infoConstructor: { new(type: T): TypeInfo<T> }): TypeInfoCollection<T> {
    const collection = new TypeInfoCollection<T>(infoConstructor);
    json.types.forEach(typeInfo => {
      collection.setAmount(typeInfo.type, typeInfo.amount);
    });
    return collection;
  }

  types: Map<Type, InfoType>;
  infoConstructor: InfoConstructorType;
  constructor(infoConstructor: InfoConstructorType) {
    this.types = new Map();
    this.infoConstructor = infoConstructor
  }
  get total() {
    let amt = 0;
    this.types.forEach((type)=>{
      amt += type.amount;
    })
    return amt;
  }
  getInfos() {
    return Array.from(this.types.values());
  }
  getTypes() {
    return Array.from(this.types.keys());
  }
  getAmount(type: Type) {
    let itemType: InfoType = this.get(type);
    return itemType.amount;
  }
  setAmount(type: Type, amt: number) {
    let itemType: InfoType = this.get(type);
    itemType.amount = amt;
  }
  addAmount(type:Type, amt:number) {
    let itemType: InfoType = this.get(type);
    itemType.amount += amt;
  }
  has(type: Type) {
    return this.types.has(type);
  }
  get(type: Type) {
    let typeInfo:InfoType;
    if(this.types.has(type)) {
      //@ts-ignore maps again
      typeInfo = this.types.get(type);
    } else {
      typeInfo = new this.infoConstructor(type);
      this.types.set(type, typeInfo)
    }
    return typeInfo;
  }
  getByAmount() {
    let byAmount:TypeInfo<Type>[] = [];
    let validSortedTypes = Array.from(this.types.values()).filter(r=>r.amount>0).sort((a,b)=>a.amount-b.amount);
    validSortedTypes.forEach(type=>{
      let info = new this.infoConstructor(type.type);
      info.amount = type.amount;
      byAmount.push(info);
    })
    return byAmount;
  }
  delete(type: Type) {
    this.types.delete(type);
  }
  diff(otherCollection:TypeInfoCollection<Type>, allowNegitive=true) {
    let diff = new TypeInfoCollection<Type, InfoType, InfoConstructorType>(this.infoConstructor);
    let allTypes = [...this.getTypes(), ...otherCollection.getTypes()];
    for(let type of allTypes) {
      let ourVal = 0;
      let theirVal = 0;
      if(this.has(type)) {
        ourVal = this.get(type).amount;
      }
      if(otherCollection.has(type)) {
        theirVal = otherCollection.get(type).amount;
      }
      let newVal = ourVal - theirVal;
      if(newVal < 0 && !allowNegitive) {
        newVal = 0;
      }
      //logger.log('processing collection. on', type, theirVal, ourVal, newVal)
      diff.setAmount(type, newVal);
    }
    return diff;
  }

  /**
   * subtracts another collection from this one
   */
  sub(otherCollection:TypeInfoCollection<Type>) {
    let typesToSub = otherCollection.getTypes();
    for(let type of typesToSub) {
      let otherAmt = otherCollection.get(type).amount;
      this.addAmount(type, -otherAmt);
    }
  }
  /**
   * adds another collection to this one
   */
  add(otherCollection:TypeInfoCollection<Type>) {
    let typesToAdd = otherCollection.getTypes();
    for(let type of typesToAdd) {
      let otherAmt = otherCollection.get(type).amount;
      this.addAmount(type, otherAmt);
    }
  }
  updateFromCollection(types:TypeInfoCollection<Type>) {
    //this.types.clear();
    let unUpdatedType = new Set<Type>(this.getTypes());
    let keys = types.getTypes();
    keys.forEach(key=>{
      let type = types.get(key);
      //set new type value.
      this.setAmount(type.type, type.amount)
      //save this type from deletion.
      unUpdatedType.delete(type.type);
    })
    unUpdatedType.forEach(type=>{
      //delete anything that wasn't updated.
      this.setAmount(type, 0);
    })
  }


  updateFromArray(types:InfoType[]) {
    //this.types.clear();
    let unUpdatedType = new Set<Type>(this.getTypes());
    types.forEach(type=>{
      //set new type value.
      this.setAmount(type.type, type.amount)
      //save this type from deletion.
      unUpdatedType.delete(type.type);
    })
    unUpdatedType.forEach(type=>{
      //delete anything that wasn't updated.
      this.types.delete(type)
    })
  }

  updateFromStore(store: StoreDefinition | Store<ResourceConstant, false>) {
    //this.types.clear();\
    let unUpdatedType = new Set<Type>(this.getTypes());
    for (let resourceName in store) {
      //@ts-ignore think this is ok, may cause issues
      let typeName:ResourceConstant = resourceName;
      let typeAmt = store[typeName];
      if (typeAmt > 0) {
        logger.log("updating type from store", typeName, typeAmt)
        this.setAmount(typeName as Type, typeAmt);
        //@ts-ignore stop fuckin around.
        unUpdatedType.delete(typeName);
      }
      logger.log("updated types", this.getInfos())
    }
    unUpdatedType.forEach(type=>{
      //delete anything that wasn't updated.
      this.types.delete(type)
    })
  }
}
