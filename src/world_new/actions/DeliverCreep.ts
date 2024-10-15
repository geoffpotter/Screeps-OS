import { Creep, StructureSpawn } from "game/prototypes";
import { GameObjectWrapper } from "shared/subsystems/wrappers/GameObjectWrapper";
import { getSettings } from "shared/utils";
import { Location } from "shared/utils/map/Location";
import { BaseJob } from "../jobs/BaseJob";
import { Action, BaseAction } from "./base/BaseAction";




// export class DeliverCreep extends BaseAction<Location, Creep> implements Action<Creep> {
//   static actionType = "DeliverCreep";
//   partsRequired;
//   constructor(parent:BaseJob, loc:Location, partsRequired: Map<BodyPartConstant, number> = new Map<BodyPartConstant, number>()) {
//     super(DeliverCreep.actionType, parent, loc);
//     this.partsRequired = partsRequired;
//   }

//   doJob(obj:GameObjectWrapper<Creep>) {
//     obj.get().moveTo(this.target);
//     let settings = getSettings();
//     if(settings.getRange(obj, this.target) <= 3) {
//       //we're there!
//       return true;
//     }
//     return false;
//   }
// }
