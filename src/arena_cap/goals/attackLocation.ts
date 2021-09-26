
import { BodyPart, Flag } from "arena/prototypes";
import { getCM, Squad } from "arena_cap/squad";
import { searchPath } from "game/path-finder";
import {
  Creep, StructureTower,
} from 'game/prototypes';
import { findClosestByPath, findClosestByRange, findPath, getObjectsByPrototype, getRange } from "game/utils";
//@ts-ignore
import { text } from "game/visual";
import { FakeGameObject, getSettings } from "shared/utils/settings";
import { BaseGoal, Goal, idType } from "shared/subsystems/planning/goal";
import { winCTF } from "./winCTF";
let attackPath;


export class attackLocation extends BaseGoal implements Goal {

  static type = "attackLocation";
  x: number;
  y: number;
  squadL: Squad;
  squadR: Squad;
  squadF: Squad;

  static makeId(x:number, y:number) {
    return `${attackLocation.type}-${x}-${y}`
  }



  constructor(id: idType, parent: winCTF, x:number, y:number) {
    super(id, parent);
    this.x = x;
    this.y = y;
    //parent.defenseGoals[0];
    //make squads
    this.squadL = new Squad("left", {heal: 0, attack:0, ranged:0});
    this.squadR = new Squad("right", {heal: 0, attack:0, ranged:0});
    this.squadF = new Squad("forward", {heal: 20, attack:8, ranged:20});
    // this.squadL = new Squad("left", {heal: 8, attack:0, ranged:8});
    // this.squadR = new Squad("right", {heal: 8, attack:0, ranged:8});
    // this.squadF = new Squad("forward", {heal: 4, attack:8, ranged:4});
    // this.squadL = new Squad("left", {heal: 4, attack:4, ranged:0});
    // this.squadR = new Squad("right", {heal: 4, attack:4, ranged:0});
    // this.squadF = new Squad("forward", {heal: 12, attack:0, ranged:20});
    this.squadF.leadSquad = true;


    //set squad start locations

    //this.squadF.assignLocation(65, 35, 20);
    //this.squadL.assignLocation(65, 35);
    //this.squadR.assignLocation(35, 65);

    let ourFlag = getObjectsByPrototype(Flag).filter((f)=> f.my)[0];
    attackPath = searchPath(ourFlag, this, {costMatrix:getCM()});
    let startPos = attackPath.path[Math.floor(attackPath.path.length/3)];
    this.squadF.assignLocation(startPos.x, startPos.y)
  }

  assignCreep(creep:Creep) {
    //console.log(this.id, "checking creep", creep.id)
    if(this.squadF.assignCreep(creep)) {
      creep.goalId = this.id;
      if(this.squadF.creeps.length == 1) {
        //set pos to first creep's location
        //this.squadF.assignLocation(creep.x, creep.y);
      }
      return true;
    }
    if(this.squadL.assignCreep(creep)) {
      creep.goalId = this.id;
      if(this.squadL.creeps.length == 1) {
        //set pos to first creep's location
        this.squadL.assignLocation(creep.x, creep.y);
      }
      return true;
    }
    if(this.squadR.assignCreep(creep)) {
      creep.goalId = this.id;
      if(this.squadR.creeps.length == 1) {
        //set pos to first creep's location
        this.squadR.assignLocation(creep.x, creep.y);
      }
      return true;
    }
    return false;
  }
  assignTarget(target: any) {
    let settings = getSettings();

    console.log(this.id, "checking target", target instanceof Creep, target instanceof BodyPart || target instanceof StructureTower || target instanceof Flag, target.constructor.name)
    if(target instanceof Creep) {
      if(this.squadL.assignTarget(target)) {
        target.goalId = this.id;
        return true;
      }
      if(this.squadR.assignTarget(target)) {
        target.goalId = this.id;
        return true;
      }
      if(this.squadF.assignTarget(target)) {
        //@ts-ignore
        target.goalId = this.id;
        return true;
      }
      return false;
    }

    if(target instanceof BodyPart || target instanceof StructureTower || target instanceof Flag) {
      let myCreeps = getObjectsByPrototype(Creep).filter(c=>c.my && (c.isRangedAttacker() || c.isAttacker()));
      let enemyCreeps = getObjectsByPrototype(Creep).filter(c=>!c.my && (c.isRangedAttacker() || c.isAttacker()));

      let overPowered = myCreeps.length >= enemyCreeps.length * 2;
      let underPowered = myCreeps.length *2 <= enemyCreeps.length;
      let closestCreep = findClosestByRange(target, myCreeps);
      let closestEnemy = findClosestByRange(target, myCreeps);

      let dist = 0;
      if(closestCreep)
        dist = getRange(target, closestCreep);
      let enemyDist = 100;
      if(closestEnemy)
        enemyDist = getRange(target, closestEnemy);
      let overPartCollectTime = settings.getTick() > 1700;
      if(dist > enemyDist * 0.8 && !overPowered && enemyDist < 20 && !overPartCollectTime) {
        return false;
      }
      let accepted = false;
      if(!(this.squadF.lastTarget instanceof BodyPart))
        accepted = this.squadF.assignTarget(target, dist < 20)
      if(!(this.squadL.lastTarget instanceof BodyPart))
        accepted = this.squadL.assignTarget(target, dist < 20) || accepted
      if(!(this.squadR.lastTarget instanceof BodyPart))
        accepted = this.squadR.assignTarget(target, dist < 20) || accepted
      if(accepted) {
        //@ts-ignore
        target.goalId = this.id;
        return true;
      }
    }
    //console.log(this.id, "checking creep", creep.id)

    return false;
  }

