var colors          = require('colors'),
    _               = require('underscore'),
    Deferred        = require("promised-io/promise").Deferred,
    config          = require('./../config'),
    utils           = require('../utils'),
    CryptoTrade     = require('../crypto-trade');

var cryptoTrade = new CryptoTrade(config['crypto-trade'].apiKey, config['crypto-trade'].secret);

module.exports = {

    exchangeName: 'crypto-trade',

    balances: {},

    prices: {},

    openOrderId: null,

    hasOpenOrder: false,

    getBalance: function (type) {
        var deferred = new Deferred(),
            self = this;

        this.balances = {};

        cryptoTrade.getInfo(function (err, data) {
            if (!err) {
                _.each(data.data.funds, function (balance, index) {
                    self.balances[index.toLowerCase()] = +balance;
                }, self);

                self.hasOpenOrder = false;

                console.log('Balance for '.green + self.exchangeName + ' fetched successfully'.green);
            }
            else {
                console.log('Error when checking balance for '.red + self.exchangeName);
            }

            try { deferred.resolve();} catch (e){}
        });

        setTimeout(function () {
            try { deferred.resolve();} catch (e){}
        }, config.requestTimeouts.balance);

        return deferred.promise;
    },

    createOrder: function (market, type, rate, amount) {
        var deferred = new Deferred(),
            self = this;

        console.log('Creating order for ' + amount + ' in ' + this.exchangeName + ' in market ' + market + ' to ' + type + ' at rate ' + rate);

        // amount = 0;
        
        this.hasOpenOrder = true;

        cryptoTrade.trade({
            pair: market.toLowerCase(),
            type: type.charAt(0).toUpperCase() + type.slice(1),
            rate: rate,
            amount: amount
        }, function (err, data) {
            if (!err) {
                console.log('CryptoTrade create order response: ', data);
                if (data.data.remaining !== '0') {
                    self.openOrderId = data.data.order_id;
                }

                deferred.resolve(data);
            }
            else {
                deferred.reject(err);
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

        cryptoTrade.depth({pair: market}, function (err, data) {
            if (!err && data) {
                self.prices.buy.price = _.first(data.asks)[0];
                self.prices.buy.quantity = _.first(data.asks)[1];

                self.prices.sell.price = _.first(data.bids)[0];
                self.prices.sell.quantity = _.first(data.bids)[1];

                console.log('Exchange prices for ' + self.exchangeName + ' fetched successfully!');
            }

            try {deferred.resolve();} catch (e) {}
        });

        setTimeout(function () {
            try {eferred.resolve();} catch (e){}
        }, config.requestTimeouts.prices);
        return deferred.promise;
    },

    startOrderCheckLoop: function () {
        var self = this,
            interval;

        var checkOrderStatus = function () {
            cryptoTrade.orderInfo({orderid: self.openOrderId}, function (err, data) {
                console.log('CryptoTrade ORDER DATA');
                console.log(data);

                if (!err && (!self.openOrderId || !data.data)) {
                    self.getBalance();

                    clearInterval(interval);
                }
            });
        };

        interval = setInterval(checkOrderStatus, config.interval);
    }
};