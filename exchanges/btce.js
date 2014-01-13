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

    getBalance: function () {
        var deferred = new Deferred(),
            self = this;

        console.log('Getting balances for ' + this.exchangeName);

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
        var deferred = new Deferred();

        console.log('Creating order for ' + amount + ' in ' + this.exchangeName + ' in market ' + market + ' to ' + type + ' at rate ' + rate);

        // amount = 0;

        btceTrade.trade({
            pair: config[this.exchangeName].marketMap[market],
            type: type,
            rate: rate,
            amount: amount
        }, function (err, data) {
            if (!err) {
                console.log('BTCE TRADE');
                console.log(data);
                deferred.resolve(data);
            }
            else {
                deferred.reject(err);
            }
        });
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

        btceTrade.depth({pair: market}, function (err, data) {
            if (!err) {
                var prices = {
                    buy: {},
                    sell: {}
                };

                prices.buy.price = _.first(data.asks)[0];
                prices.buy.quantity = _.first(data.asks)[1];

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