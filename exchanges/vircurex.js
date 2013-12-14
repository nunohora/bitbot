var config = require('./../config'),
    Deferred = require("promised-io/promise").Deferred,
    all = require("promised-io/promise").all,
    _ = require('underscore'),
    Vircurex = require('vircurex'),
	vircurex = new Vircurex(config.vircurex.username, {
		'getBalance': config.vircurex.apiKey,
        'getBalances': config.vircurex.apiKey,
        'createOrder': config.vircurex.apiKey,
        'releaseOrder': config.vircurex.apiKey,
        'deleteOrder': config.vircurex.apiKey,
        'readOrder': config.vircurex.apiKey,
        'readOrders': config.vircurex.apiKey,
        'readOrderExecutions': config.vircurex.apiKey
	});

module.exports = {

    exchangeName: 'vircurex',

    getBalance: function (currency) {
        var deferred = new Deferred();

        vircurex.getBalance(currency, function (err, data) {
            if (!err) {
                deferred.resolve(data.balance);
            }
            else {
                deferred.reject(err);
            }
        });

        return deferred.promise;
    },

    getExchangeInfo: function (market) {
        var deferred = new Deferred(),
            base,
            alt,
            self = this,
            response;

        response = {
            exchangeName: this.exchangeName
        };

        base = market.split("_")[0];
        alt = market.split("_")[1];
        
        response.buyltcFee = config[self.exchangeName].tradeFee;
        response.buybtcFee = config[self.exchangeName].tradeFee;

        // console.log('Getting Market Prices for: ', this.exchangeName);
        vircurex.getOrders(base, alt, function (err, data) {
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
