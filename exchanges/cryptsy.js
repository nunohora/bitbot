var config = require('./../config');
var cryptsy = require('cryptsy-api');
var client = new cryptsy(config.cryptsy.publicKey, config.cryptsy.privateKey);
var Deferred = require("promised-io/promise").Deferred;

module.exports = {

    exchangeName: 'cryptsy',

    getBalance: function (type) {
        var deferred = new Deferred(),
            currency;

        if (type === 'buy') {
            currency = config.market.split("_")[0];
        }
        else if (type === 'sell') {
            currency = config.market.split("_")[1];
        }

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
            marketId = config[this.exchangeName].marketMap[market];

        amount = 0;
        
        client.createorder(marketId, type, amount, rate, function () {
            if (!data.error) {
                deferred.resolve(data);
            }
            else {
                deferred.reject(data.error);
            }
        });

        return deferred.promise;
    },

    getExchangeInfo: function () {
        var deferred = new Deferred(),
            market = config[this.exchangeName].marketMap[config.market],
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
