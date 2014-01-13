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

    getBalance: function () {
        var deferred = new Deferred(),
            self = this;

        console.log('Getting balances for ' + this.exchangeName);

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

        // amount = 0;

        bter.trade({
            pair: market.toLowerCase(),
            type: type,
            rate: rate,
            amount: amount
        }, function (err, data) {
            console.log(self.exchangeName);
            console.log(data);
            if (!err) {
                deferred.resolve(data);
            }
            else {
                deferred.reject(err);
            }
        });
    },

    calculateProfit: function (amount) {
        var sellFee = config[this.exchangeName].fees[config.market].sell;

        return utils.calculateProfit(amount, this.prices.sell.price, sellFee.currency, sellFee.percentage, 4);
    },

    calculateCost: function (amount) {
        var buyFee = config[this.exchangeName].fees[config.market].buy;

        return utils.calculateCost(amount, this.prices.buy.price, buyFee.currency, buyFee.percentage, 4);
    },

    getExchangeInfo: function () {
        var deferred = new Deferred(),
            market = config[this.exchangeName].marketMap[config.market],
            self = this;

        console.log('Checking prices for ' + this.exchangeName);

        bter.depth({pair: market}, function (err, data) {
            if (!err) {
                var prices = {
                    buy: {},
                    sell: {}
                };

                prices.buy.price = _.last(data.asks)[0];
                prices.buy.quantity = _.last(data.asks)[1];

                prices.sell.price = _.first(data.bids)[0];
                prices.sell.quantity = _.first(data.bids)[1];

                self.prices = prices;

                console.log('Exchange prices for ' + self.exchangeName + ' fetched successfully!');
                deferred.resolve();
            }
            else {
                console.log('Error! Failed to get prices for ' + self.exchangeName);
                deferred.reject(err);
            }
        });

        return deferred.promise;
    }
};