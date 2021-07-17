/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('prototype.tower');
 * mod.thing == 'a thing'; // true
 */

var logger = require("screeps.logger");
logger = new logger("prototype.tower");

// create a new function for StructureTower
StructureTower.prototype.defend =
    function () {
        
        var allHostiles = _.filter(this.room.getHostileCreeps(), (c) => !c.byEdge());
        var injuredCreeps = _.filter(allHostiles, (c) => c.hits < c.hitsMax);
        var target = false;
        if (injuredCreeps.length > 0) {
            target = this.pos.findClosestByRange(injuredCreeps);
            if (!this.pos.inRangeTo(target, 30)) {
                target = false;
            }
        } else if (allHostiles.length > 0) {
            target = this.pos.findClosestByRange(allHostiles);
            if (!this.pos.inRangeTo(target, 20)) {
                target = false;
            }
        }
         
        //logger.log(this, closestHostile)
        if(target) {
            this.attack(target);
        } else {
            var closestDamagedStructure=false;
            // if(this.energy > this.energyCapacity * 0.9) {
            //     //return false;
            //     closestDamagedStructure = this.pos.findClosestByRange(FIND_STRUCTURES, {
            //         filter: (structure) => {
            //             return structure.hits < structure.hitsMax
            //                 && (structure.structureType != STRUCTURE_ROAD || structure.hits < 100)
            //                 && (structure.structureType != STRUCTURE_WALL || structure.hits < 50000)
            //                 && (structure.structureType != STRUCTURE_RAMPART || structure.hits < 50000)
                            
                        
            //         }
            //     });
            // }
            
            if(closestDamagedStructure) {
                this.repair(closestDamagedStructure);
            } else  {
                
                var injuredCreeps = this.pos.findInRange(FIND_MY_CREEPS, 20, {filter:function(c) {
                    return c.hits < c.hitsMax;
                }})
                if (injuredCreeps.length > 0 && this.energy > this.energyCapacity * 0.9) {
                    this.heal(injuredCreeps[0]);
                }
            //     var wallLimit = rm.room.controller.level > 3 ? 50000 : 10000;
            //     var closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
            //         filter: (structure) => {
            //             return structure.hits < structure.hitsMax 
            //                 && structure.structureType != STRUCTURE_ROAD 
            //                 && (structure.structureType != STRUCTURE_WALL || structure.hits < wallLimit)
            //                 && structure.structureType != STRUCTURE_RAMPART
                        
            //         }
            //     });
            //     if (closestDamagedStructure) {
            //         tower.repair(closestDamagedStructure);
            //     }
            }
        }
    };