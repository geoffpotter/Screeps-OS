import WorldPosition from "shared/utils/map/WorldPosition";


interface RoomPosition {
  getSurroundingSpaces():Array<RoomPosition>;
  getSurroundingClearSpaces():Array<RoomPosition>;
  isClearSpace():boolean;
  isBlocked():boolean;
  isEdge():boolean;
  toWorldPosition():WorldPosition
}



