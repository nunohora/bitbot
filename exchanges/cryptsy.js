var config = require('./../config');
var cryptsy = require('cryptsy-api');
var _ = require('underscore');
var client = new cryptsy(config['cryptsy'].publicKey, config['cryptsy'].privateKey);
var Deferred = require("promised-io/promise").Deferred;

module.exports = {

    exchangeName: 'cryptsy',

    balances: {},
    
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
        var deferred = new Deferred();
            marketId = config[this.exchangeName].marketMap[market];

        console.log('Creating order for ' + amount + ' in ' + this.exchangeName + ' in market ' + market + ' to ' + type + ' at rate ' + rate);

        // amount = 0;

        client.createorder(marketId, type, amount, rate, function (data) {
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

        console.log('Checking prices for ' + this.exchangeName);

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
                bestPrices.highestSellPrice.quantity = data.buyorders[0].quantity;

                response.bestPrices = bestPrices;

                console.log('Exchange prices for ' + self.exchangeName + ' fetched successfully!');
                deferred.resolve(response);
            }
            else {
                console.log('Error! Failed to get prices for ' + self.exchangeName);
                deferred.reject(data.error);
            }
        });

        return deferred.promise;
    }
};
