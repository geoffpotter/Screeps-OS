/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('proto.creep');
 * mod.thing == 'a thing'; // true
 */

Creep.prototype.isHostile = function() {
    var notFriend = this.owner == undefined || 
        (this.owner.username != "RediJedi" 
        && this.owner.username != "Redijedi"
        && this.owner.username != "MrMeseeks"
        && this.owner.username != "Jedislight"
        && this.owner.username != "leonyx");
    //logger.log(this, this.owner, this.owner.username, notFriend)
    return notFriend
        
        
}
