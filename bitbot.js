var colors = require('colors'),
    config = require('./config'),
    _ = require('underscore'),
    when = require('promised-io/promise').when,
    all = require('promised-io/promise').all,
    utils = require('./utils'),
    Deferred = require("promised-io/promise").Deferred;

module.exports = {

    canLookForPrices: true,

    exchangeMarkets: {
        'cryptsy': require('./exchanges/cryptsy'),
        'vircurex': require('./exchanges/vircurex'),
        'btce': require('./exchanges/btce'),
        'bter': require('./exchanges/bter'),
        'crypto-trade': require('./exchanges/crypto-trade'),
        'bitfinex': require('./exchanges/bitfinex')
        // 'kraken': require('./exchanges/kraken')
    },

	start: function (marketName, tradeAmount) {
        var self = this,
            promises;

        config.market = marketName;
        config.tradeAmount = +tradeAmount;

        console.log("starting bot");

        promises = _.map(this.exchangeMarkets, function (exchange) {
            return exchange.getBalance();
        }, this);

        all(promises).then(function () {
            console.log('Total balance of exchanges: '.red, self.getTotalBalanceInExchanges());

            self.startLookingAtPrices();
        });
    },

    startLookingAtPrices: function () {
        var self = this,
            arb,
            interval,
            result;

        var getExchangesInfo = function () {
            if (self.canLookForPrices) {
                self.canLookForPrices = false;

                console.log('*** Checking Exchange Prices for '.blue + config.market + ' *** '.blue);

                var promises = _.map(self.exchangeMarkets, function (exchange) {
                    return exchange.getExchangeInfo();
                }, this);

                var group = all(promises).then(function () {
                    console.log('*** Finished Checking Exchange Prices *** '.blue);

                    result = self.calculateArbOpportunity();

                    //escaping the setInterval
                    if (result.length) {
                        clearInterval(interval);

                        arb = self.getBestArb(result);

                        if (arb) {
                            console.log('curr Arb');
                            console.log(arb);
                            // self.makeTrade(arb);
                        }
                        else {
                            self.canLookForPrices = true;
                        }
                    }
                    else {
                        self.canLookForPrices = true;
                    }
                });
            }
        };

        interval = setInterval(getExchangesInfo, config.interval);
    },

    getBestArb: function (arrayOfArbs) {
      var orderedByProfit = this.orderByProfit(arrayOfArbs),
          bestArb,
          currArb;

      for (var i = 0; i < arrayOfArbs.length; i++) {
        currArb = arrayOfArbs[i];

        if (this.checkExchangeForEnoughBalance(currArb)) {
            return currArb;
        }
      }

      return false;
    },

    orderByProfit: function (arrayOfArbs) {
        return _.sortBy(arrayOfArbs, function (arb) {
            return -(+arb.finalProfit);
        });
    },

    checkExchangeForEnoughBalance: function (arb) {
        var ex1 = arb.ex1,
            ex2 = arb.ex2,
            balanceToBuy = this.exchangeMarkets[ex1.name].balances[config.market.split("_")[1].toLowerCase()] || 0,
            balanceToSell = this.exchangeMarkets[ex2.name].balances[config.market.split("_")[0].toLowerCase()] || 0;

        console.log('&&&&&&&&&&&&&&&'.yellow);
        console.log('Balance to buy: '.yellow, balanceToBuy);
        console.log('Required balance to buy: '.yellow, ex1.buy);
        console.log('Enough balance to buy?: '.yellow, balanceToBuy > (ex1.buy * ex1.amount));
        console.log('Balance to sell: '.yellow, balanceToSell);
        console.log('Required balance to sell: '.yellow, ex2.amount);
        console.log('Enough balance to sell?: '.yellow, balanceToSell > ex2.amount);
        console.log('&&&&&&&&&&&&&&&'.yellow);

        if (balanceToBuy > (ex1.buy * ex1.amount) && balanceToSell > ex2.amount) {
            console.log('Cool! There is enough balance to perform the transaction!');
            return true;
        }
        else {
            console.log("Oh noes! You don't have enough balance to perform this trade. Restarting... :(");
            return false;
        }
    },

    makeTrade: function (arb) {
        console.log(arb);

        var self = this,
            ex1 = arb.ex1,
            ex2 = arb.ex2;

        var group = all(
            self.exchangeMarkets[ex1.name].createOrder(config.market, 'buy', ex1.buy, ex1.amount),
            self.exchangeMarkets[ex2.name].createOrder(config.market, 'sell', ex2.sell, ex2.amount)
        ).then(function (response) {
            if (response[0] && response[1]) {
                self.checkOrderStatuses(ex1.name, ex2.name);
            }
        });
    },

    checkOrderStatuses: function (ex1Name, ex2Name) {
        var self = this,
            interval,
            isCheckingForStatus = false;

        function checkStatuses() {
            if (!isCheckingForStatus) {
                isCheckingForStatus = true;

                var group = all(self.exchangeMarkets[ex1Name].checkOrderStatus(),
                self.exchangeMarkets[ex2Name].checkOrderStatus()
                ).then(function (response) {
                    console.log('check status response: ', response);

                    if (response[0] && response[1]) {
                        console.log('Orders filled successfully!!!'.green);
                        clearInterval(interval);

                        self.canLookForPrices = true;

                        // self.start(config.market, config.tradeAmount);
                    }
                    else {
                        console.log('Orders not filled yet... :('.red);
                    }

                    isCheckingForStatus = false;
                });
            }
        }

        interval = setInterval(checkStatuses, config.interval);
    },

    calculateArbOpportunity: function () {
        var exArray = [],
            arb,
            arrayOfArbs = [],
            keys = _.keys(this.exchangeMarkets);

        //compare all exchanges prices from each exchange with each other
        for (var i = 0, len = keys.length; i < len; i++) {
            var ex1 = this.exchangeMarkets[keys[i]];
            for (var j = 0; j < len; j++) {
                var ex2 = this.exchangeMarkets[keys[j]];
                if (ex2.exchangeName !== ex1.exchangeName && !exArray[ex2.exchangeName]) {
                    arb = this.calculateViability(ex1, ex2);
                    
                    if (arb) {
                        arrayOfArbs.push(arb);
                    }
                }
            }
            exArray[ex1.exchangeName] = true;
        }

        return arrayOfArbs;
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
            amountToBuy,
            amountToSell,
            cryptsyFee,
            finalProfit,
            cost,
            profit;

        cost = ex1.calculateCost(amount);
        profit = ex2.calculateProfit(amount);

        finalProfit = (profit.profit - cost.cost).toFixed(8);

        if (finalProfit > 0) {

            console.log("\007");
            console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@'.green);
            console.log('Buy: '.green, cost.amount + ' ' + config.market.split("_")[0] + ' for '.green + ex1.prices.buy.price + ' in '.green + ex1.exchangeName);
            console.log('Sell: '.green, profit.amount + ' ' + config.market.split("_")[0] + ' for '.green + ex2.prices.sell.price + ' in '.green + ex2.exchangeName);
            console.log('Profit: '.green + (profit.profit - cost.cost).toFixed(8) + ' ' + config.market.split("_")[1]);
            console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@'.green);

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
                },
                finalProfit: finalProfit
            };
        }
        else {
            return false;
        }
    },

    getTotalBalanceInExchanges: function () {
        var totalBalances = {};

        _.each(this.exchangeMarkets, function (exchange) {
            var exchangeBalance = exchange.balances;

            _.each(exchangeBalance, function (currency, index) {
                if (totalBalances[index]) {
                    totalBalances[index] += currency;
                }

                else {
                    totalBalances[index] = currency;
                }
            }, this);
        }, this);

        return totalBalances;
    }
};