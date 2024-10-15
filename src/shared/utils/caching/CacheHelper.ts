import { queueTask } from "shared/polyfills/tasks";



let cacheHelpers: Set<CacheHelper> = new Set();

//run through all the cached values and see if their value needs to be cleared out
queueTask(()=>{
  let currentTick = Game.time;
  cacheHelpers.forEach((cacheHelper)=>{
    cacheHelper.refreshCache(currentTick);
  })
})

export class CacheHelper {
  private refreshInterval: number;
  private nextRefreshTick:number = 0;
  private refreshFN: () => void;
  constructor(refreshFN: () => void, cacheTTL = 1, refreshNow = true) {
    this.refreshInterval = 1;
    this.refreshFN = refreshFN;
    let currentTick = Game.time;
    if (refreshNow) {
      this.refreshCache(currentTick);
    } else {
      this.nextRefreshTick = currentTick + this.refreshInterval;
    }
    cacheHelpers.add(this);
  }

  // private refreshCache2() {
  //   this.refreshFN();
  // }

  refreshCache(currentTick:number) {
    if(currentTick >= this.nextRefreshTick) {
      //time to clear
      this.refreshFN();
      this.nextRefreshTick = currentTick + this.refreshInterval;
    }
  }

  stopUpdating() {
    cacheHelpers.delete(this);
  }
}
