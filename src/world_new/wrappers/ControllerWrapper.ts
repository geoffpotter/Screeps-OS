import { GameObjectWrapper, GameObjectWrapperData } from "./base/GameObjectWrapper";
import { registerObjectWrapper } from "./base/AllGameObjects";
import { StorableCreatableClass } from "shared/utils/memory";
import { UpgradeController } from "../actions/economy/UpgradeController";
import { Claim } from "../actions/economy/Claim";
import { AttackController } from "../actions/economy/AttackController";
import { ReserveController } from "../actions/economy/ReserveController";
import { SignController } from "../actions/economy/SignController";
import { RoomMode } from "./room";
import { ActionDemand } from "../actions/base/ActionDemand";
import WorldPosition from "shared/utils/map/WorldPosition";
import { getRoomIntel, PlayerStatus } from "shared/subsystems/intel";
import { ResourceInfoCollection } from "shared/utils/Collections/ResourceInfoCollection";
import { TypeInfoCollection } from "shared/utils/Collections/TypeInfoCollection";
import Logger from "shared/utils/logger";
import { SpawnWrapper } from "./spawn";
import { RoomPositionWrapper } from "./room/RoomPositionWrapper";
import costMatrixUtils from "shared/utils/map/CostMatrix";
import { Priority } from "shared/utils/priority";
import { DropoffAny } from "world_new/actions/economy/resources/DropoffAny";
import { PickupAny } from "world_new/actions/economy/resources/PickupAny";
import { ResourceWrapper } from "./ResourceWrapper";
import { wrap } from "lodash";

const logger = new Logger("ControllerWrapper");
logger.enabled = false;
interface ControllerWrapperData extends GameObjectWrapperData {
  level: number;
  progress: number;
  progressTotal: number;
  reservation: ReservationDefinition | undefined;
  ticksToDowngrade: number;
  upgradeBlocked: number;
}

export class ControllerWrapper extends GameObjectWrapper<StructureController> implements StorableCreatableClass<ControllerWrapper, typeof ControllerWrapper, ControllerWrapperData> {
  level: number;
  progress: number;
  progressTotal: number;
  reservation: ReservationDefinition | undefined;
  ticksToDowngrade: number;
  upgradeBlocked: number;
  energyDumpPosition: WorldPosition | undefined;
  store: ResourceInfoCollection;

  private _upgradeAction?: UpgradeController;
  private _claimAction?: Claim;
  private _attackControllerAction?: AttackController;
  private _reserveControllerAction?: ReserveController;
  private _signControllerAction?: SignController;
  private _dumpEnergyAction?: DropoffAny;
  private _useEnergyAction?: PickupAny;

  getActionUpgrade(): UpgradeController {
    if (!this._upgradeAction) {
      this._upgradeAction = new UpgradeController(this);
    }
    return this._upgradeAction;
  }

  getActionClaim(): Claim {
    if (!this._claimAction) {
      this._claimAction = new Claim(this);
    }
    return this._claimAction;
  }

  getActionAttackController(): AttackController {
    if (!this._attackControllerAction) {
      this._attackControllerAction = new AttackController(this);
    }
    return this._attackControllerAction;
  }

  getActionReserveController(): ReserveController {
    if (!this._reserveControllerAction) {
      this._reserveControllerAction = new ReserveController(this);
    }
    return this._reserveControllerAction;
  }

  getActionSignController(): SignController {
    if (!this._signControllerAction) {
      this._signControllerAction = new SignController(this, "Default sign");
    }
    return this._signControllerAction;
  }

  getActionDumpEnergy(): DropoffAny {
    if (!this._dumpEnergyAction) {
      this.getEnergyDumpPosition();
      if (this.energyDumpPosition) {
        let dumpPositionWrapper = new RoomPositionWrapper(this.roomWrapper.id, this.energyDumpPosition);
        this._dumpEnergyAction = new DropoffAny(dumpPositionWrapper, this.store);
        this._dumpEnergyAction.maxRange = 0;
      } else {
        this._dumpEnergyAction = new DropoffAny(this as any, this.store);
      }
    }
    this._dumpEnergyAction.priority = Priority.BOTTOM;
    return this._dumpEnergyAction;
  }

