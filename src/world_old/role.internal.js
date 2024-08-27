let miner = require('./role.miner');
let minerRocks = require('./role.minerRocks');
let filler = require('./role.filler');
let alchemist = require('./role.alchemist');
let worker = require('./role.worker');
let builder = require('./role.builder');
let builderWalls = require('./role.builderWalls');
let upgrader = require('./role.upgrader');
let claimer = require('./role.claimer');
let reserver = require('./role.reserver');
let transporter = require('./role.transporter');
let workerNextRoom = require('./role.workerNextRoom');
let transporterNextRoom = require('./role.transporterNextRoom');
let minerNextRoom = require('./role.minerNextRoom');
let guard = require('./role.guard');
let fGuard = require('./role.fguard');
let fArcher = require('./role.fArcher');
let fHealer = require('./role.fHealer');
let fPaladin = require('./role.fPaladin');
let fMage = require('./role.fMage');

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

module.exports = {
  roleClasses: false,
  getRoleClasses: function() {
    return getRoleClasses();
  },
}
