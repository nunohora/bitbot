var config = require('./../config');
var Bter = require('../bter'),
    bter = new Bter(config['bter'].apiKey, config['bter'].secret),
    Deferred = require("promised-io/promise").Deferred;

module.exports = {

    exchangeName: 'bter',

    balances: {},
    
    latestPrices: {},
    
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

        amount = 0;

        bter.trade(market, type, rate, amount, function (err, data) {
            if (!err) {
                deferred.resolve(data);
            }
            else {
                deferred.reject(err);
            }
        });
    },

    getExchangeInfo: function () {
        var deferred = new Deferred(),
            market = config[this.exchangeName].marketMap[config.market],
            self = this;
            response = {
                exchangeName: this.exchangeName
            };

        console.log('Checking prices for ' + this.exchangeName);

        response.buyltcFee = config[this.exchangeName].tradeFee;
        response.buybtcFee = config[this.exchangeName].tradeFee;

        bter.depth({pair: market}, function (err, data) {
            if (!err) {
                var bestPrices = {
                    lowestBuyPrice: {},
                    highestSellPrice: {}
                };

                bestPrices.lowestBuyPrice.price = data.asks[0][0];
                bestPrices.lowestBuyPrice.quantity = data.asks[0][1];

                bestPrices.highestSellPrice.price = data.bids[0][0];
                bestPrices.highestSellPrice.quantity = data.bids[0][1];

                self.latestPrices = bestPrices;

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