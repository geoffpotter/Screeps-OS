

export type DemandType = BodyPartConstant | ResourceConstant;

export class ActionDemand<OurDemandType extends DemandType = DemandType> {
    demand: Map<OurDemandType, number> = new Map();

    get(demandType: OurDemandType) {
        return this.demand.get(demandType) || 0;
    }
    has(demandType: OurDemandType) {
        return this.demand.has(demandType);
    }
    delete(demandType: OurDemandType) {
        this.demand.delete(demandType);
    }
    set(demandType: OurDemandType, amount: number) {
        if(amount <= 0) {
            this.delete(demandType);
        } else {
            this.demand.set(demandType, amount);
        }
    }
    add(demandType: OurDemandType, amount: number) {
        let newAmount = (this.demand.get(demandType) || 0) + amount;
        if(newAmount <= 0) {
            this.delete(demandType);
        } else {
            this.demand.set(demandType, newAmount);
        }
    }
    addAll(demand: ActionDemand<OurDemandType>) {
        demand.forEach((value, key) => {
            this.add(key, value);
        });
    }
    subtract(demandType: OurDemandType, amount: number) {
        let newAmount = (this.demand.get(demandType) || 0) - amount;
        if(newAmount <= 0) {
            this.delete(demandType);
        } else {
            this.demand.set(demandType, newAmount);
        }
    }
    subtractAll(demand: ActionDemand<OurDemandType>) {
        demand.forEach((value, key) => {
            this.subtract(key, value);
        });
    }

    clone() {
        const clone = new ActionDemand();
        clone.demand = new Map(this.demand);
        return clone;
    }

    getTypes() {
        return Array.from(this.demand.keys());
    }

    getTotal() {
        let total = 0;
        for (const amount of this.demand.values()) {
            total += amount;
        }
        return total;
    }


    forEach(callback: (value: number, key: OurDemandType) => void) {
        this.demand.forEach(callback);
    }

    toJSON() {
        return this.demand;
    }
    [Symbol.iterator]() {
        return this.demand[Symbol.iterator]();
    }
    toString() {
        return Array.from(this.demand.entries()).map(([key, value]) => `${key}: ${value}`).join(", ");
    }
}
