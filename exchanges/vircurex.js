var config = require('./../config'),
    Deferred = require("promised-io/promise").Deferred,
    all = require("promised-io/promise").all,
    utils = require('../utils'),
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

    balances: {},

    prices: {},

    getBalance: function () {
        var deferred = new Deferred(),
            self = this;

        console.log('Getting balances for ' + this.exchangeName);

        vircurex.getBalances(function (err, data) {
            if (!err) {
                _.each(data.balances, function (balance, index) {
                    self.balances[index.toLowerCase()] = +balance.availablebalance;
                });

                deferred.resolve();
            }
            else {
                deferred.reject(err);
            }
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
    },

    createOrder: function (market, type, rate, amount) {
        var deferred = new Deferred(),
            realMarket =  config[this.exchangeName].marketMap[market],
            self = this,
            currency1,
            currency2;

        currency1 = realMarket.split("_")[0];
        currency2 = realMarket.split("_")[1];

        console.log('Creating order for ' + amount + ' in ' + this.exchangeName + ' in market ' + market + ' to ' + type + ' at rate ' + rate);

        vircurex.createOrder(type, amount, currency1, rate, currency2, function (err, data) {
            if (!err) {
                when(self._releaseOrder(data.orderid)).then(function (response) {
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
            self = this;

        console.log('Checking prices for ' + this.exchangeName);

        base = market.split("_")[0];
        alt = market.split("_")[1];

        // console.log('Getting Market Prices for: ', this.exchangeName);
        vircurex.getOrders(base, alt, function (err, data) {
            if (!err) {
                var prices = {
                    buy: {},
                    sell: {}
                };

                prices.buy.price = _.first(data.asks)[0];
                prices.buy.quantity = _.first(data.asks)[1];

                prices.sell.price = _.first(data.bids)[0];
                prices.sell.quantity = _.first(data.bids)[1];

                self.prices = prices;

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
