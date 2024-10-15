import { GameObjectWrapper, GameObjectWrapperData } from "./base/GameObjectWrapper";
import { registerObjectWrapper } from "./base/AllGameObjects";
import { StorableCreatableClass } from "shared/utils/memory";
import { UpgradeController } from "../actions/economy/UpgradeController";
import { Claim } from "../actions/economy/Claim";
import { AttackController } from "../actions/economy/AttackController";
import { ReserveController } from "../actions/economy/ReserveController";
import { SignController } from "../actions/economy/SignController";
import { RoomMode } from "./room";
import { ActionDemand } from "../actions/base/ActionHelpers";
import WorldPosition from "shared/utils/map/WorldPosition";
import { getRoomIntel, PlayerStatus } from "shared/subsystems/intel";
import { Dropoff } from "world_new/actions/economy/Dropoff";
import { Pickup } from "world_new/actions/economy/Pickup";
import { ResourceInfoCollection } from "shared/utils/Collections/ResourceInfoCollection";
import { TypeInfoCollection } from "shared/utils/Collections/TypeInfoCollection";
import Logger from "shared/utils/logger";
import { SpawnWrapper } from "./spawn";
import { RoomPositionWrapper } from "./room/RoomPositionWrapper";

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

  upgradeAction: UpgradeController;
  claimAction: Claim;
  attackControllerAction: AttackController;
  reserveControllerAction: ReserveController;
  signControllerAction: SignController;
  dumpEnergyAction: Dropoff;
  useEnergyAction: Pickup;

  store: ResourceInfoCollection;

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
    this.upgradeAction = new UpgradeController(this);
    this.claimAction = new Claim(this);
    this.attackControllerAction = new AttackController(this);
    this.reserveControllerAction = new ReserveController(this);
    this.signControllerAction = new SignController(this, "Default sign");
    //@ts-ignore
    this.dumpEnergyAction = new Dropoff(this);
    //@ts-ignore
    this.useEnergyAction = new Pickup(this);
  }

  registerActions() {
    super.registerActions();
    if (this.colony) {
      logger.log(this.id, "registering actions");
      this.colony.registerAction(this.upgradeAction);
      this.colony.registerAction(this.claimAction);
      this.colony.registerAction(this.attackControllerAction);
      this.colony.registerAction(this.reserveControllerAction);
      this.colony.registerAction(this.signControllerAction);
      this.colony.registerAction(this.dumpEnergyAction);
      this.colony.registerAction(this.useEnergyAction);
    }
    this.update();
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

      // Update actions
      if (!this.my) {
        let roomMode = this.roomWrapper.roomMode;
        if (roomMode == RoomMode.OWNED && (this.getObject() == null || !this.getObject()!.my)) {
          this.claimAction.currentDemand = { [CLAIM]: 1 } as ActionDemand;
        }
        this.attackControllerAction.currentDemand = {} as ActionDemand;
        this.reserveControllerAction.currentDemand = {} as ActionDemand;
      } else {
        let currentlyAssigned = this.upgradeAction.getCurrentAssignedParts();
        this.upgradeAction.currentDemand = {
          [WORK]: this.level == 8 ? 15 : 100,
          [CARRY]: (currentlyAssigned[CARRY] || 0) + 1
        } as ActionDemand;
        this.signControllerAction.currentDemand = controller.sign ? {} : { [MOVE]: 1 } as ActionDemand;
        let intel = getRoomIntel(this.roomWrapper.id);
        if (!this.energyDumpPosition) {
          logger.log("finding energy dump position");
          let allSpawns = intel.buildings[PlayerStatus.MINE].getGroupWithValueGetObjects("wrapperType", "SpawnWrapper");
          let closestSpawn = allSpawns.sort((a, b) => a.wpos.getRangeTo(this.wpos) - b.wpos.getRangeTo(this.wpos))[0];
          if (closestSpawn) {
            let pathToSpawn = PathFinder.search(this.wpos.toRoomPosition(), closestSpawn.wpos.toRoomPosition(), {
              maxRooms: 1,
              roomCallback: (roomName) => {
                return roomName == this.roomWrapper.id;
              }
            });
            if (pathToSpawn.path.length > 0) {
              this.energyDumpPosition = pathToSpawn.path[3].toWorldPosition();
            }
          }
          if (this.energyDumpPosition) {
            if (this.dumpEnergyAction) {
              this.dumpEnergyAction.unassignAll();
            }
            if (this.colony) {
              this.colony.unregisterAction(this.dumpEnergyAction);
            }
            let dumpPositionWrapper = new RoomPositionWrapper(this.roomWrapper.id, this.energyDumpPosition);
            this.dumpEnergyAction = new Dropoff(dumpPositionWrapper);
            this.dumpEnergyAction.maxRange = 0;
            if (this.useEnergyAction) {
              this.useEnergyAction.unassignAll();
            }
            if (this.colony) {
              this.colony.unregisterAction(this.useEnergyAction);
            }
            this.useEnergyAction = new Pickup(dumpPositionWrapper);
            // this.useEnergyAction.maxRange = 1;
            if (this.colony) {
              this.colony.registerAction(this.useEnergyAction);
              this.colony.registerAction(this.dumpEnergyAction);
            }
          }

          logger.log("energy dump position", this.energyDumpPosition?.toRoomPosition(), closestSpawn, allSpawns.length, intel.buildings[PlayerStatus.MINE].getGroup("wrapperType"), SpawnWrapper.constructor);
        }
        if (this.energyDumpPosition !== undefined) {
          let dumpPosition = this.energyDumpPosition;
          //update store
          this.store.setMaxTotal(10000);
          this.store.setMax(RESOURCE_ENERGY, 10000);
          this.store.setMin(RESOURCE_ENERGY, 1000);
          //get resources on ground near dump position
          let resources = intel.droppedResources.getGroupWithValueGetObjects("resourceType", RESOURCE_ENERGY).filter((resource) => resource.wpos.getRangeTo(dumpPosition) < 5);
          let resourcesInArea = new ResourceInfoCollection();
          this.store.setAmount(RESOURCE_ENERGY, 0);
          for (const i in resources) {
            let resource = resources[i];
            resource.supressActions = true;
            let existingResource = resourcesInArea.get(resource.resourceType);
            this.store.setAmount(resource.resourceType, this.store.getAmount(resource.resourceType) + resource.amount);
            if (existingResource) {
              resourcesInArea.setAmount(resource.resourceType, existingResource.amount + resource.amount);
            } else {
              resourcesInArea.setAmount(resource.resourceType, resource.amount);
            }
          }
          logger.log("resources in area", resourcesInArea.getTypes(), this.store.getTypesByAmountAvailable(), this.store.getTypesByAmountAllowed(), this.store, this.store.get(RESOURCE_ENERGY));

          this.useEnergyAction.wpos = dumpPosition;
          this.useEnergyAction.resourceAmounts.updateFromCollection(resourcesInArea.getTypesByAmountAvailable());
          this.useEnergyAction.currentDemand = this.useEnergyAction.calculateDemand();
          this.useEnergyAction.display();
          logger.log("use energy action demand", this.useEnergyAction.currentDemand, this.useEnergyAction.wpos.toRoomPosition());

          this.dumpEnergyAction.wpos = dumpPosition;
          this.dumpEnergyAction.resourceAmounts.updateFromCollection(this.store.getTypesByAmountAllowed());
          this.dumpEnergyAction.currentDemand = this.dumpEnergyAction.calculateDemand();
          // this.dumpEnergyAction.display();
          logger.log("dump energy action demand", this.dumpEnergyAction.currentDemand, this.dumpEnergyAction.wpos.toRoomPosition());
        }

      }
    }
  }
}

registerObjectWrapper(StructureController, ControllerWrapper);
