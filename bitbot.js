var colors      = require('colors'),
    config      = require('./config'),
    _           = require('underscore'),
    when        = require('promised-io/promise').when,
    all         = require('promised-io/promise').all,
    utils       = require('./utils'),
    Deferred    = require("promised-io/promise").Deferred,
    db          = require('./db'),
    events      = require('events'),
    emitter     = new events.EventEmitter();

module.exports = {

    priceLookupCounter: 0,

    totalBalance: {},

    exchangeMarkets: {
        'cexio'     : require('./exchanges/cexio'),
        'btce'      : require('./exchanges/btce'),
        'bitfinex'  : require('./exchanges/bitfinex'),
        'kraken'    : require('./exchanges/kraken'),
        // 'btcchina'  : require('./exchanges/btcchina'),
        'vircurex': require('./exchanges/vircurex')
    },

    initialize: function (marketName, tradeAmount) {
        config.market = marketName;
        config.tradeAmount = +tradeAmount;

        db.initialize();
        this.bindEvents();
        this.initializeExchanges();

        this.fetchBalances();
    },

    bindEvents: function () {
        _.bindAll(this, 'lookForPrices', 'makeTrade', 'getTotalBalanceInExchanges');

        emitter.on('balancesFetched', this.lookForPrices);
        emitter.on('noArbFound', this.lookForPrices);
        emitter.on('tradeOrderCompleted', this.lookForPrices);
        emitter.on('arbFound', this.makeTrade);
    },

    initializeExchanges: function () {
        _.each(this.exchangeMarkets, function (exchange) {
            exchange.initialize(config.market);
        }, this);
    },

    fetchBalances: function () {
        var self = this;

        promises = _.map(this.getMarketsWithoutOpenOrders(), function (exchange) {
            return exchange.fetchBalance();
        }, this);

        all(promises).then(function () {
            self.totalBalance = self.getTotalBalanceInExchanges();
            console.log('Total balance of exchanges: '.red, self.totalBalance);

            emitter.emit('balancesFetched');
        });
    },

    lookForPrices: _.debounce(function () {
        var self = this;

        var promises = _.map(self.getMarketsWithoutOpenOrders(), function (exchange) {
            return exchange.getExchangeInfo();
        }, this);

        var group = all(promises).then(function () {
            console.log('*** Finished Checking Exchange Prices *** '.blue);

            result = self.calculateArbOpportunity(self.getMarketsWithoutOpenOrders());

            arb = self.getBestArb(result);

            arb ? emitter.emit('arbFound', arb) : emitter.emit('noArbFound');
        });
    }, config.interval),

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

        this.exchangeMarkets[ex1.name].createOrder(config.market, 'buy', ex1.buy, ex1.amount);
        this.exchangeMarkets[ex2.name].createOrder(config.market, 'sell', ex2.sell, ex2.amount);

        db.registerNewTrade({
            market: config.market,
            ex1: {
                name: ex1.name,
                buyPrice: ex1.buy,
                amount: ex1.amount
            },
            ex2: {
                name: ex2.name,
                sellPrice: ex2.sell,
                amount: ex2.amount
            },
            finalProfit: arb.finalProfit,
            when: Date.now()
        });

        emitter.emit('tradeOrderCompleted', arb, this.getTotalBalanceInExchanges());
    },

    getBestArb: function (arrayOfArbs) {
        var orderedByProfit = utils.orderByProfit(arrayOfArbs),
            currArb;

        return _.first(_.filter(orderedByProfit, function (arb) {
            return this.checkExchangeForEnoughBalance(arb);
        }, this));
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

    calculateArbOpportunity: function (exchanges) {
        var arrayOfArbs = [],
            arb;

        _.each(exchanges, function(ex1) {
            _.each(exchanges, function (ex2) {
                if (ex2.exchangeName !== ex1.exchangeName) {
                    arb = this.calculateViability(ex1, ex2);

                    if (arb) {
                        arrayOfArbs.push(arb);
                    }
                }
            }, this);
        }, this);

        return arrayOfArbs;
    },

    calculateViability: function (ex1, ex2) {
        var isViable = false;

        if (ex1.prices.buy.price < ex2.prices.sell.price) {
            isViable = this.calculateAfterFees(ex1, ex2);
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
            hasEnoughVolume,
            isMinimumAmountViable;

        smallestAmountAvailable = this.getSmallestAmountAvailable(ex1, ex2);

        smallestDecimal = utils.getSmallestDecimal(ex1, ex2);
        cost = ex1.calculateCost(smallestAmountAvailable, smallestDecimal);
        profit = ex2.calculateProfit(smallestAmountAvailable, smallestDecimal);


        finalProfit = +(profit.profit - cost.cost).toFixed(8);

        console.log('###########'.green);
        console.log(ex1.exchangeName + ' profit: '.green, profit.profit);
        console.log(ex2.exchangeName + ' cost: '.green, cost.cost);
        console.log('final Profit: ', finalProfit);
        console.log('###########'.green);

        isMinimumAmountViable = this.isMinimumAmountViable(ex1, ex2, smallestAmountAvailable);

        if (finalProfit > 0 && isMinimumAmountViable) {
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

            db.newExchangeBalance(exchange.exchangeName, exchangeBalance);
        }, this);

        db.newTotalBalance(totalBalances);

        return totalBalances;
    },

    getMarketsWithoutOpenOrders: function () {
        return _.filter(this.exchangeMarkets, function (exchange) {
            return !exchange.hasOpenOrder;
        }, this);
    },

    getSmallestAmountAvailable: function (ex1, ex2) {
        var min = Math.min(ex1.prices.buy.quantity, ex2.prices.sell.quantity, config.tradeAmount);

        return min > config.tradeAmount ? config.tradeAmount : min;
    },

    isMinimumAmountViable: function (ex1, ex2, amount) {
        var minEx1 = +(config[ex1.exchangeName].marketMap[config.market].minAmount).toFixed(8),
            minEx2 = +(config[ex2.exchangeName].marketMap[config.market].minAmount).toFixed(8);

        if (amount >= minEx1 && amount >= minEx2) {
            return true;
        }
        else {
            console.log('not enough liquidity in exchanges to match order immediately'.red);
            return false;
        }
    }
};