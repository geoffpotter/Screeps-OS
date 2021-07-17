/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('util.market');
 * mod.thing == 'a thing'; // true
 */
var logger = require("screeps.logger");
logger = new logger("util.market");
//logger.enabled = false;
module.exports = {
    
    
    //call once at end of tick
    watchMarket: function() {
        var orders = Game.market.getAllOrders();
        var buySellPrices = {};
        for(var o in orders) {
            var order = orders[o];
            if (!buySellPrices[order.resourceType])
                buySellPrices[order.resourceType] = {buy:[],sell:[]};
            
            buySellPrices[order.resourceType][order.type].push({price:order.price, amount:order.remainingAmount});
        }
        
        
        for(var type in buySellPrices) {
            var prices = buySellPrices[type];
            var maxBuyPrice = _.max(_.map(prices.buy, function(p) {return p.price}));
            var minSellPrice = _.min(_.map(prices.sell, function(p) {return p.price}));
            if (Math.abs(maxBuyPrice) == Infinity)
                maxBuyPrice = 0.3;
            if (Math.abs(minSellPrice) == Infinity) {
                minSellPrice = maxBuyPrice * 4;
            }
            var snipe = false;
            if (maxBuyPrice > minSellPrice)
                snipe = true;
                
            prices.buysAt = maxBuyPrice;
            prices.sellsAt = minSellPrice;
        }
        Memory.marketPrices = buySellPrices;
        
        
        //delete my inactive orders for now(should use this to up the price..)
        var myOrders = Game.market.orders;
        for(var o in myOrders) {
            var order = myOrders[o];
            logger.log('order:', order.resourceType, order.active)
            logger.log("dates: ", order.created, Game.time, Game.time - order.created, (Game.time - order.created) > 10000);
            if (!order.active || ((Game.time - order.created) > 100000)) {
                Game.market.cancelOrder(order.id);
            }
        }
    },
    
    sellMyMinerals:function(roomName, terminalContents) {
        if (!Memory.marketPrices) {
            return;
        }
        terminalContents = _.clone(terminalContents);
        var energyInTerminal = terminalContents[RESOURCE_ENERGY];
        delete terminalContents[RESOURCE_ENERGY];
        var targetsToSell = [];
        for(var type in terminalContents) {
            var amt = terminalContents[type];
            if (amt >= 1000) {
                targetsToSell.push(type)
            }
        }
        if (targetsToSell.length > 0 && energyInTerminal > 10000) {
            var selling = targetsToSell[0];
            var amt = terminalContents[selling];
            amt = Math.min(amt, 20000);
            if (!Memory.marketPrices[selling]) {
                return false;
            }
            var targetPrice = Memory.marketPrices[selling].sellsAt;
            var buyPrice = Memory.marketPrices[selling].buysAt;
            var makeSellOrder = false;
            if (false || targetPrice * 0.9 <= buyPrice || buyPrice >= 1) {
                //just fill buy orders
                //if (buyPrice < 0.8) {
                //    makeSellOrder = true;
                //} else {
                    logger.log(roomName, "fill buy order", amt, selling, "@", buyPrice, "sell price", targetPrice);
                    makeSellOrder = !this.fillBuyOrder(roomName, selling, amt, buyPrice);
                //}
            } else {
                makeSellOrder = true;
            }
            
             if (makeSellOrder) {
                 //make sell order
                 var pr = Math.max(Math.min(buyPrice * 4, targetPrice * 1.2), 0.1)
                 logger.log(roomName, "sell order", amt, selling, "@", pr, "buyers at", buyPrice);
                 this.makeSellOrder(roomName, selling, amt, pr);
             }
            
        }
        //logger.log('roomName', terminalContents.energy)
        //if terminal has less than 50k energy, make a buy order for energy
        if (energyInTerminal < 20000 && Memory.marketPrices[RESOURCE_ENERGY]) {
            var energyBuyPrice = Memory.marketPrices[RESOURCE_ENERGY].buysAt;
            var energySellPrice = Memory.marketPrices[RESOURCE_ENERGY].sellsAt;
            var buyPrice = energySellPrice;
            var res = false;
            if (energyInTerminal < 100 || !(energySellPrice < energyBuyPrice * 1.2)) {
                buyPrice = energyBuyPrice;
                res = this.makeBuyOrder(roomName, RESOURCE_ENERGY, 30000 - energyInTerminal, buyPrice);
                logger.log(roomName, "energy buy order at", buyPrice, res)
            } else {
                
                //buy from a sell order within 20% of buy order price.
                res = this.fillSellOrder(roomName, RESOURCE_ENERGY, 30000 - energyInTerminal, buyPrice);
                logger.log(roomName, "buy energy at", buyPrice, res)
            
                
                
            }
            
            //this.makeBuyOrder(roomName, RESOURCE_ENERGY, 10000, buyPrice)
        }
        // _.each(Game.market.orders, function(o) {
        //     //if (o.resourceType == RESOURCE_ENERGY) {
        //         Game.market.cancelOrder(o.id);
        //     //}
        // })
    },
    
    fillBuyOrder: function(roomName, resource, amt, targetPrice) {
        var maxTransferEnergyCost = amt;
        var orders = Game.market.getAllOrders({type: ORDER_BUY, resourceType: resource});
        orders = _.sortBy(orders, [function(o) { return o.price; }]).reverse();
        for(let i=0; i<orders.length; i++) {
            const transferEnergyCost = Game.market.calcTransactionCost(
                Math.min(amt, orders[i].amount), roomName, orders[i].roomName);
            logger.log("fillBuyOrder--------------------------------------------- amt:", amt, "price", orders[i].price, "my price", targetPrice)
            logger.log(orders[i].amount * orders[i].price, 'creds', transferEnergyCost, "cost", maxTransferEnergyCost, 'max cost', orders[i].price >= targetPrice, "price ok")
            if(transferEnergyCost < maxTransferEnergyCost && orders[i].price >= targetPrice) {
                
                logger.log(roomName, "selling off", amt, "of", resource, "for", orders[i].price)
                var ret = Game.market.deal(orders[i].id, amt, roomName);
                logger.log("-----", ret)
                var numTries = 20;
                while (ret == -6 && numTries > 0) {
                    //not enough energy, reduce amt and try again till it works
                    amt *= 0.8;
                    if (numTries < 4)
                        amt *= 0.1
                    amt = Math.max(Math.floor(amt), 1);
                    logger.log("costs too much energy, trying again with:", amt)
                    ret = Game.market.deal(orders[i].id, amt, roomName);
                    numTries--;
                }
                return true;
                break;
            }
        }
        return false;
    },
    
    fillSellOrder: function(roomName, resource, amt, targetPrice) {
        var maxTransferEnergyCost = amt;
        var orders = Game.market.getAllOrders({type: ORDER_SELL, resourceType: resource});
        orders = _.sortBy(orders, [function(o) { return o.price; }]).reverse();
        console.log("all orders", JSON.stringify(orders))
        for(let i=0; i<orders.length; i++) {
            const transferEnergyCost = Game.market.calcTransactionCost(
                Math.min(amt, orders[i].amount), roomName, orders[i].roomName);
            logger.log("fillSellOrder--------------------------------------------- amt:", amt, "price", orders[i].price, "my price", targetPrice)
            logger.log(orders[i].amount * orders[i].price, 'creds', transferEnergyCost, "cost", maxTransferEnergyCost, 'max cost', orders[i].price >= targetPrice, "price ok")
            if(transferEnergyCost < maxTransferEnergyCost && orders[i].price >= targetPrice) {
                
                logger.log(roomName, "buying from sell order", amt, "of", resource, "for", orders[i].price)
                var ret = Game.market.deal(orders[i].id, amt, roomName);
                logger.log("-----", ret)
                var numTries = 20;
                while (ret == -6 && numTries > 0) {
                    //not enough energy, reduce amt and try again till it works
                    amt *= 0.8;
                    if (numTries < 4)
                        amt *= 0.1
                    amt = Math.max(Math.floor(amt), 1);
                    logger.log("costs too much energy, trying again with:", amt)
                    ret = Game.market.deal(orders[i].id, amt, roomName);
                    numTries--;
                }
                return true;
                break;
            }
        }
        return false;
    },
    
    makeBuyOrder: function(roomName, resource, amt, targetPrice) {
        amt = Math.min(amt, 100000);
        if (!this.haveBuyOrder(resource, roomName)) {
            logger.log(roomName, "making buy order for", amt, "of", resource, "for", targetPrice)
            return Game.market.createOrder(ORDER_BUY, resource, targetPrice, amt, roomName);
        }
        return false;
    },
    
    makeSellOrder: function(roomName, resource, amt, targetPrice) {
        amt = Math.min(amt, 100000);
        if (!this.haveSellOrder(resource, roomName)) {
            logger.log(roomName, "making sell order for", amt, "of", resource, "for", targetPrice)
            return Game.market.createOrder(ORDER_SELL, resource, targetPrice, amt, roomName);
        }
        return false;
    },
    
    haveSellOrder: function(resource, roomName) {
        var myOrders = Game.market.orders;
        for(var i in myOrders) {
            if (myOrders[i].resourceType == resource && myOrders[i].type == ORDER_SELL && myOrders[i].roomName == roomName) {
                return true;
            }
        }
        return false;
    },
    haveBuyOrder: function(resource, roomName) {
        var myOrders = Game.market.orders;
        for(var i in myOrders) {
            if (myOrders[i].resourceType == resource && myOrders[i].type == ORDER_BUY && myOrders[i].roomName == roomName) {
                return true;
            }
        }
        return false;
    }
    
};