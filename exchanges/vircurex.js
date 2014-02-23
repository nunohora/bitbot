var colors          = require('colors'),
    config          = require('./../config'),
    Deferred        = require("promised-io/promise").Deferred,
    all             = require("promised-io/promise").all,
    utils           = require('../utils'),
    when            = require('promised-io/promise').when,
    _               = require('underscore'),
    Vircurex        = require('vircurex');

var vircurex = new Vircurex(config.vircurex.username, {
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

        this.balances = {};

        vircurex.getBalances(function (err, data) {
            if (!err) {
                _.each(data.balances, function (balance, index) {
                    self.balances[index.toLowerCase()] = +balance.availablebalance;
                });
                
                console.log('Balance for '.green + self.exchangeName + ' fetched successfully'.green);
            }
            else {
                console.log('Error when checking balance for '.red + self.exchangeName);
            }

            try { deferred.resolve();} catch (e){}
        });

        setTimeout(function () {
            try { deferred.resolve();} catch (e){}
        }, config.requestTimeouts.balance);

        return deferred.promise;
    },

    calculateProfit: function (amount, decimals) {
        var sellFee = config[this.exchangeName].fees[config.market].sell;
        return utils.calculateProfit(amount, this.prices.sell.price, sellFee.currency, sellFee.percentage, decimals);
    },

    calculateCost: function (amount, decimals) {
        var buyFee = config[this.exchangeName].fees[config.market].buy;
        return utils.calculateCost(amount, this.prices.buy.price, buyFee.currency, buyFee.percentage, decimals);
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

        this.orderType = type;

        vircurex.createOrder(type, amount, currency1, rate, currency2, function (err, data) {
            console.log('Vircurex create order data: ');
            console.log('error: ', err);
            console.log('data: ', data);

            if (!err) {
                when(self._releaseOrder(data.orderid)).then(function (response) {
                    console.log('VIRCUREX RELEASE ORDER RESPONSE', response);

                    self.openOrderId = response.orderid;

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
            console.log('Vircurex release order data: ');
            console.log('error: ', err);
            console.log('data: ', data);
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
        var self = this,
            deferred    = new Deferred(),
            market      = config[this.exchangeName].marketMap[config.market],
            base,
            alt;

        this.prices = {
            buy: {},
            sell : {}
        };

        console.log('Checking prices for '.yellow + this.exchangeName);

        base = market.split("_")[0];
        alt = market.split("_")[1];

        vircurex.getOrders(base, alt, function (err, data) {
            if (!err) {
                self.prices.buy.price = _.first(data.asks)[0];
                self.prices.buy.quantity = _.first(data.asks)[1];

                self.prices.sell.price = _.first(data.bids)[0];
                self.prices.sell.quantity = _.first(data.bids)[1];

                console.log('Exchange prices for ' + self.exchangeName + ' fetched successfully!');
            }

            try { deferred.resolve();} catch (e){}
        });

        setTimeout(function () {
            try {deferred.resolve();} catch (e){}
        }, config.requestTimeouts.prices);
        
        return deferred.promise;
    },

    checkOrderStatus: function () {
        var deferred = new Deferred();

        vircurex.readOrders(1, function (err, data) {
            console.log('Vircurex ORDER DATA');
            console.log(data);

            if (!err && data.numberorders === 0) {
                try { deferred.resolve(true);} catch (e){}
            }
            else {
                try { deferred.resolve(false);} catch (e){}
            }
        });

        setTimeout(function () {
            try { deferred.resolve(false);} catch (e){}
        }, config.requestTimeouts.orderStatus);

        return deferred.promise;
    }
};
