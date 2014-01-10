var config = require('./../config');
var CryptoTrade = require('../crypto-trade'),
    cryptoTrade = new CryptoTrade(config['crypto-trade'].apiKey, config['crypto-trade'].secret),
    Deferred = require("promised-io/promise").Deferred;

module.exports = {

    exchangeName: 'crypto-trade',

    getBalance: function (type) {
        var deferred = new Deferred(),
            currency;

        if (type === 'buy') {
            currency = config.market.split("_")[1];
        }
        else if (type === 'sell') {
            currency = config.market.split("_")[0];
        }

        console.log('Getting balance at ' + this.exchangeName + ' for ' + currency);

        cryptoTrade.getInfo(function (err, data) {
            if (!err) {
                console.log("RESPONSE!!!");
                console.log(data);
                deferred.resolve(data.available_funds[currency.toLowerCase()]);
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

        cryptoTrade.trade({
            market: market,
            type: type,
            rate: rate,
            amount: amount
        }, function (err, data) {
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

        cryptoTrade.depth({pair: market}, function (err, data) {
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

                console.log('Exchange prices for ' + self.exchangeName + ' fetched successfully!');
                deferred.resolve(response);
            }
            else {
                console.log('Error! Failed to get prices for ' + self.exchangeName);
                deferred.reject(err);
            }
        });

        return deferred.promise;
    }
};