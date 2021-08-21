


 export default async function sleep(ticks: number) {
  //let endSleepTick = getTicks() + ticks;
  //console.log("sleeping for:", ticks, "from", Game.time, "to", endSleepTick);
  return (new Promise<void>((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, ticks)
  }));
}