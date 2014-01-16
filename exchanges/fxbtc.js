var config = require('./../config');
var _ = require('underscore');

var FxBTC = require('../fxbtc'),
    fxBTC = new FxBTC(config['fxbtc'].username, config['fxbtc'].password),
    Deferred = require("promised-io/promise").Deferred,
    utils = require('../utils');

module.exports = {

    exchangeName: 'fxbtc',

    balances: {},

    prices: {},

    getBalance: function () {
        var deferred = new Deferred();

        setTimeout(function () {
            deferred.resolve();

        }, 1000);

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
        console.log('Checking prices for ' + this.exchangeName);

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
    }
};