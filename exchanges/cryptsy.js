var config = require('./../config');
var cryptsy = require('cryptsy-api');
var client = new cryptsy(config.cryptsy.publicKey, config.cryptsy.privateKey);
var Deferred = require("promised-io/promise").Deferred;

module.exports = {

    exchangeName: 'cryptsy',

    getBalance: function (currency) {
        var deferred = new Deferred();

        client.getinfo(function (data) {
            if (!data.error) {
                deferred.resolve(data.balances_available[currency.toUpperCase()]);
            }
            else {
                deferred.reject(data.error);
            }
        });

        return deferred.promise;
    },

    createOrder: function (market, type, rate, amount) {
        var deferred = new Deferred();
    },

    getExchangeInfo: function (market) {
        var deferred = new Deferred(),
            self = this,
            response = {
                exchangeName: this.exchangeName
            };

        response.buyltcFee = config[self.exchangeName].buyltcFee;
        response.buybtcFee = config[self.exchangeName].buybtcFee;

        // console.log('Getting Market Prices for: ', this.exchangeName);
        client.marketorders(market, function (data) {
            if (!data.error) {

                var bestPrices = {
                    lowestBuyPrice: {},
                    highestSellPrice: {}
                };

                bestPrices.lowestBuyPrice.price = data.sellorders[0].sellprice;
                bestPrices.lowestBuyPrice.quantity = data.sellorders[0].quantity;
                
                bestPrices.highestSellPrice.price = data.buyorders[0].buyprice;
                bestPrices.highestSellPrice.quantity = data.buyorders[0].buyprice;
                
                response.bestPrices = bestPrices;

                deferred.resolve(response);
            }
            else {
                deferred.reject(data.error);
            }
        });

        return deferred.promise;
    }
};
