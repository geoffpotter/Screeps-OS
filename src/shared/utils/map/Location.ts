


export interface hasLocation {
  x:number,
  y:number
}

type LocationId = string;

let locationMap = new Map<LocationId, Location>();

export function getLocationIdFromObj(loc:hasLocation) {
  return `${loc.x}-${loc.y}`
}
export function getLocationId(x:number, y:number) {
  return `${x}-${y}`
}

export class Location {
  static getLocationFromObj(loc:hasLocation) {
    return Location.getLocation(loc.x, loc.y);
  }
  static getLocation(x:number, y:number):Location {
    let locId = getLocationId(x, y);
    if(locationMap.has(locId)) {
      //@ts-ignore ts not knowing maps again
      return locationMap.get(locId);
    }
    let location = new Location(x, y);
    locationMap.set(locId, location);
    return location;
  }

  private _id:LocationId;
  get id():LocationId {
    return this._id;
  }
  private _x:number;
  private _y:number;
  get x() {
    return this._x;
  }
  get y() {
    return this._y;
  }
  constructor(x:number, y:number, id?:LocationId) {
    this._id = id || getLocationId(x, y);
    this._x = x;
    this._y = y;
  }
}

