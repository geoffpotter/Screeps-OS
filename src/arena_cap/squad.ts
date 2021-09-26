import { BodyPart, Flag } from "arena/prototypes";
import { ATTACK, BOTTOM, BOTTOM_LEFT, BOTTOM_RIGHT, HEAL, LEFT, MOVE, RANGED_ATTACK, RIGHT, TERRAIN_SWAMP, TERRAIN_WALL, TOP, TOP_LEFT, TOP_RIGHT } from "game/constants";
import { CostMatrix, PathStep, searchPath } from "game/path-finder";
import { Creep, StructureTower } from "game/prototypes";
import { findClosestByPath, findClosestByRange, findInRange, findPath, getDirection, getDistance, getObjectsByPrototype, getRange, getTerrainAt } from "game/utils";
import { FakeGameObject, Location } from "shared/utils/settings";
import { getSettings } from "shared/utils/settings"


declare module "game/prototypes" {
    interface Creep {
      squadId:string
    }
  }

interface creepPartRequirements {
    ranged:number,
    attack:number,
    heal:number
}

function getDirectionPos(from:Location, to:Location) {
    return getDirection(to.x-from.x, to.y-from.y);
}

function drawPath(path:PathStep[], color:string = "#00FF00") {

    let style = {color: color};


    var charMap:any = {};
    charMap[TOP] ="⬆";
    charMap[TOP_LEFT] = "↖";
    charMap[TOP_RIGHT] = "↗";

    charMap[LEFT] = "⬅";
    charMap[RIGHT] ="➡";
    charMap[BOTTOM] = "⬇";
    charMap[BOTTOM_LEFT] ="↙";
    charMap[BOTTOM_RIGHT] = "↘";

    let lastPosition = path[0];

    let settings = getSettings();
    for (let position of path) {
        if (lastPosition == position) {
            settings.drawText("*", lastPosition, style);
        } else {
            let direction = getDirectionPos(lastPosition, position);
           settings.drawText(charMap[direction], lastPosition, style);
            // new RoomVisual(position.roomName)
            //     .line(position, lastPosition, style);

        }
        lastPosition = position;
    }
}


let cm:CostMatrix;
let cmTime:number = 0;
function addToCMInRange(cm: CostMatrix, x_in: number, y_in: number, range: number, cost: any) {
    var xStart = x_in - range;
    var yStart = y_in - range;
    var xEnd = x_in + range;
    var yEnd = y_in + range;

    for(var x = xStart; x < xEnd; x++) {
        if(x>=100||x<=0)
            continue;
        for(var y = yStart; y < yEnd; y++) {
            if(y>=100||y<=0)
                continue;
            let currentValue = cm.get(x,y);
            if(currentValue<255) {
                let newValue = Math.min(cost+currentValue, 254)
                cm.set(x, y, newValue);
                //console.log("set CM value:", x,y,currentValue, newValue)
            }
        }
    }
}
function getWeightPenalty(x: number, y: number) {
    let tile = getTerrainAt({x: x, y: y});
    if(tile === TERRAIN_WALL) {
        return 20;
    } else if(tile === TERRAIN_SWAMP) {
        return 5;
    }
    return 0;
}
function getSquareCost(x: number, y: number) {
    let penalty = 0;
    penalty += getWeightPenalty(x+1, y);
    penalty += getWeightPenalty(x, y+1);
    penalty += getWeightPenalty(x+1, y+1);
    penalty += getWeightPenalty(x-1, y);
    penalty += getWeightPenalty(x, y-1);
    penalty += getWeightPenalty(x-1, y-1);
    penalty += getWeightPenalty(x+1, y-1);
    penalty += getWeightPenalty(x-1, y+1);
    return penalty
}
function drawCM() {
    let txt = '';
    for(let y = 0; y < 100; y++) {
        for(let x = 0; x < 100; x++) {
            let val = cm.get(x,y);
            //settings.drawText(""+val, {x:x,y:y})
            txt += val;
        }
        txt += "\n";
    }
    //settings.drawText(txt, {x:0,y:0})
    console.log("-------------------------Cost matrix------------------")
    console.log(txt)
}
function resetCM() {
    cm = new CostMatrix();
    for(let y = 0; y < 100; y++) {
        for(let x = 0; x < 100; x++) {
            let tile = getTerrainAt({x: x, y: y});
            //penalitys for surrounding squares, not costs
            let plains = 0;
            let swamps = 5;
            let walls = 10;
            //cm.set(x, y, weight);
            let towerHere = getObjectsByPrototype(StructureTower).filter((t)=> t.x==x && t.y==y).length > 0;
            if(tile === TERRAIN_WALL || towerHere) {
                cm.set(x,y,255);
                addToCMInRange(cm, x, y, 2, walls)
            } else if(tile === TERRAIN_SWAMP) {
                addToCMInRange(cm, x, y, 3, swamps)
            } else {
                //addToCMInRange(cm, x, y, 3, plains)
            }
            // if(tile !== TERRAIN_WALL && !towerHere) {
            //     let cost = getSquareCost(x, y);
            //     let thisCost = getWeightPenalty(x,y) || 1;
            //     let totalCost = cost + thisCost;
            //     totalCost = Math.min(totalCost, 244)
            //     cm.set(x, y, totalCost);
            //     //console.log("set CM value:", x,y,cost, thisCost)
            // } else {
            //     cm.set(x,y,255)
            // }
        }
    }
    console.log("CM has been reset")
}
export function getCM() {
    let settings = getSettings();
    //once per game should be ok, no creeps or strucs in it
    if(settings.getTick() > (cmTime)) {
        console.log("resetting CM!", cmTime)
        resetCM();
        cmTime = settings.getTick() + 2000;
    }

    return cm;
}


export class Squad {
    id:string;
    requirements:creepPartRequirements;

    creeps:Creep[];
    private healers:Creep[];
    private attackers:Creep[];
    private ranged:Creep[];

    validTargets:FakeGameObject[];
    targetLocation:Location;
    targetDistance:number = 0;
    targetRush:boolean = false;
    currentLocation:Location;


