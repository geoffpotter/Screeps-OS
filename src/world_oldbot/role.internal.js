import miner from "./role.miner";
import minerRocks from "./role.minerRocks";
import filler from "./role.filler";
import alchemist from "./role.alchemist";
import worker from "./role.worker";
import builder from "./role.builder";
import builderWalls from "./role.builderWalls";
import upgrader from "./role.upgrader";
import claimer from "./role.claimer";
import reserver from "./role.reserver";
import transporter from "./role.transporter";
import workerNextRoom from "./role.workerNextRoom";
import transporterNextRoom from "./role.transporterNextRoom";
import minerNextRoom from "./role.minerNextRoom";
import guard from "./role.guard";
import fGuard from "./role.fguard";
import fArcher from "./role.fArcher";
import fHealer from "./role.fHealer";
import fPaladin from "./role.fPaladin";
import fMage from "./role.fMage";

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