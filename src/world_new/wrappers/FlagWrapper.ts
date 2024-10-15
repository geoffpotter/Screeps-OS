import { GameObjectWrapper, GameObjectWrapperData } from "./base/GameObjectWrapper";
import { registerObjectWrapper } from "./base/AllGameObjects";
import { StorableCreatableClass } from "shared/utils/memory";

interface FlagWrapperData extends GameObjectWrapperData {
  name: string;
  color: ColorConstant;
  secondaryColor: ColorConstant;
}

export class FlagWrapper extends GameObjectWrapper<any> implements StorableCreatableClass<FlagWrapper, typeof FlagWrapper, FlagWrapperData> {
  name: string;
  color: ColorConstant;
  secondaryColor: ColorConstant;

  static fromJSON(json: FlagWrapperData): FlagWrapper {
    const wrapper = new FlagWrapper(json.id);
    wrapper.name = json.name;
    wrapper.color = json.color;
    wrapper.secondaryColor = json.secondaryColor;
    return wrapper;
  }

  constructor(name: string) {
    super(name as any);
    this.name = name;
    this.color = COLOR_WHITE;
    this.secondaryColor = COLOR_WHITE;
  }

  update() {
    super.update();
    const flag = this.getObject();
    if (flag) {
      this.name = flag.name;
      this.color = flag.color;
      this.secondaryColor = flag.secondaryColor;
    }
  }

  toJSON(): FlagWrapperData {
    return {
      ...super.toJSON(),
      name: this.name,
      color: this.color,
      secondaryColor: this.secondaryColor,
    };
  }
}
// @ts-ignore
registerObjectWrapper(Flag, FlagWrapper);

