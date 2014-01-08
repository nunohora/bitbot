var config = require('./../config'),
    Deferred = require("promised-io/promise").Deferred,
    all = require("promised-io/promise").all,
    when = require('promised-io/promise').when,
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

    createOrder: function (market, type, rate, amount) {
        var deferred = new Deferred(),
            realMarket =  config[this.exchangeName].marketMap[market],
            self = this,
            currency1,
            currency2;

        currency1 = realMarket.split("_")[0];
        currency2 = realMarket.split("_")[1];

        console.log('Creating order for ' + amount + ' in ' + this.exchangeName + 'in market ' + market + ' to ' + type + ' at rate ' + rate);

        amount = 0;

        vircurex.createOrder(type, amount, currency1, rate, currency2, function (err, data) {
            if (!err) {
                when(self._releaseOrder(data)).then(function (response) {
                    deferred.resolve(response);
                });
            }
            else {
                deferred.reject(err);
            }
        });

        return deferred.promise;
    },

    _releaseOrder: function (orderId) {
        var deferred = new Deferred();

        vircurex.releaseOrder(orderId, function (err, data) {
            if (!err) {
                deferred.resolve(data);
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
            base,
            alt,
            self = this,
            response;

        response = {
            exchangeName: this.exchangeName
        };

        console.log('Checking prices for ' + this.exchangeName);

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
