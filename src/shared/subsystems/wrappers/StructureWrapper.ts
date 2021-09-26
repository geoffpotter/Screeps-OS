import { ATTACK, RANGED_ATTACK } from "game/constants";
import { GameObject, Structure } from "game/prototypes";
import { getSettings } from "shared/utils";
import { KillBuilding } from "../planning/actions/military/KillBuilding";
import { baseGameObject, createObjectWrapper, GameObjectWrapper, getObjectWrapper } from "./GameObjectWrapper";

// declare module "game/prototypes" {
//   interface Structure {
//     getWrapper():StructureWrapper<Structure>;
//   }
// }

// Structure.prototype.getWrapper = function() {
//   let wrapper:StructureWrapper<Structure>|false = getObjectWrapper(this);
//   if(wrapper)
//     return wrapper;

//   wrapper = createObjectWrapper<Structure, StructureWrapper<Structure>>(StructureWrapper, this);
//   return wrapper;
// }

export type AnyKillableWrapper = StructureWrapper<killableGameObject>;

export interface killableGameObject extends baseGameObject {
  exists: any;
  hits:number,
  hitsMax:number
 }

export class StructureWrapper<T extends killableGameObject> extends GameObjectWrapper<T> {
  actionKill:KillBuilding|false = false;

  get hits() {
    return this.get().hits;
  }
  get hitsMax() {
    return this.get().hitsMax;
  }
  get my() {
    //@ts-ignore .my could not exist, pretty sure I've handled it though(!!s)
    return !!this.get().my;
  }
  get  enemy() {
    //@ts-ignore
    return !!(this.get().my === false);
  }
  get neutral() {
    //@ts-ignore
    return !!(this.get().my === undefined);
  }

  constructor(structure: T) {
    super(structure);
  }

  update() {
    console.log("struct update", this.id, this.my)
    if(this.enemy)
      this.updateKill();
  }

  updateKill() {
    if(!this.actionKill) {
      this.actionKill = new KillBuilding(this);
    }
    if(this.actionKill)
      this.actionKill.display();

    this.actionKill.requiredParts.setAmount(ATTACK, 1)
    this.actionKill.requiredParts.setAmount(RANGED_ATTACK, 1)
  }

}