    maxFormationSize_attackers_min:number = 2;
    maxFormationSize_attackers_max:number = 4;
    maxFormationSize_ranged_min:number = 2;
    maxFormationSize_ranged_max:number = 4;
    maxFormationSize_healers_min:number = 0;
    maxFormationSize_healers_max:number = 3;

    private path:PathStep[]|false;
    private currentPathIndex: number;

    private retreatingToHeal:boolean = false;
    private retreating:boolean = false;

    public lastTarget:FakeGameObject|false = false;
    private initialWait:boolean = true;
    leadSquad:boolean = false;

    constructor(id:string, requiredParts:creepPartRequirements, targets:FakeGameObject[] = [], creeps:Creep[] = []) {
        this.id = id;
        this.requirements = requiredParts;
        this.validTargets = targets;
        this.targetLocation = {x:-1,y:-1};
        this.currentLocation = {x:-1,y:-1};
        this.path=false;
        this.currentPathIndex = 0;

        this.creeps = [];
        this.healers = [];
        this.attackers = [];
        this.ranged = [];
        if(creeps) {
            for(let creep of creeps) {
                this.addCreep(creep);
            }
        }
    }
    private moveCurrentPositionToAMember() {
        if(this.attackers.length > 0) {
            this.currentLocation.x = this.attackers[0].x;
            this.currentLocation.y = this.attackers[0].y;
        }
        if(this.ranged.length > 0) {
            this.currentLocation.x = this.ranged[0].x;
            this.currentLocation.y = this.ranged[0].y;
        }
        if(this.healers.length > 0) {
            this.currentLocation.x = this.healers[0].x;
            this.currentLocation.y = this.healers[0].y;
        }
    }
    private reparseCreeps() {
        let creeps = this.creeps;
        this.creeps = [];
        this.healers = [];
        this.attackers = [];
        this.ranged = [];
        if(creeps) {
            for(let creep of creeps) {
                this.addCreep(creep);
            }
        }
    }
    private addCreep(creep:Creep) {
        if(!creep.exists) {
            return;
        }
        creep.squadId = this.id;
        this.creeps.push(creep);
        if(creep.isHealer()) {
            this.healers.push(creep);
        }
        if(creep.isAttacker()) {
            this.attackers.push(creep);
        }
        if(creep.isRangedAttacker()) {
            this.ranged.push(creep);
        }
    }

    get inCombat() {
        let enemyCreeps = getObjectsByPrototype(Creep).filter((c)=>!c.my);
        let squadWidth = Math.max(this.maxFormationSize_attackers_max, this.maxFormationSize_healers_max, this.maxFormationSize_ranged_max);
        let secondaryTargets = findInRange(this.currentLocation, enemyCreeps, squadWidth);
        let inCombat = secondaryTargets.length > 1;
        if(inCombat && !(this.lastTarget instanceof Creep)) {
            this.moveToClosestTarget();
        }
        return inCombat;
    }

    get squadInPosition() {
        if(this.initialWait) {
            return this.creepsInPosition;
        }
        let dist = getRange(this.currentLocation, this.targetLocation);
        if(dist > this.targetDistance)
           return false;
        return true;
    }

    creepDistFromPosition(creep:Creep, includeDest:boolean=false):number {
        let creepDist = getRange(this.currentLocation, creep);
        if(includeDest) {
            let creepDistFromTarget = getRange(this.targetLocation, creep);
            return Math.min(creepDist, creepDistFromTarget);
        } else {
            return creepDist;
        }
    }
    creepInPosition(creep:Creep, includeDest:boolean=false):boolean {
        //console.log("creep in position?", creep.id, creepDist, creepDistFromTarget, this.targetDistance)
        let creepDist = this.creepDistFromPosition(creep, includeDest);
        let squareCost = getSquareCost(this.currentLocation.x, this.currentLocation.y);
        let extraBuffer = 0;
        if(squareCost > 20) {
            extraBuffer = 2;
        }
        if(creep.isAttacker() && (creepDist > (this.maxFormationSize_attackers_max+extraBuffer))) {
            console.log(creep.id, "is out of position!(attacker)", creepDist, this.maxFormationSize_attackers_max, squareCost, extraBuffer);
            return false;
        } else if(creep.isRangedAttacker() && (creepDist > (this.maxFormationSize_ranged_max+extraBuffer))) {
            console.log(creep.id, "is out of position!(ranged)", creepDist, this.maxFormationSize_ranged_max, squareCost, extraBuffer);
            return false;
        // && (creep.isAttacker() || creep.isRangedAttacker())
        } else if(creep.isHealer() && (creepDist > (this.maxFormationSize_healers_max+extraBuffer))) {
            console.log(creep.id, "is out of position!(healer)", creepDist, this.maxFormationSize_healers_max, squareCost, extraBuffer);
            return false;
        }

        return true
    }
    get creepsInPosition() {

        //this prop is mostly used for movement, don't worry about that in combat
        if(this.inCombat) {
            return true;
        }
        let creepOnLoc = getObjectsByPrototype(Creep).filter(c=>c.my&&c.x==this.currentLocation.x&&c.y==this.currentLocation.y).length > 0;

        let onLocation = creepOnLoc;
        for(let creep of this.creeps) {
            let creepInPosition = this.creepInPosition(creep);
            if(!creepInPosition) {
                return false;
            }
        }
        //console.log()
        return onLocation;
    }

