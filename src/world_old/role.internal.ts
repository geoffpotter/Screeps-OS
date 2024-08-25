let miner = import ./role.miner;
let minerRocks = import ./role.minerRocks;
let filler = import ./role.filler;
let alchemist = import ./role.alchemist;
let worker = import ./role.worker;
let builder = import ./role.builder;
let builderWalls = import ./role.builderWalls;
let upgrader = import ./role.upgrader;
let claimer = import ./role.claimer;
let reserver = import ./role.reserver;
let transporter = import ./role.transporter;
let workerNextRoom = import ./role.workerNextRoom;
let transporterNextRoom = import ./role.transporterNextRoom;
let minerNextRoom = import ./role.minerNextRoom;
let guard = import ./role.guard;
let fGuard = import ./role.fguard;
let fArcher = import ./role.fArcher;
let fHealer = import ./role.fHealer;
let fPaladin = import ./role.fPaladin;
let fMage = import ./role.fMage;

var roleClasses = false;

function getRoleClasses() {
  if (!roleClasses) {
    roleClasses = {
      "miner": miner,
      "minerRocks": minerRocks,
      "filler": filler,
      "alchemist": alchemist,
      "worker": worker,
      "builder": builder,
      "builderWalls": builderWalls,
      "upgrader": upgrader,
      "claimer": claimer,
      "reserver": reserver,
      "transporter": transporter,
      "workerNextRoom": workerNextRoom,
      "transporterNextRoom": transporterNextRoom,
      "minerNextRoom": minerNextRoom,
      "guard": guard,
      "fGuard": fGuard,
      "fArcher": fArcher,
      "fHealer": fHealer,
      "fPaladin": fPaladin,
      "fMage": fMage,

    };

    // for(var r in roleClasses) {
    //     global.profiler.registerObject(roleClasses[r], r)
    // }
  }
  return roleClasses;
}

export default {
  roleClasses: false,
  getRoleClasses: function() {
    return getRoleClasses();
  },
}