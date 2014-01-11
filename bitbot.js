var config = require('./config'),
    _ = require('underscore'),
    when = require('promised-io/promise').when,
    all = require('promised-io/promise').all,
    Deferred = require("promised-io/promise").Deferred;

module.exports = {

    exchangeMarkets: {
        'cryptsy': require('./exchanges/cryptsy'),
        // 'vircurex': require('./exchanges/vircurex'),
        'btce': require('./exchanges/btce'),
        // 'crypto-trade': require('./exchanges/crypto-trade'),
        'bter': require('./exchanges/bter')
    },

	start: function () {
        var self = this;

        console.log("starting bot");

        all(_.each(self.exchangeMarkets, function (market) {
                market.getBalance();
            }, self)).then(function () {
                self.startLookingAtPrices();
            });
    },

    startLookingAtPrices: function () {
        var self = this,
            hasFoundArb = false,
            interval;

        var getExchangesInfo = function () {
            console.log('*** Checking Exchange Prices for ' + config.market + ' *** ');

            var group = all(_.each(self.exchangeMarkets, function (market) {
                market.getExchangeInfo();
            }, self)).then(function (marketPrices) {

                hasFoundArb = self.calculateArbOpportunity(marketPrices);

                //escaping the setInterval
                if (hasFoundArb) {
                    clearInterval(interval);
                    // self.makeTrade(hasFoundArb);
                    console.log("INTERVAL ESCAPED!!!!");
                }
            });
        };

        interval = setInterval(getExchangesInfo, config.interval);
    },

    makeTrade: function (arb) {
        var ex1 = arb.ex1,
            ex2 = arb.ex2,
            self = this,
            maxAmount = arb.maxAmount;

        when(self.checkBalances(self.exchangeMarkets[ex1.name], self.exchangeMarkets[ex2.name])
            ).then(function (balances) {
                console.log("BALANCES: ", balances);

                if (balances[0] >= (maxAmount * ex1.toBuy) && balances[1] >= maxAmount) {
                    console.log('Cool! There is enough balance to perform the transaction!');

                    self.exchangeMarkets[ex1.name].createOrder(config.market, 'buy', ex1.toBuy, maxAmount);
                    self.exchangeMarkets[ex2.name].createOrder(config.market, 'sell', ex2.toSell, maxAmount);
                }
            });
    },

    checkBalances: function (ex1, ex2) {
        var deferred = new Deferred(),
            group = all(
            ex1.getBalance('buy'),
            ex2.getBalance('sell')
                ).then(function (balances) {
                    deferred.resolve(balances);
                }
            );

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
        var amount = config.tradeAmount,
            maxAmount = amount,
            amountToBuy,
            amountToSell,
            cryptsyFee;

            //so so dirty
            if (ex1.exchangeName === 'cryptsy') {
                cryptsyFee = (amount * ex1.bestPrices.lowestBuyPrice.price)*(ex1.buyltcFee);
                amountToBuy = (amount * ex1.bestPrices.lowestBuyPrice.price) + cryptsyFee;
            }
            else {
                amountToBuy = ((amount + (amount * ex1.buyltcFee)) * ex1.bestPrices.lowestBuyPrice.price).toFixed(8);
            }

            amountToBuy = ((amount + (amount * ex1.buyltcFee))*ex1.bestPrices.lowestBuyPrice.price).toFixed(8);
            amountToSell = ((ex2.bestPrices.highestSellPrice.price * amount).toFixed(8)*+(1 - ex2.buybtcFee)).toFixed(8);

        if (this._isProfitable(amountToSell, amountToBuy) &&
            this._hasLiquidity(ex1.bestPrices.lowestBuyPrice.quantity) &&
            this._hasLiquidity(ex2.bestPrices.highestSellPrice.quantity)) {
                
            console.log("\007");
            console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');
            console.log('Found a candidate!!!');
            console.log('Buying: ', ex1.exchangeName !== 'cryptsy' ? amount : (amount + (amount * ex1.buyltcFee)).toFixed(8) + ' ' + config.market.split("_")[0] + ' for ' + ex1.bestPrices.lowestBuyPrice.price + ' in ' + ex1.exchangeName);
            console.log('Selling: ' + amount + ' ' + config.market.split("_")[0] +' for ' + ex2.bestPrices.highestSellPrice.price + ' in ' + ex2.exchangeName);
            console.log('Profit: ' + (amountToSell - amountToBuy).toFixed(8) + ' ' + config.market.split("_")[1]);
            console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');


            return {
                ex1: {
                    name: ex1.exchangeName,
                    toBuy: ex1.bestPrices.lowestBuyPrice.price,
                    amount: ex1.exchangeName === 'cryptsy' ? amount : (amount + (amount * ex1.buyltcFee)).toFixed(8)
                },
                ex2: {
                    name: ex2.exchangeName,
                    toSell: ex2.bestPrices.highestSellPrice.price,
                    amount: amount
                },
                maxAmount: maxAmount
            };

        }
        else {
            return false;
        }
    },

    _isProfitable: function (amountToSell, amountToBuy) {
        return (amountToSell - amountToBuy) > 0 ? true : false;
    },

    _hasLiquidity: function (quantity) {
        return quantity > config.tradeAmount ? true : false;
    }
};