  /**
   * performs the goals per tick stuff
   */
   runGoal(): void {
    console.log("running goal", this.id)


    let enemyFlag = getObjectsByPrototype(Flag).filter((f)=> !f.my)[0];
    let ourFlag = getObjectsByPrototype(Flag).filter((f)=> f.my)[0];
    let enemyAttackCreeps = getObjectsByPrototype(Creep).filter((c) => !c.my && (c.isRangedAttacker() || c.isAttacker()));
    let enemyAttackCreepsWorking = getObjectsByPrototype(Creep).filter((c) => !c.my && (c.isRangedAttacker(true) || c.isAttacker(true)));
    let enemyClosestToOurFlag = findClosestByPath(ourFlag, enemyAttackCreepsWorking);
    let enemyClosestToTheirFlag = findClosestByRange(enemyFlag, enemyAttackCreepsWorking);
    let enemyDistToFlag = 100;
    let enemyDistToTheirFlag = 100;
    if(enemyClosestToOurFlag) {
      enemyDistToFlag = getRange(ourFlag, enemyClosestToOurFlag);
    }
    if(enemyClosestToTheirFlag) {
      enemyDistToTheirFlag = getRange(enemyFlag, enemyClosestToTheirFlag)
    }


    let fSquadDistToEnemyFlag =  getRange(this.squadF.currentLocation, enemyFlag);
    if(this.squadF.creeps.length == 0) {
      fSquadDistToEnemyFlag = 0;
    }
    let maxDistFromOurFlag;
    if(enemyDistToFlag <= 30) {
      maxDistFromOurFlag = enemyDistToFlag - 15;
    } else if (enemyDistToFlag <= 40) {
      maxDistFromOurFlag = enemyDistToFlag - 5;
    } else if (enemyDistToFlag <= 50) {
      maxDistFromOurFlag = enemyDistToFlag + 10;
    } else if (enemyDistToFlag <= 60) {
      maxDistFromOurFlag = enemyDistToFlag + 15;
    } else {
      maxDistFromOurFlag = enemyDistToFlag + 20;
    }
    //let maxDistFromOurFlag = enemyDistToFlag < 20 ? enemyDistToFlag - 5 : enemyDistToFlag + 10;//Math.max(enemyDistToFlag + 2, 5);
    maxDistFromOurFlag = Math.max(maxDistFromOurFlag, 5);
    let minDistToEnemyFlag = fSquadDistToEnemyFlag + fSquadDistToEnemyFlag==0 ? 0 : 5;
    let minSideDistToEnemyFlag = Math.min(getRange(this.squadL.currentLocation, enemyFlag),getRange(this.squadR.currentLocation, enemyFlag));
    let minFDistToEnemyFlag = minSideDistToEnemyFlag - (minSideDistToEnemyFlag == 0 ? 0 : 5);
    let wereClosestToTheirFlag =  ((enemyDistToTheirFlag) > fSquadDistToEnemyFlag && fSquadDistToEnemyFlag < 40);
    if(enemyAttackCreeps.length < 1 || wereClosestToTheirFlag) {
      minFDistToEnemyFlag = 0;
      minDistToEnemyFlag = 0;
      this.squadF.assignLocation(enemyFlag.x, enemyFlag.y, 0, true, true);
      console.log("running for enemy flag!!!!!!!!!!!!!!!", enemyDistToTheirFlag, fSquadDistToEnemyFlag)

    }
    console.log("max dist info", fSquadDistToEnemyFlag, enemyDistToFlag, enemyClosestToOurFlag)
    console.log('running squads', maxDistFromOurFlag, minDistToEnemyFlag, minSideDistToEnemyFlag, minFDistToEnemyFlag);


    this.squadF.runSquad(0, maxDistFromOurFlag);
    //this.squadF.runSquad(minFDistToEnemyFlag, maxDistFromOurFlag+5);
    this.squadL.runSquad(minDistToEnemyFlag, maxDistFromOurFlag, false, [this.squadF, this.squadR]);
    this.squadR.runSquad(minDistToEnemyFlag, maxDistFromOurFlag, false, [this.squadF, this.squadL]);

    //@ts-ignore
   text("a", this)
  }
}
