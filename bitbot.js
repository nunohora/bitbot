var config = require('./config'),
    cryptsy = require('./exchanges/cryptsy'),
    btce = require('./exchanges/btce'),
    vircurex = require('./exchanges/vircurex'),
    _ = require('underscore'),
    when = require('promised-io/promise').when;
    all = require('promised-io/promise').all;

module.exports = {

    interval: 5000,

    exchanges: [],

    tradeAmount: 1,

	start: function () {
        console.log("starting bot");

        this.startLookingAtPrices();
	},

    startLookingAtPrices: function () {
        var self = this,
            hasFoundArb = false;
        
        var getExchangesInfo = function () {
            var group = all(
                btce.getExchangeInfo(config.btce.ltcbtcMarket),
                cryptsy.getExchangeInfo(config.cryptsy.ltcbtcMarket),
                vircurex.getExchangeInfo(config.vircurex.ltcbtcMarket)
            ).then(function (array) {
                hasFoundArb = self.calculateArbOpportunity(array);
                
                //escaping the setInterval
                if (hasFoundArb) {
                    self.makeTrade(hasFoundArb);
                    clearInterval(getExchangesInfo);
                    console.log("INTERVAL ESCAPED!!!!");
                }
            });
        };

        setInterval(getExchangesInfo, self.interval);
    },

    calculateArbOpportunity: function (exchanges) {
        var exArray = [],
            viability,
            arbFound = false;

        //compare all exchanges prices from each exchange with each other
        _.each(exchanges, function (ex1) {
            _.some(exchanges, function (ex2) {
                if (ex2.exchangeName !== ex1.exchangeName && !exArray[ex2.exchangeName]) {
                    arbFound = this.calculateViability(ex1, ex2);

                    if (arbFound) {
                        console.log("\007");
                        console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');
                        console.log('Found a candidate!!!');
                        console.log('buy ' + this.tradeAmount + ' ltc for ' + arbFound.ex1.toBuy + ' in ' + arbFound.ex1.name + ' and sell ' + this.tradeAmount + ' ltc for ' + arbFound.ex2.toSell + ' in ' + arbFound.ex2.name);
                        console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');

                    }
                    return arbFound;
                }
            }, this);

            exArray[ex1.exchangeName] = true;
        }, this);

        return arbFound;
    },

    calculateViability: function (ex1, ex2) {
        var isViable = false;

        if (ex1.bestPrices.lowestBuyPrice.price < ex2.bestPrices.highestSellPrice.price) {
            isViable = this.calculateAfterFees(ex1, ex2);
        }
        else if (ex1.bestPrices.highestSellPrice.price > ex2.bestPrices.lowestBuyPrice.price) {
            isViable = this.calculateAfterFees(ex2, ex1);
        }

        return isViable;
    },

    calculateAfterFees: function (ex1, ex2) {
        var amount = this.tradeAmount,
            amountToBuy = (ex1.bestPrices.lowestBuyPrice.price * amount) * (1 - ex1.buyltcFee),
            amountToSell = (ex2.bestPrices.highestSellPrice.price * amount) * (1 - ex2.buybtcFee);

        console.log('toBuy: ', amountToBuy);
        console.log('toSell: ', amountToSell);
        console.log(amountToBuy - amountToSell);
        
        if (amountToBuy - amountToSell > 0) {
            return {
                ex1: {
                    name: ex1.exchangeName,
                    toBuy: ex1.bestPrices.lowestBuyPrice.price
                },
                ex2: {
                    name: ex2.exchangeName,
                    toSell: ex2.bestPrices.highestSellPrice.price
                }
            };
        }
        else {
            return false;
        }
    }
};