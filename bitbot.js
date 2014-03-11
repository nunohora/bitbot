var colors = require('colors'),
    config = require('./config'),
    _ = require('underscore'),
    when = require('promised-io/promise').when,
    all = require('promised-io/promise').all,
    utils = require('./utils'),
    Deferred = require("promised-io/promise").Deferred;

module.exports = {

    canLookForPrices: true,

    totalBalance: {},

    exchangeMarkets: {
        // 'cryptsy': require('./exchanges/cryptsy'),
        'cexio': require('./exchanges/cexio'),
        // 'vircurex': require('./exchanges/vircurex'),
        'btce': require('./exchanges/btce'),
        // 'crypto-trade': require('./exchanges/crypto-trade'),
        'bitfinex': require('./exchanges/bitfinex'),
        'kraken': require('./exchanges/kraken'),
        'coins-e': require('./exchanges/coins-e'),
        'coinex': require('./exchanges/coinex')
    },

	start: function (marketName, tradeAmount) {
        var self = this,
            promises;

        config.market = marketName;
        config.tradeAmount = +tradeAmount;

        promises = _.map(this.getMarketsWithoutOpenOrders(), function (exchange) {
            return exchange.fetchBalance();
        }, this);

        all(promises).then(function () {
            console.log('Total balance of exchanges: '.red);

            self.totalBalance = self.getTotalBalanceInExchanges();
            console.log(self.totalBalance);

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

                var promises = _.map(self.getMarketsWithoutOpenOrders(), function (exchange) {

                    // only use markets that dont have open orders
                    if (!exchange.hasOpenOrders) {
                        return exchange.getExchangeInfo();
                    }

                }, this);

                var group = all(promises).then(function () {
                    console.log('*** Finished Checking Exchange Prices *** '.blue);

                    result = self.calculateArbOpportunity(self.getMarketsWithoutOpenOrders());

                    //escaping the setInterval
                    if (result.length) {
                        arb = self.getBestArb(result);

                        if (arb) {
                            clearInterval(interval);

                            self.makeTrade(arb);
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
      var orderedByProfit = utils.orderByProfit(arrayOfArbs),
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

    checkExchangeForEnoughBalance: function (arb) {
        var ex1 = arb.ex1,
            ex2 = arb.ex2,
            balanceToBuy = this.exchangeMarkets[ex1.name].balances[config.market.split("_")[1].toLowerCase()] || 0,
            balanceToSell = this.exchangeMarkets[ex2.name].balances[config.market.split("_")[0].toLowerCase()] || 0;

        if (balanceToBuy > (ex1.buy * ex1.amount) && balanceToSell > ex2.amount) {
            console.log('Cool! There is enough balance to perform the transaction!'.green);
            return true;
        }
        else {
            console.log("Oh noes! You don't have enough balance to perform this trade. Restarting... :(".red);
            return false;
        }
    },

    makeTrade: function (arb) {
        var self = this,
            ex1 = arb.ex1,
            ex2 = arb.ex2;

        console.log("\007");
        console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@'.green);
        console.log('Buy: '.green, ex1.amount + ' ' + config.market.split("_")[0] + ' for '.green + ex1.buy + ' in '.green + ex1.name);
        console.log('Sell: '.green, ex2.amount + ' ' + config.market.split("_")[0] + ' for '.green + ex2.sell + ' in '.green + ex2.name);
        console.log('Profit: '.green + arb.finalProfit + ' ' + config.market.split("_")[1]);
        console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@'.green);

        var group = all(
            self.exchangeMarkets[ex1.name].createOrder(config.market, 'buy', ex1.buy, ex1.amount),
            self.exchangeMarkets[ex2.name].createOrder(config.market, 'sell', ex2.sell, ex2.amount)
        ).then(function (response) {
            utils.sendMail(JSON.stringify({
                arb: arb,
                totalBalance: self.totalBalance
            }));
            
            if (response[0] && response[1]) {
                self.checkOrderStatuses(ex1.name, ex2.name);
            }
        });
    },

    checkOrderStatuses: function (ex1Name, ex2Name) {
        console.log('checking exchanges statuses');

        this.exchangeMarkets[ex1Name].startOrderCheckLoop();
        this.exchangeMarkets[ex2Name].startOrderCheckLoop();

        this.canLookForPrices = true;

        this.start(config.market, config.tradeAmount);
    },

    calculateArbOpportunity: function (exchanges) {
        var exArray = [],
            arb,
            arrayOfArbs = [],
            keys = _.keys(exchanges);

        //compare all exchanges prices from each exchange with each other
        for (var i = 0, len = keys.length; i < len; i++) {
            var ex1 = exchanges[keys[i]];
            for (var j = 0; j < len; j++) {
                var ex2 = exchanges[keys[j]];
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
        var amountToBuy,
            amountToSell,
            smallestAmountAvailable,
            finalProfit,
            cost,
            profit,
            smallestDecimal,
            hasEnoughVolume;

        smallestAmountAvailable = this.getSmallestAmountAvailable(ex1, ex2, config.tradeAmount);

        smallestDecimal = utils.getSmallestDecimal(ex1, ex2);
        cost = ex1.calculateCost(smallestAmountAvailable, smallestDecimal);
        profit = ex2.calculateProfit(smallestAmountAvailable, smallestDecimal);

        console.log('###########'.green);
        console.log(ex1.exchangeName + ' cost: ' + cost.cost);
        console.log(ex2.exchangeName + ' profit: ' + profit.profit);
        console.log('###########'.green);

        finalProfit = (profit.profit - cost.cost).toFixed(8);

        if (finalProfit > 0) {
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
                if (currency > 0) {
                    if (totalBalances[index]) {
                        totalBalances[index] += currency;
                    }

                    else {
                        totalBalances[index] = currency;
                    }
                }
            }, this);
        }, this);

        return totalBalances;
    },

    getMarketsWithoutOpenOrders: function () {
        return _.filter(this.exchangeMarkets, function (exchange) {
            return !exchange.hasOpenOrder;
        }, this);
    },

    getSmallestAmountAvailable: function (ex1, ex2, maxTradeAmount) {
        var min = Math.min(ex1.prices.buy.quantity, ex2.prices.sell.quantity, maxTradeAmount);

        return min > config.minTradeAmount ? min : config.minTradeAmount;
    }
};