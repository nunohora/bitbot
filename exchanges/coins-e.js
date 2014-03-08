var colors      = require('colors'),
    _           = require('underscore'),
    Deferred    = require("promised-io/promise").Deferred,
    config      = require('./../config'),
    Coinse        = require('../coins-e'),
    utils       = require('../utils');

var coinse = new Coinse(config['coins-e'].apiKey, config['coins-e'].secret);

module.exports = {

    exchangeName: 'coins-e',

    balances: {},

    prices: {},

    hasOpenOrder: false,
    
    getBalance: function () {
        var deferred = new Deferred(),
            self = this;

        this.balances = {};
        
        coinse.getInfo(function (err, data) {
            if (!err) {
                _.each(data.wallets, function (balance, index) {
                    self.balances[index.toLowerCase()] = +balance.a;
                }, self);

                self.hasOpenOrder = false;

                console.log('Balance for '.green + self.exchangeName + ' fetched successfully'.green);
            }
            else {
                console.log('Error when checking balance for '.red + self.exchangeName);
            }

            try {deferred.resolve();} catch (e) {}
        });

        setTimeout(function () {
            try { deferred.resolve();} catch (e){}
        }, config.requestTimeouts.balance);

        return deferred.promise;
    },

    createOrder: function (market, type, rate, amount) {
        var deferred = new Deferred();

        console.log('Creating order for ' + amount + ' in ' + this.exchangeName + ' in market ' + market + ' to ' + type + ' at rate ' + rate);

        // amount = 0;

        this.hasOpenOrder = true;

        coinse.trade({
            pair: config[this.exchangeName].marketMap[market],
            order_type: type,
            rate: rate,
            quantity: amount
        }, function (err, data) {
            if (!err && data.success === 1) {
                deferred.resolve(true);
            }
            else {
                deferred.resolve(false);
            }
        });

        return deferred.promise;
    },

    calculateProfit: function (amount, decimals) {
        var sellFee = config[this.exchangeName].fees[config.market].sell;
        return utils.calculateProfit(amount, this.prices.sell.price, sellFee.currency, sellFee.percentage, decimals);
    },

    calculateCost: function (amount, decimals) {
        var buyFee = config[this.exchangeName].fees[config.market].buy;
        return utils.calculateCost(amount, this.prices.buy.price, buyFee.currency, buyFee.percentage, decimals);
    },

    getExchangeInfo: function () {
        var deferred = new Deferred(),
            market = config[this.exchangeName].marketMap[config.market],
            self = this;

        this.prices = {
            buy: {},
            sell : {}
        };

        console.log('Checking prices for '.yellow + this.exchangeName);

        coinse.depth({pair: market}, function (err, data) {
            if (!err) {
                self.prices.buy.price = _.first(data.marketdepth.asks)['r'];
                self.prices.buy.quantity = _.first(data.marketdepth.asks)['q'];

                self.prices.sell.price = _.first(data.marketdepth.bids)['r'];
                self.prices.sell.quantity = _.first(data.marketdepth.bids)['q'];

                console.log('Exchange prices for ' + self.exchangeName + ' fetched successfully!');
            }
            else {
                console.log('Error! Failed to get prices for ' + self.exchangeName);
            }

            try {deferred.resolve();} catch (e) {}
        });

        setTimeout(function () {
            try {deferred.resolve();} catch (e){}
        }, config.requestTimeouts.prices);
        return deferred.promise;
    },

    startOrderCheckLoop: function () {
        var self = this,
            interval;
        
        var checkOrderStatus = function () {
            var market = config[self.exchangeName].marketMap[config.market];

            coinse.activeOrders({
                pair: market,
                filter: 'active'
            }, function (err, data) {
                console.log('COINS-E ORDER DATA: ', data);

                if (!err && data.error === 'no orders') {
                    self.getBalance();
                    
                    clearInterval(interval);
                }
            });
        };

        interval = setInterval(checkOrderStatus, config.interval);
    }
};