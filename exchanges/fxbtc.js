var colors = require('colors');
var config = require('./../config');
var _ = require('underscore');

var FxBTC = require('../node_modules/fxbtc/fxbtc'),
    fxBTC = new FxBTC(config['fxbtc'].username, config['fxbtc'].password),
    Deferred = require("promised-io/promise").Deferred,
    utils = require('../utils');

module.exports = {

    exchangeName: 'fxbtc',

    balances: {},

    prices: {},

    getBalance: function () {
        var deferred = new Deferred(),
            self = this;

        fxBTC.getInfo(function (err, data) {
            if (!err) {
                _.each(data.info.funds.free, function (balance, index) {
                    self.balances[index.toLowerCase()] = +balance;
                });

                deferred.resolve();
            }
            else {
                deferred.reject(err);
            }
        });

        return deferred.promise;
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
        console.log('Checking prices for '.yellow + this.exchangeName);

        fxBTC.depth({pair: market}, function (err, data) {
            console.timeEnd(self.exchangeName + ' getPrices');
            if (!err) {
                self.prices.buy.price = _.first(data.depth.asks).rate;
                self.prices.buy.quantity = _.first(data.depth.asks).vol;

                self.prices.sell.price = _.first(data.depth.bids).rate;
                self.prices.sell.quantity = _.first(data.depth.bids).vol;

                console.log('Exchange prices for ' + self.exchangeName + ' fetched successfully!');
                deferred.resolve();
            }
            else {
                console.log('Error! Failed to get prices for ' + self.exchangeName);
                deferred.reject(err);
            }

            console.log(self.prices);
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
    }
};