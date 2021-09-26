import { GameObject } from "game/prototypes";
import { getSettings } from "shared/utils";
import { Location } from "shared/utils/map/Location";
import { idType, setInterval, clearInterval } from "shared/polyfills";
import {builtInQueues} from "polyfills/tasks/"

let gameObjectWrappers: Map<string, GameObjectWrapper<any>> = new Map();

//run all game objects every tick
setInterval(()=>{
  gameObjectWrappers.forEach(wrapper=>{
    if(!wrapper.get().exists) {
      gameObjectWrappers.delete(wrapper.id);
      return;
    }
    console.log("updating wrapper", wrapper.id, wrapper.constructor.name)
    wrapper.update();
  })
}, 1, builtInQueues.UPDATE)
setInterval(()=>{
  gameObjectWrappers.forEach(wrapper=>{
    if(!wrapper.get().exists) {
      gameObjectWrappers.delete(wrapper.id);
      return;
    }
    //console.log("running wrapper", wrapper.id)
    wrapper.run();
  })
}, 1, builtInQueues.ACTIONS)


export function getObjectWrapperById<T extends GameObjectWrapper<any>>(gameObjectId: idType):T|false  {
  if (gameObjectWrappers.has(gameObjectId)) {
    //@ts-ignore ts being dumb, can't be undefined if it has it
    return gameObjectWrappers.get(gameObjectId);
  }
  return false;
}
export function getObjectWrapper<T extends GameObjectWrapper<any>>(gameObject: baseGameObject):T|false {
  if (gameObjectWrappers.has(gameObject.id)) {
    //@ts-ignore ts being dumb, can't be undefined if it has it
    return gameObjectWrappers.get(gameObject.id);
  }
  return false;
}

export function createObjectWrapper
    <ObjectType extends baseGameObject, WrapperType extends GameObjectWrapper<ObjectType>>
    (constructor: { new (obj:ObjectType, ...args:any): WrapperType }, obj:ObjectType, ...args:any):WrapperType {
      let wrapper = new constructor(obj, ...args);
      gameObjectWrappers.set(wrapper.id, wrapper);
      return wrapper
}

export type AnyGameObjectWrapper = GameObjectWrapper<baseGameObject>;

export interface baseGameObject {
  exists:boolean,
  id:idType,
  x:number,
  y:number
}

export class GameObjectWrapper<T extends baseGameObject> {
  id:idType

  get x() {
    return this.get().x;
  }
  get y() {
    return this.get().y;
  }

  private gameObject: T;
  get location() {
    return Location.getLocationFromObj(this);
  }
  get() {
    return this.gameObject;
  }
  constructor(gameObject: T) {
    this.gameObject = gameObject;
    this.id = gameObject.id;
  }

  /**
   * update this wrapper, find new actions, make decisions for later.
   *
   */
  update() {

    console.log("in GOW update!")
    //do nothing, override this in more specfic wrappers
  }

  /**
   * Run this wrapper, preform any actions.  decisions should already be made during update.
   * runs during "action" queue
   */
  run() {
    console.log("in GOW run!")
    //do nothing, override this in more specfic wrappers
  }
}
