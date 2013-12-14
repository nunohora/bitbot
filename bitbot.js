var config = require('./config'),
    _ = require('underscore'),
    when = require('promised-io/promise').when,
    all = require('promised-io/promise').all,
    Deferred = require("promised-io/promise").Deferred;

module.exports = {

    market: 'LTC_BTC',

    exchangeMarkets: [
        require('./exchanges/cryptsy'),
        require('./exchanges/vircurex'),
        require('./exchanges/btce'),
    ],

    interval: 5000,

    tradeAmount: 1,

	start: function () {
        console.log("starting bot");
        this.startLookingAtPrices();
	},

    startLookingAtPrices: function () {
        var self = this,
            hasFoundArb = false,
            interval;
        
        var getExchangesInfo = function () {
            var group = all(self._getPromises()).then(function (array) {
                hasFoundArb = self.calculateArbOpportunity(array);

                //escaping the setInterval
                if (hasFoundArb) {
                    // self.makeTrade(hasFoundArb);
                    clearInterval(interval);
                    console.log("INTERVAL ESCAPED!!!!");
                }
            });
        };

        interval = setInterval(getExchangesInfo, self.interval);
    },

    makeTrade: function (ex1, ex2) {},

    checkBalances: function (ex1, ex2) {
        var deferred = new Deferred(),
            group = all(
            ex1.getBalance('ltc'),
            ex2.getBalance('btc')
            ).then(function (array) {
                if (array[0] > this.tradeAmount && array[1] > this.tradeAmount) {
                    deferred.resolve(true);
                }
                else {
                    deferred.resolve(false);
                }
            });

        return deferred.promise;
    },

    calculateArbOpportunity: function (exchanges) {
        var exArray = [],
            viability,
            arbFound = false;

        //compare all exchanges prices from each exchange with each other
        for (var i = 0; i < exchanges.length; i++) {
            var ex1 = exchanges[i];

            for (var j = 0; j < exchanges.length; j++) {
                var ex2 = exchanges[j];

                if (ex2.exchangeName !== ex1.exchangeName && !exArray[ex2.exchangeName]) {
                    arbFound = this.calculateViability(ex1, ex2);

                    if (arbFound) {
                        console.log("\007");
                        console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');
                        console.log('Found a candidate!!!');
                        console.log('buy ' + this.tradeAmount + ' ltc for ' + arbFound.ex1.toBuy + ' in ' + arbFound.ex1.name + ' and sell ' + this.tradeAmount + ' ltc for ' + arbFound.ex2.toSell + ' in ' + arbFound.ex2.name);
                        console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');

                        break;
                    }
                }
            }

            exArray[ex1.exchangeName] = true;
            if (arbFound) {
                break;
            }
        }
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
    },

    _getPromises: function () {
        var promises = [];
        
        _.each(this.exchangeMarkets, function (market) {
            market.getExchangeInfo(config[market.exchangeName].marketMap[this.market]);
        }, this);
    },
};