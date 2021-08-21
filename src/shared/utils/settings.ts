interface settingsObject {
  [x: string]: Function | string | number | boolean | settingsObject;
}


class settingsController {
  settings: Map<string, Function | boolean | string | number> = new Map();

  constructor() {

  };

  getCpu(): number {
    if (this.settings.has('getCpu')) {
      let func = this.settings.get("getCpu");
      if (typeof func == "function") {
        return func();
      }
    }
    console.log("getCpu not in settings! using date()");
    return new Date().valueOf();
  }

  getTick(): number {
    if (this.settings.has('getTick')) {
      let func = this.settings.get("getTick");
      if (typeof func == "function") {
        return func();
      }
    }
    throw new TypeError("getTick not defined in Settings!")
  }

  getMemory(): object {
    if (this.settings.has('getMemory')) {
      let func = this.settings.get("getMemory");
      if (typeof func == "function") {
        return func();
      }
    }
    throw new TypeError("getMemory not defined in Settings!")
  }

  getSetting(settingName: string) {
    if (this.settings.has(settingName)) {
      return this.settings.get(settingName);
    }
    return false;
    //throw new Error(`Accessing undefined setting: ${settingName}`);
  }


  setSetting(settingName: string, value: Function | string | number | boolean) {
    this.settings.set(settingName, value);
  }

  setSettings(settingsObject: settingsObject, baseName: string | boolean = false) {
    for (let settingName in settingsObject) {
      let value = settingsObject[settingName];
      let name = settingName;
      if (baseName) {
        name = baseName + "." + settingName;
      }
      if (typeof value == "object") {
        this.setSettings(value, name);
      } else {
        this.setSetting(settingName, value);
      }
    }
  }
}

export let settings = new settingsController();
