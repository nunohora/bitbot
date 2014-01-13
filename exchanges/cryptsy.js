var config = require('./../config');
var cryptsy = require('cryptsy-api');
var utils = require('../utils');
var _ = require('underscore');
var client = new cryptsy(config['cryptsy'].publicKey, config['cryptsy'].privateKey);
var Deferred = require("promised-io/promise").Deferred;

module.exports = {

    exchangeName: 'cryptsy',

    balances: {},

    prices: {},

    getBalance: function () {
        var deferred = new Deferred(),
            self = this;

        console.log('Getting balances for ' + this.exchangeName);

        client.getinfo(function (data) {
            if (!data.error) {
                _.each(data.balances_available, function (balance, index) {
                    self.balances[index.toLowerCase()] = +balance;
                });

                deferred.resolve();
            }
            else {
                deferred.reject(data.error);
            }
        });

        return deferred.promise;
    },

    createOrder: function (market, type, rate, amount) {
        var deferred = new Deferred(),
            marketId = config[this.exchangeName].marketMap[market],
            self = this;

        console.log('Creating order for ' + amount + ' in ' + this.exchangeName + ' in market ' + market + ' to ' + type + ' at rate ' + rate);

        // amount = 0;

        client.createorder(marketId, type, amount, rate, function (data, error) {
            console.log('data: ', data);
            console.log('error: ', error);

            if (!data.error) {
                deferred.resolve(data);
            }
            else {
                deferred.reject(data.error);
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

        console.log('Checking prices for ' + this.exchangeName);

        // console.log('Getting Market Prices for: ', this.exchangeName);
        client.depth(market, function (data) {
            if (!data.error) {
                var prices = {
                    buy: {},
                    sell: {}
                };

                prices.buy.price = _.first(data.sell)[0];
                prices.buy.quantity = _.first(data.sell)[1];

                prices.sell.price = _.first(data.buy)[0];
                prices.sell.quantity = _.first(data.buy)[1];

                console.log('cryptsy');
                console.log('buy: ', _.first(data.sell)[0]);
                console.log('sell: ', prices.sell.price);

                self.prices = prices;
                                
                console.log('Exchange prices for ' + self.exchangeName + ' fetched successfully!');
                deferred.resolve();
            }
            else {
                console.log('Error! Failed to get prices for ' + self.exchangeName);
                deferred.reject(data.error);
            }
        });

        return deferred.promise;
    }
};
