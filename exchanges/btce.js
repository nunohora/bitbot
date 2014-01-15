var config = require('./../config');
var _ = require('underscore');

var BTCE = require('btce'),
    btceTrade = new BTCE(config['btce'].apiKey, config['btce'].secret),
    Deferred = require("promised-io/promise").Deferred,
    utils = require('../utils');

module.exports = {

    exchangeName: 'btce',

    balances: {},

    prices: {},

    openOrderId: null,

    getBalance: function () {
        var deferred = new Deferred(),
            self = this;

        btceTrade.getInfo(function (err, data) {
            if (!err) {
                self.balances = data.return.funds;
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

        btceTrade.trade({
            pair: config[this.exchangeName].marketMap[market],
            type: type,
            rate: rate,
            amount: amount
        }, function (err, data) {
            if (!err && data.success === 1) {

                if (data.return.order_id !== 0) {
                    self.openOrderId = data.return.order_id;
                }

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

        return utils.calculateProfit(amount, this.prices.sell.price, sellFee.currency, sellFee.percentage, 8);
    },

    calculateCost: function (amount) {
        var buyFee = config[this.exchangeName].fees[config.market].buy;

        return utils.calculateCost(amount, this.prices.buy.price, buyFee.currency, buyFee.percentage, 8);
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

        btceTrade.depth({pair: market}, function (err, data) {
            console.timeEnd(self.exchangeName + ' getPrices');
            if (!err) {

                self.prices.buy.price = _.first(data.asks)[0];
                self.prices.buy.quantity = _.first(data.asks)[1];

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
            self = this,
            market = config[this.exchangeName].marketMap[config.market];

        if (this.openOrderId) {
            btceTrade.activeOrders({pair: market}, function (data) {
                console.log('BTCE ORDER DATA');
                console.log(data);

                if (!data) {
                    self.openOrderId = null;

                    return deferred.resolve(true);
                }
                else {
                    return deferred.resolve(false);
                }
            });
        }
        else {
            return deferred.resolve(true);
        }

        return deferred.promise;
    }

};