    getClosestTargetToOurFlag() {
        this.clearInvalidTargets();
        if(this.validTargets.length == 0) {
            console.log(this.id, "no targets, so none are close")
            return false;
        }
        //console.log(this.validTargets.length > 0 && this.validTargets[0])
        let ourFlag = getObjectsByPrototype(Flag).filter((f)=> f.my)[0];
        let closestEnemyCreep = findClosestByRange(this.currentLocation, getObjectsByPrototype(Creep).filter(c=>!c.my));
        let enemyCreepDist = 100;
        if(closestEnemyCreep)
            enemyCreepDist = getRange(this.currentLocation, closestEnemyCreep);
        let closestTarget = findClosestByPath(ourFlag, this.validTargets.filter(t=>{
            if(!(t instanceof Creep) && (enemyCreepDist < 20 || this.lastTarget instanceof Creep)) {
                return false;
            }
            return true;
        }));
        if(closestTarget) {
            return closestTarget;
        }
        return false;
    }
    getClosestTarget() {
        this.clearInvalidTargets();
        if(this.validTargets.length == 0) {
            console.log(this.id, "no targets, so none are close")
            return false;
        }
        //console.log(this.validTargets.length > 0 && this.validTargets[0])
        let closestTarget = findClosestByRange(this.currentLocation, this.validTargets);
        console.log(this.id, "getting closest target", closestTarget.id)
        if(closestTarget) {
            return closestTarget;
        }
        return false;
    }

    moveToClosestTarget() {
        let settings = getSettings();
        if(this.retreatingToHeal)
            return;
        this.retreating = false;
        this.retreatingToHeal = false;
        console.log(this.id, "ct:", this.currentLocation, this.validTargets.length)
        let closestTarget:FakeGameObject|false = this.getClosestTargetToOurFlag();
        if(!closestTarget) {
            closestTarget = this.getClosestTarget();
        }
        console.log(this.id, 'moving to closest target', closestTarget ? closestTarget.constructor.name : false);
        if(closestTarget) {
            if(this.lastTarget instanceof Flag && this.currentLocation.x == this.lastTarget.x && this.currentLocation.y == this.lastTarget.y) {
                this.moveCurrentPositionToAMember();
            }
            this.lastTarget = closestTarget;
            let targetIsBodyPart = closestTarget instanceof BodyPart;
            //@ts-ignore
            let enemiesByFlag = getObjectsByPrototype(Creep).filter(c=>!c.my&&getRange(c, closestTarget)<10)
            let targetIsValidFlag = closestTarget instanceof Flag && (!closestTarget.my || (settings.getTick() < 10));
            if(targetIsBodyPart) {
                this.moveCurrentPositionToAMember();
            }
            this.assignLocation(closestTarget.x, closestTarget.y, (targetIsBodyPart || targetIsValidFlag) ? 0 : 1);
        }
    }

    assignLocation(x:number,y:number, targetDistance=0, regroup=false, rushTarget=false) {
        if(this.lastTarget && (this.lastTarget.x != x || this.lastTarget.y != y)) {
            this.lastTarget = false;
        }

        this.path = false;//clear out the path
        this.currentPathIndex = 0;

        this.targetLocation.x = x;
        this.targetLocation.y = y;
        this.targetDistance = targetDistance;
        this.targetRush = rushTarget;
        console.log(this.id, "got loc assigned", x, y, targetDistance)
        if((this.currentLocation.x == -1 && this.currentLocation.y == -1) || regroup) {
            //first time we're getting a target location, set our current location there as well.
            this.currentLocation.x = x;
            this.currentLocation.y = y;
        }
    }
    assignTarget(target:FakeGameObject, doNow:boolean = false) {
        if(this.validTargets.includes(target)) {
            //target already there, remove it.
            this.validTargets = this.validTargets.filter((t)=>t.id != target.id);
        }
        if(this.validTargets.length < 100 && !this.validTargets.includes(target)) {
            this.validTargets.push(target);
            //return true;
        }
        if(doNow) {
            this.lastTarget = target;
            this.assignLocation(target.x, target.y, 0)
        }
        return false;
    }
    assignCreep(creep:Creep) {
        let curentHealParts = this.creeps.reduce<number>((acc, creep) => acc + creep.body.filter((part)=>part.type == HEAL).length, 0);
        let curentAttackParts = this.creeps.reduce<number>((acc, creep) => acc + creep.body.filter((part)=>part.type == ATTACK).length, 0);
        let curentRangedParts = this.creeps.reduce<number>((acc, creep) => acc + creep.body.filter((part)=>part.type == RANGED_ATTACK).length, 0);

        let numHealParts = creep.body.filter((part)=>part.type == HEAL).length;
        let numAttackParts = creep.body.filter((part)=>part.type == ATTACK).length;
        let numRangedParts = creep.body.filter((part)=>part.type == RANGED_ATTACK).length;

        //console.log("checking creep", creep.id, "for squad", this.id);
        //console.log(this.requirements, "creep has", numHealParts, numAttackParts, numRangedParts, "vars", curentHealParts, curentAttackParts, curentRangedParts)
        //we need heal parts, they got em?
        if(curentHealParts < this.requirements.heal && numHealParts > 0) {
            this.addCreep(creep);
            return true;
        }

        //we need attack parts, they got em?
        if(curentAttackParts < this.requirements.attack && numAttackParts > 0) {
            this.addCreep(creep);
            return true;
        }

        //we need ranged parts, they got em?
        if(curentRangedParts < this.requirements.ranged && numRangedParts > 0) {
            this.addCreep(creep);
            return true;
        }
        return false;
    }

    clearDeadCreeps() {
        let haveDeadCreeps = false;
        for(let creep of this.creeps) {
            if(!creep.exists) {
                haveDeadCreeps = true;
                break;
            }
        }
        if(haveDeadCreeps) {
            this.reparseCreeps();
        }

    }

    clearInvalidTargets() {
        //clear out gone targets
        let invalidTargets:FakeGameObject[] = [];
        for(let target of this.validTargets) {
            if (!target.exists) {
                invalidTargets.push(target);
            }
        }
        if(invalidTargets.length) {

            this.path = false;//clear out the path
            this.currentPathIndex = 0;

            //console.log("clearing invalid targets:", invalidTargets.length, "before len:", this.validTargets.length)
            //console.log(this.validTargets.filter((t) => !invalidTargets.includes(t)));
            this.validTargets = this.validTargets.filter((t) => !invalidTargets.includes(t));
            //console.log("after len:", this.validTargets.length);
            this.reparseCreeps();
            console.log("moving to closest target, was an invalid target")
            this.moveToClosestTarget();
        }
    }

