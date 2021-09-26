import { RESOURCE_ENERGY } from "game/constants";
import { StructureContainer } from "game/prototypes";
import { createObjectWrapper, getObjectWrapper } from "./GameObjectWrapper";
import { HasStorageWrapper } from "./HasStorageWrapper";
import { StructureWrapper } from "./StructureWrapper";


declare module "game/prototypes" {
  interface StructureContainer {
    getWrapper():StructureWrapper<StructureContainer>;
  }
}

StructureContainer.prototype.getWrapper = function() {
  let wrapper:StructureWrapper<StructureContainer>|false = getObjectWrapper(this);
  if(wrapper)
    return wrapper;

  wrapper = createObjectWrapper<StructureContainer, ContainerWrapper>(ContainerWrapper, this);
  return wrapper;
}


export class ContainerWrapper extends HasStorageWrapper<StructureContainer> {
  static doUpdate(creep:ContainerWrapper) {

  }
  static doRun(creep:ContainerWrapper) {

  }

  constructor(container: StructureContainer) {
    super(container);
    let capacity = container.store.getCapacity(RESOURCE_ENERGY) || 0;
    this.store.updateMaxTotal(capacity);
  }

  /**
   * find new actions
   */
   update() {
    super.update();
    let energyInfo = this.store.get(RESOURCE_ENERGY);
    energyInfo.min = energyInfo.max = 0;
    ContainerWrapper.doUpdate(this);
  }

  /**
   * preform any actions
   */
  run() {
    ContainerWrapper.doRun(this);
  }


}
