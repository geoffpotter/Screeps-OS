

import visual from "shared/utils/visual";
import Logger from "shared/utils/logger";
let logger = new Logger("prototypeCreep");

declare global {
  interface Creep {


    _weight: number;
    getWeight(): number;
    getCost(terrainType: string): number;
    getColor(): string;
  }
}



let colors = new Map<string, string>();
Creep.prototype.getColor = function () {
    if (!colors.has(this.name)) {
        colors.set(this.name, "#" + visual.rgbColor(Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), Math.floor(Math.random() * 256)).toString());
    }
    return colors.get(this.name)!;
}

//add new methods
/**
* Calculate the weight (fatness factor) of the creep
* @returns {number} The weight of the creep
*/
Creep.prototype.getWeight = function (): number {
    if (!this._weight) {
        const body = this.body;
        const carryParts = body.filter(part => part.type === CARRY);
        const otherParts = body.filter(part => part.type !== CARRY && part.type !== MOVE);

        // Calculate the weight of parts that generate fatigue
        const baseWeight = otherParts.length * 2; // Non-CARRY, non-MOVE parts cost 2 fatigue

        // Calculate the weight of CARRY parts based on their contents
        const carryWeight = (this.store.getUsedCapacity() / (carryParts.length || 1)) * 2; // Each unit of resource costs 1 fatigue, so multiply by 2 for the new scale

        // Calculate total weight
        const totalWeight = baseWeight + carryWeight;

        this._weight = totalWeight;
    }
    // this.say((this._weight).toFixed(2));
    return this._weight;
}

const terrainCosts = {
    "wall": Infinity,
    "swamp": 10,
    "plain": 2,
    "road": 1,
};

Creep.prototype.getCost = function (terrainType: keyof typeof terrainCosts): number {
    let cost = terrainCosts[terrainType] || 1;
    let totalWeight = this.getWeight();
    // Calculate the effective weight considering MOVE parts
    // Each MOVE part reduces the effect of weight by 2
    const moveParts = this.body.filter(part => part.type === MOVE);
    const effectiveWeight = Math.max(0, totalWeight * cost - (moveParts.length * 2));

    // Normalize the weight
    const normalizedWeight = effectiveWeight / this.body.length;

    // Adjust the weight to fit the terrain multiplier scale
    // This will result in a value that, when multiplied by the terrain factor,
    // gives the number of ticks the creep will spend on that tile
    logger.log(this.name, "getCost", terrainType, effectiveWeight, totalWeight, cost, moveParts.length, normalizedWeight);
    return normalizedWeight;
}
