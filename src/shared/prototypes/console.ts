
let consoleStartTimes:Map<string, number> = new Map();

console.time = function(label:string) {
    // console.log("here", label   )
    if (consoleStartTimes.has(label)) {
        console.error("Label already exists:", label);
    }
    consoleStartTimes.set(label, Game.cpu.getUsed());
}
console.timeEnd = function(label:string) {
    if (!consoleStartTimes.has(label)) {
        console.error("Label does not exist:", label);
        return;
    }
    const startTime = consoleStartTimes.get(label)!;
    consoleStartTimes.delete(label);
    const endTime = Game.cpu.getUsed();
    const timeTaken = endTime - startTime;
    console.log(`Time taken for ${label}: ${timeTaken} CPU ticks`);

}
console.error = function(args) {
    console.log("ERROR:", ...args)
}

export default console;

