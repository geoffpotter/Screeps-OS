import { queueTask } from "shared/polyfills/tasks";
import { getSettings } from "../settings";


export class CachedValue<T> {
  private cacheTTL: number;

  private nextClearTick:number = 0;
  private currentValue: T | null = null;
  private refreshFN: () => T;

  constructor(refreshFN: () => T, cacheTTL = 1, refreshNow = false) {
    this.cacheTTL = cacheTTL;
    this.refreshFN = refreshFN;
    if (refreshNow) {
      this.currentValue = this.getNewValue();
    }
    if(cacheTTL == Infinity) {
      this._hasValue = this.hasCachedValue;
      this.get = this.getCachedValue
    }
  }

  private checkClearCache() {
    let currentTick = getSettings().getTick();
    if(this.hasCachedValue() && currentTick >= this.nextClearTick) {
      //time to clear
      this.clearValue();
    }
  }

  private getNewValue() {
    let currentTick = getSettings().getTick();
    this.nextClearTick = currentTick + this.cacheTTL;
    return this.currentValue = this.refreshFN();
  }


  //if ttl == infinity, _hasValue is overwitten with the non cache version.
  private hasCachedValue():boolean {
    return this.currentValue !== null;
  }
  private _hasValue():boolean {
    this.checkClearCache()
    return this.hasCachedValue();
  }

  private getCachedValue(): T {
    if (!this.currentValue) {
      this.currentValue = this.getNewValue();
    }
    return this.currentValue;
  }
  get(): T {
    this.checkClearCache()
    return this.getCachedValue();
  }


  // public API
  get hasValue():boolean {
    return this._hasValue();
  }
  get value() {
    return this.get()
  }
  set value(newValue:T) {
    this.currentValue = newValue;
  }

  clearValue(): void {
    this.currentValue = null;
  }
}
