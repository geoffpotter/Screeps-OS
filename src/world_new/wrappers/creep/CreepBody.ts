import { ActionDemand } from "world_new/actions/base/ActionHelpers";
import { CreepRequest, CreepRequestOptions } from "./CreepRequest";
import CreepWrapper from "./CreepWrapper";
import { CachedValue } from "shared/utils/caching/CachedValue";

type BodyPartConstant = MOVE | WORK | CARRY | ATTACK | RANGED_ATTACK | TOUGH | HEAL | CLAIM;
type BodyPartDescriptor = { type: BodyPartConstant; hits: number };


export interface bodyClassification {
    hasAttack: boolean;
    hasRanged: boolean;
    hasHeal: boolean;

    hasAttackActive: boolean;
    hasRangedActive: boolean;
    hasHealActive: boolean;

    numAttack: number;
    numRanged: number;
    numHeal: number;

    numAttackActive: number;
    numRangedActive: number;
    numHealActive: number;

    //economy stuff
    hasWork: boolean;
    hasCarry: boolean;

    hasWorkActive: boolean;
    hasCarryActive: boolean;

    numWork: number;
    numCarry: number;

    numWorkActive: number;
    numCarryActive: number;



    fatness: number;
    toughness: number;

    demand: ActionDemand;
}

export enum CreepClass {
    healer = "👨‍⚕️",//mostly heal parts
    ranged = "🏹",//mostly ranged parts
    attacker = "🤺",//mostly attack parts

    sheild = "🛡",//attack+>50%heal
    paladin = "🏇",//ranged+>50%heal
    poop = "💩",//attack+>%50ranged or ranged+>50%attack or heal+>50%attack|ranged

    wounded = "🩹",

    hauler = "🚚", //Carry no work
    worker = "🚜", // work+>=50%carry
    miner = "⛏" // Work+<50%carry

}
function newBodyClassification(): bodyClassification {
    return {
        hasAttack: false, hasRanged: false, hasHeal: false,
        hasAttackActive: false, hasRangedActive: false, hasHealActive: false,
        numAttack: 0, numRanged: 0, numHeal: 0,
        numAttackActive: 0, numRangedActive: 0, numHealActive: 0,

        hasWork: false, hasCarry: false,
        hasWorkActive: false, hasCarryActive: false,
        numWork: 0, numCarry: 0,
        numWorkActive: 0, numCarryActive: 0,

        fatness: 0, toughness: 0,
        demand: {
            attack: 0,
            ranged_attack: 0,
            heal: 0,
            work: 0,
            carry: 0,
            move: 0,
            tough: 0,
            claim: 0
        }
    }
}