    runSquad(minDistToEnemyFlag = 0, maxDistFromOurFlag = 200, noCombatMovement = false, otherSquads:Squad[] = []) {

        if(this.lastTarget instanceof BodyPart && !this.lastTarget.exists) {
            //body part gone, repath to closest
            this.moveToClosestTarget();
        }
        console.log(this.id, "running squad", minDistToEnemyFlag, maxDistFromOurFlag, noCombatMovement, this.retreating)
        console.log(this.id, "path info", this.path && this.path.length, this.currentPathIndex)
        if (this.creeps.length == 0)
            return; //no creeps, just sleep

        if(this.retreating) {
            //noCombatMovement = true;
        }
        if(this.attackers.length == 0) {
            //we have no attackers, move everything else up
            this.maxFormationSize_attackers_max = 0;
            this.maxFormationSize_attackers_min = 0;
            this.maxFormationSize_ranged_max = 1;
            this.maxFormationSize_ranged_min = 0;
            this.maxFormationSize_healers_max = 1;
            this.maxFormationSize_healers_min = 0;
        }
        let settings = getSettings();
        settings.drawText("c", this.currentLocation)
        settings.drawText("g", this.targetLocation)
        this.clearDeadCreeps();
        //this.clearInvalidTargets();
        //handle actions



        let enemyCreeps =  getObjectsByPrototype(Creep).filter(c => !c.my)
        let enemyAttackers = enemyCreeps.filter(c=>c.isAttacker()||c.isRangedAttacker())
        let enemyAttackersActive = enemyAttackers.filter(c=>c.isAttacker(true)||c.isRangedAttacker(true))
        let myCreeps =  getObjectsByPrototype(Creep).filter(c => c.my)
        let secondaryTargets = findInRange(this.currentLocation, enemyCreeps, 7);
        let injuredMembers = findInRange(this.currentLocation, myCreeps.filter(c => c.hits < c.hitsMax), 10).sort((a,b)=>(a.hits/a.hitsMax)-(b.hits/b.hitsMax));

        let mostInjuredEnemy = enemyCreeps.sort((a,b)=>(a.hits/a.hitsMax)-(b.hits/b.hitsMax))
        //let primaryTarget:FakeGameObject|false = mostInjuredEnemy[0];
        let primaryTarget = this.getClosestTarget();
        if(primaryTarget instanceof Flag) {
            primaryTarget = false;
        }
        let ourFlag = getObjectsByPrototype(Flag).filter((f)=> f.my)[0];
        let enemyFlag = getObjectsByPrototype(Flag).filter((f)=> !f.my)[0];

        let closestEnemy:Creep|false = false;
        let closestAttacker:Creep|false = false;
        if(enemyCreeps.length > 0)
            closestEnemy = findClosestByRange(ourFlag, enemyCreeps);
        if(enemyAttackers.length > 0) {
            closestAttacker = findClosestByRange(ourFlag, enemyAttackers);
        }


        let ourClosestCreep = findClosestByRange(ourFlag, this.creeps);
        let enemyDistToOurFlag = 100;
        let distToClosetEnemyToOurFlag = 0;
        let minDistToClosetEnemyToOurFlag = 0;
        if(closestEnemy) {
            enemyDistToOurFlag = getRange(ourFlag, closestEnemy);
            distToClosetEnemyToOurFlag = getRange(this.currentLocation, closestEnemy);
            if(closestAttacker) {
                let ourClosestCreepToTheirLeader = findClosestByRange(closestAttacker, this.creeps);
                if(ourClosestCreepToTheirLeader) {
                    minDistToClosetEnemyToOurFlag = getRange(closestAttacker, ourClosestCreepToTheirLeader)
                }
            }
        }
        let ourDistToFlag = getRange(ourFlag, ourClosestCreep);

        let distToFarthestSquad = 0;
        let farthestSquad:Squad|false = false;
        let leadSquad:Squad|false = false;
        for(let squad of otherSquads) {
            if(squad.leadSquad) {
                leadSquad = squad;
            }
            let distToThisSquad = getRange(this.currentLocation, squad.currentLocation);
            if(distToThisSquad > distToFarthestSquad) {
                distToFarthestSquad = distToThisSquad;
                farthestSquad = squad;
            }
        }
        if(!this.leadSquad && farthestSquad && distToFarthestSquad > distToClosetEnemyToOurFlag - 5) {
            if(leadSquad) {
                this.assignLocation(leadSquad.currentLocation.x, leadSquad.currentLocation.y)
            } else {
                this.assignLocation(farthestSquad.currentLocation.x, farthestSquad.currentLocation.y)
            }

        }

        let wounded = this.creeps.filter(c => c.hits < c.hitsMax * 0.50);
        function getHealTarget(creep:Creep, targets=injuredMembers, range=3) {
            let inRange = findInRange(creep, targets, range);
            if(inRange.length > 0) {
                return inRange[0];
            }
            return false;
        }
        for(let healer of this.healers) {
            let healTarget:Creep|false = false;
            if(healer.hits<healer.hitsMax * .9)
                healTarget = healer;
            if(injuredMembers.length > 0) {

                if(!healTarget)
                    healTarget = getHealTarget(healer, wounded, 1);
                if(!healTarget)
                    healTarget = getHealTarget(healer, injuredMembers.filter(c=>c.isAttacker()),1);
                if(!healTarget)
                    healTarget = getHealTarget(healer, injuredMembers.filter(c=>c.isHealer()),1);
                if(!healTarget)
                    healTarget = getHealTarget(healer, injuredMembers.filter(c=>c.isRangedAttacker()),1);
                if(!healTarget)
                    healTarget = getHealTarget(healer, injuredMembers.filter(c=>c.isAttacker()),2);
                if(!healTarget)
                    healTarget = getHealTarget(healer, injuredMembers.filter(c=>c.isAttacker()),3);
                if(!healTarget)
                    healTarget = getHealTarget(healer, injuredMembers.filter(c=>c.isRangedAttacker()),2);
                if(!healTarget)
                    healTarget = findClosestByRange(healer, injuredMembers);
                // let inRange1 = findInRange(healer, injuredMembers, 1);
                // if(inRange1.length > 0) {
                //     healTarget = inRange1[0];
                // } else {
                //     let inRange2 = findInRange(healer, injuredMembers, 2);
                //     if(inRange2.length > 0) {
                //         healTarget = inRange2[0];
                //     } else {
                //         healTarget = findClosestByRange(healer, injuredMembers);
                //     }
                // }
                // for(let member of injuredMembers) {
                //     if(getRange(healer, member) <= 3) {
                //         healTarget = member;
                //         break;
                //     }
                // }
            }
            if(!healTarget) {
                //if no one is injured, pre-heal closest attack/ranged
                healTarget = findClosestByRange(healer, [...this.attackers, ...this.ranged])
            }

            if(!healTarget) {
                //if no one is injured, pre-heal closest attack/ranged
                healTarget = findClosestByRange(healer, [...this.healers.filter(h=>h.id!=healer.id)])
            }

            if(!healTarget || healTarget.id == healer.id) {
                healer.heal(healer);//heal self, skip other calcs
                healTarget = false;
            }

            if(healTarget) {
                let dist = getRange(healer, healTarget);
                if(dist > 1) {
                    if(dist <= 3)
                        healer.rangedHeal(healTarget);

                } else {
                    healer.heal(healTarget);
                }

                if(!noCombatMovement && !(primaryTarget instanceof BodyPart) && (!healer.isAttacker() && !healer.isRangedAttacker())) {
                    if(findInRange(healer, enemyAttackersActive, 2).length > 0) {
                        let goals:any[] = [];
                        [...enemyAttackersActive].forEach((loc:Location) => {
                            goals.push({
                            pos: loc,
                            range: 4
                            })
                        });
                        let fleePath = searchPath(healer, goals, {flee:true});
                        drawPath(fleePath.path);
                        console.log(this.id, "fleeing", fleePath);
                        if(fleePath.path.length > 0) {
                            //got a flee path, so flee
                            let fleePos = fleePath.path[0];
                            let fleeDir = getDirection(fleePos.x-healer.x, fleePos.y-healer.y);
                            console.log(this.id, "fleeing", fleeDir);
                            healer.smartMove(fleeDir)
                        }
                        //@ts-ignore
                    } else if(healer.hits < healer.hitsMax*0.7) {
                        let closestHealer = findClosestByRange(healer, this.healers.filter(h=>h.hits==h.hitsMax&&!h.isAttacker()&&!h.isRangedAttacker()&&h.id!=healer.id));
                        if(!closestHealer)
                            closestHealer = findClosestByRange(healer, this.healers.filter(h=>!h.isAttacker()&&!h.isRangedAttacker()&&h.id!=healer.id));


                        if(closestHealer) {
                            console.log(healer.id, "running for nearest healer", closestHealer.id);
                            healer.moveTo(closestHealer);
                        }
                        //@ts-ignore
                    } else if((primaryTarget instanceof BodyPart) && [HEAL, MOVE].includes(target.type)) {
                        healer.moveTo(primaryTarget)
                    } else if(!this.retreating && !this.targetRush && this.creepInPosition(healer) && (!healer.isAttacker() && !healer.isRangedAttacker())) {
                        let distFromLoc = getRange(healer, this.currentLocation);
                        let targetDistFromLoc = getRange(healTarget, this.currentLocation);
                        //if(distFromLoc <= this.maxFormationSize_healers_max || targetDistFromLoc <= distFromLoc)
                        if(distFromLoc <= this.maxFormationSize_healers_max || targetDistFromLoc <= this.maxFormationSize_healers_max)
                            healer.moveTo(healTarget);
                        else
                            console.log(healer.id, "isn't moving because of range issues", distFromLoc, targetDistFromLoc)
                    } else {
                        //@ts-ignore
                        console.log(healer.id, "isn't moving, is he doing anything?", primaryTarget.id, secondaryTargets.length)
                    }

                }
            }

        }

        for(let ranged of this.ranged) {
            let target:Creep|StructureTower|false = false;

            if(primaryTarget && getRange(ranged, primaryTarget) <= 3) {
                //@ts-ignore
                target = primaryTarget;
            }

            if(!target) {
                target = findClosestByRange(ranged, secondaryTargets);
            }
            let secondaryTargetsInRange1 = findInRange(ranged, secondaryTargets, 1);
            let secondaryTargetsInRange2 = findInRange(ranged, secondaryTargets, 2);
            let secondaryTargetsInRange3 = findInRange(ranged, secondaryTargets, 3);
            if(target && (secondaryTargetsInRange1.length < 1 && secondaryTargetsInRange2.length < 3 && secondaryTargetsInRange3.length < 10)) {
                //@ts-ignore
                let ret = ranged.rangedAttack(target);
                console.log(ranged.id, "tried to ranged attack", ret);
            } else {
                ranged.rangedMassAttack();
            }
            if(this.creepInPosition(ranged) && target && !noCombatMovement && (!ranged.isAttacker() && !ranged.isHealer())) {
                let targetRange = getRange(ranged, target);
                if(ranged.hits < ranged.hitsMax*0.85) {
                    let closestHealer = findClosestByRange(ranged, this.healers.filter(h=>h.hits==h.hitsMax&&!h.isAttacker()&&!h.isRangedAttacker()));
                    if(!closestHealer)
                        closestHealer = findClosestByRange(ranged, this.healers.filter(h=>!h.isAttacker()&&!h.isRangedAttacker()));

                    if(closestHealer) {
                        console.log(ranged.id, "running for nearest healer", closestHealer.id);
                        ranged.moveTo(closestHealer);
                    }
                    //@ts-ignore
                } else if((target instanceof BodyPart) && [HEAL, RANGED_ATTACK, MOVE].includes(target.type)) {
                    ranged.moveTo(target)
                } else if(targetRange <= 1) {
                    ranged.moveTo(target, {flee:true,range:4})
                } else if(targetRange > 2) {
                    let distFromLoc = getRange(ranged, this.currentLocation);
                    let targetDistFromLoc = getRange(target, this.currentLocation);
                    //if(distFromLoc < this.maxFormationSize_ranged_max || targetDistFromLoc <= distFromLoc)
                    if(distFromLoc < this.maxFormationSize_ranged_max || targetDistFromLoc <= this.maxFormationSize_ranged_max)
                        ranged.moveTo(target);
                } else {
                    //@ts-ignore
                    console.log(ranged.id, "isn't moving, is he doing anything?", primaryTarget.id, secondaryTargets.length)
                }
                //@ts-ignore
            }
        }

        for(let attacker of this.attackers) {
            let target:Creep|StructureTower|false = false;

            if(primaryTarget && getRange(attacker, primaryTarget) <= 1) {
                //@ts-ignore
                target = primaryTarget;
            }

            if(!target) {
                target = findClosestByRange(attacker, secondaryTargets);
            }

            if(target) {
                //@ts-ignore
                let ret = attacker.attack(target);
                console.log(attacker.id, "tried to attack", target.id, "ret:", ret)
            }

            if(this.creepInPosition(attacker) && target && !noCombatMovement) {
                let targetRange = getRange(attacker, target);
                if(attacker.hits < attacker.hitsMax*0.75) {
                    let closestHealer = findClosestByRange(attacker, this.healers.filter(h=>h.hits==h.hitsMax&&!h.isAttacker()&&!h.isRangedAttacker()));
                    if(!closestHealer)
                        closestHealer = findClosestByRange(attacker, this.healers.filter(h=>!h.isAttacker()&&!h.isRangedAttacker()));

                    if(closestHealer) {
                        console.log(attacker.id, "running for nearest healer", closestHealer.id);
                        attacker.moveTo(closestHealer);
                    }
                    //@ts-ignore
                } else if((target instanceof BodyPart) && [ATTACK, MOVE].includes(target.type)) {
                    attacker.moveTo(target)
                } else if(targetRange >= 1) {
                    let distFromLoc = getRange(attacker, this.currentLocation);
                    let targetDistFromLoc = getRange(target, this.currentLocation);
                    //if(distFromLoc < this.maxFormationSize_attackers_max || targetDistFromLoc <= distFromLoc)
                    if(distFromLoc < this.maxFormationSize_attackers_max || targetDistFromLoc <= this.maxFormationSize_attackers_max)
                        attacker.moveTo(target);
                } else {
                    //@ts-ignore
                    console.log(attacker.id, "isn't moving, is he doing anything?", primaryTarget.id, secondaryTargets.length)
                }
            }
        }

        //handle break squad conditions

        if(this.targetLocation.x != ourFlag.x && this.targetLocation.y != ourFlag.y && !this.retreating) {
            let retreatToHeal = false;
            if(wounded.length > 0 && this.inCombat) {
                retreatToHeal = true;
                this.retreatingToHeal = true;
                this.retreating = true;
            }

            //add the distance from us to the "leading" enemy creep, if we have to cross the map, we need to run back sooner
            let enemyDistFromTheirFlag = 0;
            if(closestEnemy)
                enemyDistFromTheirFlag = getRange(closestEnemy, enemyFlag);
            let amtToAdd = Math.min(minDistToClosetEnemyToOurFlag, 10);
            let distToOurFlag = ourDistToFlag;// + amtToAdd;
            console.log(this.id, "checking for too far from our flag", distToOurFlag, maxDistFromOurFlag, wounded.length, retreatToHeal, amtToAdd)
            if(!this.targetRush && (distToOurFlag > maxDistFromOurFlag || retreatToHeal)) {
                console.log(this.id, "too far from our flag", distToOurFlag, maxDistFromOurFlag)
                this.retreatToOurFlag(ourFlag, retreatToHeal, distToOurFlag);
                // if(retreatToHeal) { //go back 10 spaces to heal
                //     let attackPath = searchPath(ourFlag, this.currentLocation);
                //     let indexToGoTo = Math.max(distToOurFlag - 10, 0)
                //     let retreatPos = attackPath.path[indexToGoTo];
                //     this.assignLocation(retreatPos.x, retreatPos.y, 0, true);
                //     this.retreating = true;
                // } else { //run back to the flag to protect it
                //     this.lastTarget = ourFlag;
                //     this.assignLocation(ourFlag.x, ourFlag.y, 1);
                //     //break squad and regroup at flag
                //     this.currentLocation.x = ourFlag.x;
                //     this.currentLocation.y = ourFlag.y;

                //     console.log(this.id, "Running back to the flag!", this.currentLocation)
                // }
                return;
            }
            //check if we're too close to the flag
            let distToEnemyFlag = getRange(this.currentLocation, enemyFlag);
            console.log(this.id, "checking for too close to enemy flag", distToEnemyFlag, minDistToEnemyFlag)
            if(!this.targetRush && distToEnemyFlag < minDistToEnemyFlag) {
                console.log(this.id, "too close to enemy flag", distToEnemyFlag, minDistToEnemyFlag)
                for(let creep of this.creeps) {
                    //let ret = false;
                    //let ret = creep.moveTo(nextPos)
                    //move towards our flag
                    let ret = creep.moveTo(ourFlag);
                    console.log(creep.id, "tried to get behind frontline", "got", ret);
                }
                //this.moveToClosestTarget();
                return;
            }
        } else {
            //we're running back to the flag, check if we're far ahead of the enemy

            if(this.retreatingToHeal && injuredMembers.length == 0) {
                this.retreatingToHeal = false;
                this.retreating = false;
                console.log("moving to closest target, no longer healing")
                this.moveToClosestTarget();
            }

            this.targetDistance = enemyDistToOurFlag;
            if(!this.retreatingToHeal && this.squadInPosition && enemyDistToOurFlag > (ourDistToFlag + 40)) {
                console.log("moving to closest target, we're way closer than the enemy")
                //we're quite a bit closer than them, cancel the flee
                this.moveToClosestTarget();
                this.currentLocation.x = ourClosestCreep.x;
                this.currentLocation.y = ourClosestCreep.y;
                console.log(this.id, "returning to the fight!", this.currentLocation);
            }
        }

        //handle movement


        if(this.inCombat && !this.retreating) {
            console.log(this.id, "holding for combat");
            return;
        }
        console.log(this.id, "moving creeps", this.retreating, this.retreatingToHeal, this.targetRush)
        //if we aren't together, get together
        if(this.retreating && !this.creepsInPosition) {
            console.log('retreating to ', typeof this.lastTarget, ', run for it!!', this.currentLocation)
            for(let creep of this.creeps) {
                creep.moveTo(this.currentLocation)
            }
        } else if(this.targetRush || (this.targetLocation.x == enemyFlag.x && this.targetLocation.y == enemyFlag.y && this.lastTarget instanceof Flag)) {
            console.log('target is ', typeof this.lastTarget, ', run for it!!', this.lastTarget)
            for(let creep of this.creeps) {
                creep.moveTo(this.targetLocation)
            }
        } else if(!this.creepsInPosition) {
            if(this.squadInPosition) {
                console.log(this.id, "in position, even tho creeps aren't moving to next target")
                this.moveToClosestTarget();
            }
            console.log(this.id, "creeps not in position", this.currentLocation, this.targetLocation, this.targetDistance, this.targetRush)
            for(let creep of this.creeps) {
                if(creep.isHealer() && !creep.isRangedAttacker() && !creep.isAttacker()) {
                    let dist = getRange(creep, this.currentLocation);
                    console.log(creep.id, "healer", dist, this.maxFormationSize_ranged_max, this.maxFormationSize_healers_max)
                    if(dist < this.maxFormationSize_healers_min) {
                        let goals:any[] = [];
                        [this.currentLocation, ...this.creeps, ...enemyCreeps].forEach((loc:Location) => {
                            goals.push({
                            pos: loc,
                            range: this.maxFormationSize_healers_max
                            })
                        });
                        let fleePath = searchPath(creep, goals, {flee:true});
                        drawPath(fleePath.path);
                        console.log(creep.id, "got flee path", fleePath.path)
                        if(fleePath.path.length > 0) {
                            //got a flee path, so flee
                            let fleePos = fleePath.path[0];
                            let fleeDir = getDirection(fleePos.x-creep.x, fleePos.y-creep.y);
                            console.log(creep.id, "fleeing to free pos", fleeDir);
                            creep.smartMove(fleeDir)
                        }
                    }
                    if(dist >  this.maxFormationSize_healers_min)
                        creep.moveTo(this.currentLocation, {range:this.maxFormationSize_healers_min});

                } else if(creep.isRangedAttacker() && !creep.isAttacker()) {
                    let dist = getRange(creep, this.currentLocation);
                    console.log(creep.id, "ranged", dist, this.maxFormationSize_attackers_max, this.maxFormationSize_ranged_max)
                    if(dist < this.maxFormationSize_ranged_min) {
                        let goals:any[] = [];
                        [this.currentLocation, ...this.attackers].forEach((loc:Location) => {
                            goals.push({
                            pos: loc,
                            range: this.maxFormationSize_healers_max
                            })
                        });
                        let fleePath = searchPath(creep, goals, {flee:true});
                        drawPath(fleePath.path);
                        console.log(this.id, "got flee path", fleePath)
                        if(fleePath.path.length > 0) {
                            //got a flee path, so flee
                            let fleePos = fleePath.path[0];
                            let fleeDir = getDirection(fleePos.x-creep.x, fleePos.y-creep.y);
                            console.log(this.id, "fleeing to free pos", fleeDir);
                            creep.smartMove(fleeDir)
                        }
                    }
                    if(dist > this.maxFormationSize_ranged_min)
                        creep.moveTo(this.currentLocation, {range:this.maxFormationSize_ranged_min});

                } else {
                    let dist = getRange(creep, this.currentLocation);
                    console.log(creep.id, "attack", dist, this.maxFormationSize_attackers_max, this.maxFormationSize_ranged_max)
                    creep.moveTo(this.currentLocation, {range:this.maxFormationSize_attackers_min});
                }

                //}
            }
            this.path = false;
            this.currentPathIndex = 0;
        } else {
            console.log(this.id, "creeps in position!", this.squadInPosition);






            if(this.squadInPosition && !this.retreating) {
                console.log(this.id, "squad in position!!")
                //we're in position.. auto set position to next target?



                if(this.initialWait && settings.getTick() < 100) {

                    //let enemyCreeps = getObjectsByPrototype(Creep).filter(c=>!c.my);
                    let enemyCreepsNotByTheirFlag = getObjectsByPrototype(Creep).filter(c=> {
                        return !c.my && getRange(c, enemyFlag) > 20;
                    });
                    let enemyClosestToOurFlag = findClosestByRange(ourFlag, enemyCreeps);
                    let enemyDistToFlag = 100;
                    if(enemyClosestToOurFlag) {
                      enemyDistToFlag = getRange(ourFlag, enemyClosestToOurFlag);
                    }

                    console.log(this.id, "waiting to start");
                    let ticksToWait = 100;
                    if(settings.getTick()>=10 && enemyCreepsNotByTheirFlag.length < 2) {
                        console.log(this.id, "They're idle, we're advancing")
                        ticksToWait = 0;//they aren't advancing, let's
                        //this.lastTarget = closestEnemy //prefer closest enemy as target
                    } else if(settings.getTick()<=60 && enemyCreepsNotByTheirFlag.length >= 10) {
                        console.log(this.id, "They're advancing, protect the flag!")
                        ticksToWait = 0;//They're comming full force, fall back to flag
                        this.retreatToOurFlag(ourFlag, false, ourDistToFlag);
                        this.initialWait = false;
                        return;
                    } else if(settings.getTick()>=60 && enemyDistToFlag > 60 && enemyCreepsNotByTheirFlag.length != 0) {
                        console.log(this.id, "kinda in the middle.. fight there")
                        ticksToWait = 0;//they aren't by the flag, but haven't advanced towards me, fight in the middle!
                        this.lastTarget = closestEnemy //prefer closest enemy as target
                    }
                    console.log(this.id, "waiting to start", ticksToWait, enemyDistToFlag, enemyCreepsNotByTheirFlag.length);
                    if(settings.getTick() < ticksToWait) {
                        return;
                    } else {
                        this.initialWait = false;
                    }
                }
                if(!this.retreating) {
                    if(this.validTargets.length > 0) {
                        console.log(this.id, "has reached it's target, moving to next target!");
                        this.moveToClosestTarget();
                    } else {
                        console.log(this.id, "out of targets!");
                        //umm.. go to enemy flag?
                        let enemyFlag = getObjectsByPrototype(Flag).filter((f)=> !f.my)[0];
                        this.lastTarget = enemyFlag;
                        this.assignLocation(enemyFlag.x, enemyFlag.y, 0)
                    }
                } else {
                    //retreat

                }

            } else {

                //if anyone is fatagued, skip
                // for(let creep of this.creeps) {
                //     if(creep.fatigue>0) {
                //         console.log(this.id, "not advancing because of fatigue", creep.id)
                //         return;
                //     }
                // }
                if(this.lastTarget) {
                    console.log("last target exists", this.lastTarget.id)
                    let targetDistFromLastPath = getRange(this.targetLocation, this.lastTarget)
                    console.log("last target exists", this.lastTarget.id, targetDistFromLastPath)
                    if(targetDistFromLastPath > 1) {
                        this.path = false;
                        this.currentPathIndex = 0;
                        console.log("moving to closest target, current target has moved")
                        this.moveToClosestTarget();
                        this.targetLocation.x = this.lastTarget.x;
                        this.targetLocation.y = this.lastTarget.y;
                    }
                }

                if(!this.path) {
                    //console.log(this.id, "repathing")
                    let ret = searchPath(this.currentLocation, this.targetLocation, {range:this.targetDistance, costMatrix:getCM()});
                    //this.lastTarget = false;
                    this.path = ret.path;
                    this.currentPathIndex = 0;
                    console.log(this.id, "got path", ret);
                    drawPath(this.path, "#0000ff");
                }
                //console.log(this.id, "has path", this.path.length, this.currentPathIndex);
                //get next direction to go
                let nextPos = this.path[this.currentPathIndex];
                if(!nextPos) {
                    console.log(this.id, "is broken! no next path");
                    this.currentPathIndex = 0;
                    this.path = false;
                    this.moveToClosestTarget();
                    return;
                }
                let direction = getDirection(nextPos.x-this.currentLocation.x,nextPos.y-this.currentLocation.y);

                //move all creeps in that direction
                console.log(this.id, "moving creeps", direction, this.creeps.length, this.retreating, this.retreatingToHeal)
                for(let creep of this.creeps) {
                    //let thisDirection = getDirection(nextPos.x-creep.x,nextPos.y-creep.y);
                    let thisDirection = direction;
                    //let ret = creep.moveTo(nextPos)
                    //if(!(creep.hits<creep.hitsMax)) {
                        let ret = creep.smartMove(thisDirection);
                    //}
                    //console.log(creep.id, "tried to move", thisDirection, "got", ret)
                }
                // if(this.retreating) {
                //     this.currentPathIndex--;
                // } else {
                    this.currentPathIndex++;
                //}

                //update location
                if(direction == TOP_RIGHT || direction == RIGHT || direction == BOTTOM_RIGHT)
                    this.currentLocation.x++
                if(direction == TOP_LEFT || direction == LEFT || direction == BOTTOM_LEFT)
                    this.currentLocation.x--

                if(direction == TOP_RIGHT || direction == TOP || direction == TOP_LEFT)
                    this.currentLocation.y--
                if(direction == BOTTOM_LEFT || direction == BOTTOM || direction == BOTTOM_RIGHT)
                    this.currentLocation.y++
            }


        }
    }


