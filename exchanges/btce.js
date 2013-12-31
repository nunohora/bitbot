var config = require('./../config');
var BTCE = require('btce'),
    btceTrade = new BTCE(config.btce.apiKey, config.btce.secret),
    Deferred = require("promised-io/promise").Deferred;

module.exports = {

    exchangeName: 'btce',

    getBalance: function (currency) {
        var deferred = new Deferred();

        console.log('Getting balance at ' + this.exchangeName + 'for ' + currency);

        btceTrade.getInfo(function (err, data) {
            if (!err) {
                deferred.resolve(data.return.funds[currency]);
            }
            else {
                deferred.reject(err);
            }
        });

        return deferred.promise;
    },

    createOrder: function (market, type, rate, amount) {
        var deferred = new Deferred();

        amount = 0;
        
        btceTrade.trade(market, type, rate, amount, function (err, data) {
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
            response = {
                exchangeName: this.exchangeName
            };

        response.buyltcFee = config[this.exchangeName].tradeFee;
        response.buybtcFee = config[this.exchangeName].tradeFee;

        btceTrade.depth({pair: market}, function (err, data) {
            if (!err) {
                var bestPrices = {
                    lowestBuyPrice: {},
                    highestSellPrice: {}
                };

                bestPrices.lowestBuyPrice.price = data.asks[0][0];
                bestPrices.lowestBuyPrice.quantity = data.asks[0][1];
                
                bestPrices.highestSellPrice.price = data.bids[0][0];
                bestPrices.highestSellPrice.quantity = data.bids[0][1];
                
                response.bestPrices = bestPrices;

                deferred.resolve(response);
            }
            else {
                deferred.reject(err);
            }
        });

        return deferred.promise;
    }
};