function classifyCreep(creepWrapper: Creep | CreepWrapper, woundedThreshold: number = 0.5) {
    //pick a class for this creep
    if (creepWrapper instanceof Creep) {
        creepWrapper = creepWrapper.getWrapper<CreepWrapper>();
    }
    let creep = creepWrapper.getObject();
    if (!creep) {
        return CreepClass.poop;
    }
    let bodyClass = creepWrapper.getBodyClassification();
    let highestPartCount = Math.max(bodyClass.numAttack, bodyClass.numRanged, bodyClass.numHeal, bodyClass.numWork, bodyClass.numCarry);
    let activePartCount = bodyClass.numAttackActive + bodyClass.numHealActive + bodyClass.numRangedActive + bodyClass.numWorkActive + bodyClass.numCarryActive;
    //if creep is under wounded threshhold, pick wounded
    //then go through parts in attack->range->heal order to determine class type
    if (creep.hits <= creep.hitsMax * woundedThreshold || activePartCount == 0) {
        return CreepClass.wounded;
    } else if (bodyClass.numAttack == highestPartCount) { //mostly attack parts(or equal I guess)
        //some form of attack creep
        if (bodyClass.hasHeal && bodyClass.numAttack * 0.5 <= bodyClass.numHeal) {
            //at least 50% as many heal parts as attack
            return CreepClass.sheild
        }
        if (bodyClass.hasRanged && bodyClass.numAttack * 0.5 <= bodyClass.numRanged) {
            //at least 50% as many ranged parts as attack
            return CreepClass.poop;
        }
        return CreepClass.attacker;
    } else if (bodyClass.numRanged == highestPartCount) {
        if (bodyClass.numRanged * 0.5 <= bodyClass.numHeal) {
            // at least 50% heal parts
            return CreepClass.paladin;
        }
        if (bodyClass.hasAttack && bodyClass.numRanged * 0.5 <= bodyClass.numAttack) {
            //at least 50% as many attack parts as ranged
            return CreepClass.poop;
        }
        return CreepClass.ranged;
    } else if (bodyClass.numHeal == highestPartCount) {
        if (bodyClass.hasAttack && bodyClass.numHeal * 0.5 <= bodyClass.numAttack) {
            //at least 50% as many attack parts as heal
            return CreepClass.poop;
        }
        if (bodyClass.hasRanged && bodyClass.numHeal * 0.5 <= bodyClass.numRanged) {
            //at least 50% as many ranged parts as heal
            return CreepClass.poop;
        }
        return CreepClass.healer;
    } else if (bodyClass.numWork == highestPartCount) {
        if (bodyClass.hasCarry && bodyClass.numWork * 0.5 <= bodyClass.numCarry) {
            return CreepClass.miner;
        }
        return CreepClass.worker;
    } else if (bodyClass.numCarry == highestPartCount) {
        if (bodyClass.hasWork) {
            return CreepClass.worker;
        }
        return CreepClass.hauler;
    }

    return CreepClass.poop;
}

export function predictedCreepRequestOptions(creepBody: CreepBody): CreepRequestOptions {
    let creepClass = creepBody.getCreepClass();
    let bodyClass = creepBody.getBodyClassification();

    let primaryPart: BodyPartConstant;
    let secondaryPart: BodyPartConstant | false = false;
    let secondaryPerPrimary = 0;
    let fatness = 0;
    let toughness = 0;

    // Determine primary and secondary parts based on creep class
    switch (creepClass) {
        case CreepClass.worker:
            primaryPart = WORK;
            secondaryPart = CARRY;
            break;
        case CreepClass.hauler:
            primaryPart = CARRY;
            secondaryPart = MOVE;
            break;
        case CreepClass.attacker:
            primaryPart = ATTACK;
            secondaryPart = MOVE;
            break;
        case CreepClass.ranged:
            primaryPart = RANGED_ATTACK;
            secondaryPart = MOVE;
            break;
        case CreepClass.healer:
            primaryPart = HEAL;
            secondaryPart = MOVE;
            break;
        default:
            primaryPart = MOVE;
    }

    // Calculate ratios
    const totalParts = creepBody.numParts(MOVE) + creepBody.numParts(WORK) +
        creepBody.numParts(CARRY) + creepBody.numParts(ATTACK) +
        creepBody.numParts(RANGED_ATTACK) + creepBody.numParts(HEAL);

    const primaryCount = creepBody.numParts(primaryPart);
    const secondaryCount = secondaryPart ? creepBody.numParts(secondaryPart) : 0;

    if (secondaryPart && secondaryCount > 0) {
        secondaryPerPrimary = secondaryCount / primaryCount;
    }

    // Calculate fatness (non-MOVE parts ratio)
    fatness = (totalParts - creepBody.numParts(MOVE)) / totalParts;

    // Calculate toughness (TOUGH parts ratio)
    toughness = creepBody.numParts(TOUGH) / totalParts;

    return {
        name: "",
        primaryPart,
        secondaryPart,
        secondaryPerPrimary,
        fatness,
        toughness,
    };
}


export class CreepBody {
    creepWrapper: CreepWrapper;
    body: BodyPartDescriptor[] | null = null;
    /**
     * number from 0.0-1.0 representing the hits threshold for being wounded
     */
    woundedThreshold: number = 0.55;