    private retreatToOurFlag(ourFlag_in: Flag, retreatToHeal: boolean, distToOurFlag: number) {
        console.log("---------------------Retreating!!!------------------", retreatToHeal)
        let ourFlag = getObjectsByPrototype(Flag).filter((f)=> f.my)[0];
        let retreatPath
        if(retreatToHeal) {
            let enemyAttackers = getObjectsByPrototype(Creep).filter(c=>!c.my&&(c.isAttacker(true)||c.isRangedAttacker(true)));
            let goals:any[] = [];
            [...enemyAttackers].forEach((loc:Location) => {
                goals.push({
                pos: loc,
                range: 20
                })
            });
            retreatPath = searchPath(this.currentLocation, goals, {flee:true});
            retreatPath.path.reverse();
            console.log("retreat got path", retreatPath)
        } else {
            retreatPath = searchPath(this.currentLocation, ourFlag, {range:1, costMatrix:getCM()});
        }

        drawPath(retreatPath.path, "#ff0000");
        if (!retreatPath.incomplete && retreatPath.path.length > 4) {
            let howFarToRetreat = Math.min(retreatPath.path.length-1, 0);
            if (!retreatToHeal) {
                if (distToOurFlag < 15) {
                    howFarToRetreat = Math.max(0, retreatPath.path.length - 2);
                } else {
                    howFarToRetreat = Math.max(0, retreatPath.path.length - 2);
                }
            }
            let retreatPos = retreatPath.path[howFarToRetreat];
            if(!retreatPos) {
                console.log('invalid retreat pos for first go, using end pos')
                retreatPos = retreatPath.path[retreatPath.path.length-1]
            }
            console.log(this.id, "retreating!", retreatPos, retreatPath.path.length, howFarToRetreat)

            if(retreatToHeal) {
                this.assignLocation(retreatPos.x, retreatPos.y, 1, false, false)
            } else {
                this.lastTarget = ourFlag;
                this.assignLocation(ourFlag.x, ourFlag.y, 3, true, false);
            }



            this.retreating = true;
        }
    }
}
