var config = require('./../config'),
    _ = require('underscore');

var Bter = require('../bter'),
    bter = new Bter(config['bter'].apiKey, config['bter'].secret),
    Deferred = require("promised-io/promise").Deferred,
    utils = require('../utils');

module.exports = {

    exchangeName: 'bter',

    balances: {},

    prices: {},

    openOrderId: null,

    getBalance: function () {
        var deferred = new Deferred(),
            self = this;

        bter.getInfo(function (err, data) {
            if (!err) {

                _.each(data.available_funds, function (balance, index) {
                    self.balances[index.toLowerCase()] = +balance;
                }, self);

                deferred.resolve();
            }
            else {
                deferred.reject(err);
            }
        });

        return deferred.promise;
    },

    createOrder: function (market, type, rate, amount) {
        var deferred = new Deferred(),
            self = this;

        console.log('Creating order for ' + amount + ' in ' + this.exchangeName + ' in market ' + market + ' to ' + type + ' at rate ' + rate);

        bter.trade({
            pair: market.toLowerCase(),
            type: type,
            rate: rate,
            amount: amount
        }, function (err, data) {
            if (!err && data.msg === 'Success') {

                self.openOrderId = data.order_id;

                console.log('bter order id', self.openOrderId);

                deferred.resolve(true);
            }
            else {
                deferred.reject(err);
            }
        });

        return deferred.promise;
    },

    calculateProfit: function (amount) {
        var sellFee = config[this.exchangeName].fees[config.market].sell;

        return utils.calculateProfit(amount, this.prices.sell.price, sellFee.currency, sellFee.percentage, 6);
    },

    calculateCost: function (amount) {
        var buyFee = config[this.exchangeName].fees[config.market].buy;

        return utils.calculateCost(amount, this.prices.buy.price, buyFee.currency, buyFee.percentage, 6);
    },

    getExchangeInfo: function () {
        var deferred = new Deferred(),
            market = config[this.exchangeName].marketMap[config.market],
            self = this;

        this.prices = {
            buy: {},
            sell : {}
        };

        console.time(this.exchangeName + ' getPrices');
        console.log('Checking prices for ' + this.exchangeName);

        bter.depth({pair: market}, function (err, data) {
            console.timeEnd(self.exchangeName + ' getPrices');

            if (!err) {
                var prices = {
                    buy: {},
                    sell: {}
                };

                self.prices.buy.price = _.last(data.asks)[0];
                self.prices.buy.quantity = _.last(data.asks)[1];

                self.prices.sell.price = _.first(data.bids)[0];
                self.prices.sell.quantity = _.first(data.bids)[1];

                console.log('Exchange prices for ' + self.exchangeName + ' fetched successfully!');
                deferred.resolve();
            }
            else {
                console.log('Error! Failed to get prices for ' + self.exchangeName);
                deferred.reject(err);
            }
        });

        return deferred.promise;
    },

    checkOrderStatus: function () {
        var deferred = new Deferred(),
            self = this;

        if (this.openOrderId) {
            bter.getOrder({
                order_id: self.openOrderId
            }, function (data) {
                console.log('BTER ORDER DATA');
                console.log(data);

                return deferred.resolve(true);
            });
        }
        else {
            return deferred.resolve(true);
        }

        return deferred.promise;
    }
};