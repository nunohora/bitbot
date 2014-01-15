var config = require('./config'),
    _ = require('underscore'),
    when = require('promised-io/promise').when,
    all = require('promised-io/promise').all,
    Deferred = require("promised-io/promise").Deferred;

module.exports = {

    canLookForPrices: true,

    exchangeMarkets: {
        'cryptsy': require('./exchanges/cryptsy'),
        'vircurex': require('./exchanges/vircurex'),
        'btce': require('./exchanges/btce'),
        'crypto-trade': require('./exchanges/crypto-trade'),
        'bter': require('./exchanges/bter')
    },

	start: function () {
        var self = this;

        console.log("starting bot");

        all(self.exchangeMarkets['cryptsy'].getBalance(),
            self.exchangeMarkets['vircurex'].getBalance(),
            self.exchangeMarkets['btce'].getBalance(),
            self.exchangeMarkets['crypto-trade'].getBalance(),
            self.exchangeMarkets['bter'].getBalance())
        .then(function () {
            self.startLookingAtPrices();
        });
    },

    startLookingAtPrices: function () {
        var self = this,
            hasFoundArb = false,
            interval;

        var getExchangesInfo = function () {
            if (self.canLookForPrices) {
                self.canRequestPrices = false;

                console.log('*** Checking Exchange Prices for ' + config.market + ' *** ');

                var group = all(self.exchangeMarkets['cryptsy'].getExchangeInfo(),
                    self.exchangeMarkets['vircurex'].getExchangeInfo(),
                    self.exchangeMarkets['btce'].getExchangeInfo(),
                    self.exchangeMarkets['crypto-trade'].getExchangeInfo(),
                    self.exchangeMarkets['bter'].getExchangeInfo())
                .then(function () {
                    hasFoundArb = self.calculateArbOpportunity();

                    //escaping the setInterval
                    if (hasFoundArb) {
                        clearInterval(interval);
                        self.makeTrade(hasFoundArb);
                    }
                    else {
                        self.canRequestPrices = true;
                    }
                });
            }
        };

        interval = setInterval(getExchangesInfo, config.interval);
    },

    makeTrade: function (arb) {
        var self = this,
            ex1 = arb.ex1,
            ex2 = arb.ex2,
            balanceToSell = this.exchangeMarkets[ex2.name].balances[config.market.split("_")[0].toLowerCase()],
            balanceToBuy = this.exchangeMarkets[ex1.name].balances[config.market.split("_")[1].toLowerCase()];

        if (balanceToBuy > (ex1.buy * ex1.amount) && balanceToSell > ex2.amount) {
            console.log('Cool! There is enough balance to perform the transaction!');

            var group = all(
                self.exchangeMarkets[ex1.name].createOrder(config.market, 'buy', ex1.buy, ex1.amount),
                self.exchangeMarkets[ex2.name].createOrder(config.market, 'sell', ex2.sell, ex2.amount)
            ).then(function (response) {
                if (response[0] && response[1]) {
                    self.checkOrderStatuses(ex1.name, ex2.name);
                }
            });
        }
        else {
            console.log("Oh noes! You don't have enough balance to perform this trade :(");
        }
    },

    checkOrderStatuses: function (ex1Name, ex2Name) {
        var self = this,
            interval;

        function checkStatuses() {
            var group = all(self.exchangeMarkets[ex1Name].checkOrderStatus(),
            self.exchangeMarkets[ex2Name].checkOrderStatus()
            ).then(function (response) {
                console.log('check status response');
                console.log(response);
                if (response[0] && response[1]) {
                    console.log('Orders filled successfully!!!');

                    clearInterval(interval);
                }
                else {
                    console.log('Orders not filled yet... :(');
                }
            });
        }

        interval = setInterval(checkStatuses, config.interval);
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

    calculateArbOpportunity: function () {
        var exArray = [],
            viability,
            arbFound = false,
            keys = _.keys(this.exchangeMarkets);

        //compare all exchanges prices from each exchange with each other
        for (var i = 0, len = keys.length; i < len; i++) {
            var ex1 = this.exchangeMarkets[keys[i]];
            for (var j = 0; j < len; j++) {
                var ex2 = this.exchangeMarkets[keys[j]];
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

        if (ex1.prices.buy.price < ex2.prices.sell.price) {
            isViable = this.calculateAfterFees(ex1, ex2);
        }
        else if (ex1.prices.sell.price > ex2.prices.buy.price) {
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

        var cost = ex1.calculateCost(amount);
        var profit = ex2.calculateProfit(amount);

        if ((profit.profit - cost.cost).toFixed(8) > 0) {

            console.log("\007");
            console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');
            console.log('Found a candidate!!!');
            console.log('Buying: ', cost.amount + ' ' + config.market.split("_")[0] + ' for ' + ex1.prices.buy.price + ' in ' + ex1.exchangeName);
            console.log('Selling: ', profit.amount + ' ' + config.market.split("_")[0] + ' for ' + ex2.prices.sell.price + ' in ' + ex2.exchangeName);
            console.log('Profit: ' + (profit.profit - cost.cost).toFixed(8) + ' ' + config.market.split("_")[1]);
            console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');

            return {
                ex1: {
                    name: ex1.exchangeName,
                    buy: ex1.prices.buy.price,
                    amount: cost.amount
                },
                ex2: {
                    name: ex2.exchangeName,
                    sell: ex2.prices.sell.price,
                    amount: profit.amount
                }
            };
        }
        else {
            return false;
        }
    }
};