  getActionUseEnergy(): PickupAny {
    if (!this._useEnergyAction) {
      this.getEnergyDumpPosition();
      if (this.energyDumpPosition) {
        this._useEnergyAction = new PickupAny(this.energyDumpPosition, this.store);
        this._useEnergyAction.maxRange = 0;
      } else {
        this._useEnergyAction = new PickupAny(this as any, this.store);
      }
    }
    this._useEnergyAction.priority = Priority.BOTTOM;
    return this._useEnergyAction;
  }

  getEnergyDumpPosition(): WorldPosition | undefined {
    if (!this.energyDumpPosition) {
      let intel = getRoomIntel(this.wpos.roomName);
      logger.log("finding energy dump position");
      let allSpawns = intel.buildings[PlayerStatus.MINE].getGroupWithValueGetObjects("wrapperType", "SpawnWrapper");
      let closestSpawn = allSpawns.sort((a, b) => a.wpos.getRangeTo(this.wpos) - b.wpos.getRangeTo(this.wpos))[0];
      if (closestSpawn) {
        let pathToSpawn = PathFinder.search(this.wpos.toRoomPosition(), closestSpawn.wpos.toRoomPosition(), {
          maxRooms: 1,
          roomCallback: (roomName) => {
            let thisRoomIntel = getRoomIntel(roomName);
            let allStructs = [
              ...thisRoomIntel.buildings[PlayerStatus.MINE].getAll(),
              ...thisRoomIntel.buildings[PlayerStatus.ENEMY].getAll(),
              ...thisRoomIntel.buildings[PlayerStatus.NEUTRAL].getAll(),
              ...thisRoomIntel.buildings[PlayerStatus.FRIENDLY].getAll(),
            ]
            let costMatrix = costMatrixUtils.getCM(roomName);
            for (const struct of allStructs) {
              costMatrix.set(struct.wpos.toRoomPosition().x, struct.wpos.toRoomPosition().y, 255);
            }
            return costMatrix;
          }
        });
        if (pathToSpawn.path.length > 0) {
          this.energyDumpPosition = pathToSpawn.path[3].toWorldPosition();
        }
      }


      logger.log("energy dump position", this.energyDumpPosition?.toRoomPosition(), closestSpawn, allSpawns.length, intel.buildings[PlayerStatus.MINE].getGroup("wrapperType"), SpawnWrapper.constructor);
    }
    return this.energyDumpPosition;

  }


  static fromJSON(json: ControllerWrapperData): ControllerWrapper {
    const wrapper = new ControllerWrapper(json.id as Id<StructureController>);
    GameObjectWrapper.fromJSON(json, wrapper);
    wrapper.level = json.level;
    wrapper.progress = json.progress;
    wrapper.progressTotal = json.progressTotal;
    wrapper.reservation = json.reservation;
    wrapper.ticksToDowngrade = json.ticksToDowngrade;
    wrapper.upgradeBlocked = json.upgradeBlocked;
    return wrapper;
  }

  toJSON(): ControllerWrapperData {
    return {
      ...super.toJSON(),
      level: this.level,
      progress: this.progress,
      progressTotal: this.progressTotal,
      reservation: this.reservation,
      ticksToDowngrade: this.ticksToDowngrade,
      upgradeBlocked: this.upgradeBlocked,
    };
  }

  constructor(id: string) {
    super(id as Id<StructureController>);
    this.level = 0;
    this.progress = 0;
    this.progressTotal = 0;
    this.reservation = undefined;
    this.ticksToDowngrade = 0;
    this.upgradeBlocked = 0;
    this.store = new ResourceInfoCollection();
    this.store.setMaxTotal(1000000);
    this.store.setMax(RESOURCE_ENERGY, 1000000);
    // this.store.setMin(RESOURCE_ENERGY, );
  }

  update() {
    super.update();
    const controller = this.getObject();
    if (controller) {
      this.level = controller.level;
      this.progress = controller.progress;
      this.progressTotal = controller.progressTotal;
      this.reservation = controller.reservation;
      this.ticksToDowngrade = controller.ticksToDowngrade;
      this.upgradeBlocked = controller.upgradeBlocked;
      if (this.my) {
        this.store.clear();
        //update store from dropped resources in area
        const resources = controller.pos.findInRange(FIND_DROPPED_RESOURCES, 4);
        for (const resource of resources) {
          const wrapper: ResourceWrapper = resource.getWrapper()
          wrapper.nearController = true;
          this.store.addAmount(resource.resourceType, resource.amount);
        }
      }
    }
  }
}

registerObjectWrapper(StructureController, ControllerWrapper);
