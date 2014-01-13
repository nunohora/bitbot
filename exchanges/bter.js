var config = require('./../config');
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

        bter.trade(market, type, rate, amount, function (err, data) {
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

        return utils.calculateProfit(amount, this.prices.sell.price, sellFee.currency, sellFee.percentage);
    },

    calculateCost: function (amount) {
        var buyFee = config[this.exchangeName].fees[config.market].buy;

        return utils.calculateCost(amount, this.prices.buy.price, buyFee.currency, buyFee.percentage);
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

                prices.buy.price = data.asks[0][0];
                prices.buy.quantity = data.asks[0][1];

                prices.sell.price = data.bids[0][0];
                prices.sell.quantity = data.bids[0][1];

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