    private creepClass: CachedValue<CreepClass>;
    private bodyClassification: CachedValue<bodyClassification>;
    private predictedCreepRequestOptions: CachedValue<CreepRequestOptions>;
    updateBody() {
        let creep = this.creepWrapper.getObject();
        if (creep) {
            this.body = creep.body;
        }
    }
    getBodyClassification() {
        //console.log(this.creepWrapper.id, "getting body", this.bodyClassification)
        let classification = this.bodyClassification.get();
        //console.log(classification)
        return classification;
    }
    getBodyAsDemand() {

    }

    constructor(creepWrapper: CreepWrapper) {
        this.creepWrapper = creepWrapper;
        let creep = creepWrapper.getObject();
        if (creep) {
            this.body = creep.body;
            this.updateBody();
        }
        this.bodyClassification = this.setupBodyClassification(creepWrapper);
        this.creepClass = new CachedValue(() => {
            return classifyCreep(creepWrapper, this.woundedThreshold)
        }, 1500, false)
        this.predictedCreepRequestOptions = this.setupPredictedCreepRequestOptions();
    }
    getLevel() {
        let creepRequestOptions = this.predictedCreepRequestOptions.get();
        let numPrimary = this.numParts(creepRequestOptions.primaryPart);
        return numPrimary;
    }
    private setupPredictedCreepRequestOptions() {
        return new CachedValue<CreepRequestOptions>(() => {
            return predictedCreepRequestOptions(this);
        }, 1500, false);
    }

    private setupBodyClassification(creepWrapper: CreepWrapper) {

        return new CachedValue<bodyClassification>(() => {
            let creep = creepWrapper.getObject();
            let ret = newBodyClassification();
            if (!creep) return ret;

            //console.log("counting body parts", creep.body.length)

            //handle body counts
            for (let part of creep.body) {
                //@ts-ignore no clue why it's complaining "object my not exists", what object mofo?
                ret.demand[part.type]++;
                if (part.type == ATTACK) {
                    ret.hasAttack = true;
                    ret.numAttack++;
                    if (part.hits > 0) {
                        ret.hasAttackActive = true;
                        ret.numAttackActive++;
                    }
                }
                if (part.type == RANGED_ATTACK) {
                    ret.numRanged++;
                    ret.hasRanged = true;
                    if (part.hits > 0) {
                        ret.hasRangedActive = true;
                        ret.numRangedActive++;
                    }
                }
                if (part.type == HEAL) {
                    ret.hasHeal = true;
                    ret.numHeal++;
                    if (part.hits > 0) {
                        ret.hasHealActive = true;
                        ret.numHealActive++;
                    }
                }

                if (part.type == CARRY) {
                    ret.hasCarry = true;
                    ret.numCarry++;
                    if (part.hits > 0) {
                        ret.hasCarryActive = true;
                        ret.numCarryActive++;
                    }
                }
                if (part.type == WORK) {
                    ret.hasWork = true;
                    ret.numWork++;
                    if (part.hits > 0) {
                        ret.hasWorkActive = true;
                        ret.numWorkActive++;
                    }
                }

            }



            //console.log('counted body:', ret)
            return ret;
        }, 1, false);
    }

    getCreepClass(): CreepClass {
        return this.creepClass.get();
    }

    isAttacker(onlyActive = false) {
        let description = this.bodyClassification.get();
        if (onlyActive) {
            return description.hasAttackActive;
        } else {
            return description.hasAttack;
        }
    }
    isRangedAttacker(onlyActive = false) {
        let description = this.bodyClassification.get();
        if (onlyActive) {
            return description.hasRangedActive;
        } else {
            return description.hasRanged;
        }
    }
    isHealer(onlyActive = false) {
        let description = this.bodyClassification.get();
        if (onlyActive) {
            return description.hasHealActive;
        } else {
            return description.hasHeal;
        }
    }
    isWorker() {
        return this.creepClass.get() == CreepClass.worker;
    }
    isHauler() {
        return this.creepClass.get() == CreepClass.hauler;
    }
    hasPart(partType: BodyPartConstant) {
        if (!this.body) {
            return false;
        }
        return this.body.some((part) => part.type == partType);
    }
    numParts(partType: BodyPartConstant) {
        if (!this.body) {
            return 0;
        }
        return this.body.filter((part) => part.type == partType).length;
    }
}
