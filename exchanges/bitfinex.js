var colors      = require('colors'),
    _           = require('underscore'),
    Deferred    = require("promised-io/promise").Deferred,
    config      = require('./../config'),
    Bitfinex    = require('bitfinex'),
    utils       = require('../utils');

var bitfinex = new Bitfinex(config['bitfinex'].apiKey, config['bitfinex'].secret);

module.exports = {

    exchangeName: 'bitfinex',

    balances: {},

    prices: {},

    getBalance: function () {
        var deferred = new Deferred(),
            self = this;

        this.balances = {};
        
        bitfinex.wallet_balances(function (err, data) {
            if (!err) {
                console.log(data.body);
                // _.each(data.body, function (balance, index) {
                //     self.balances[index.toLowerCase()] = +balance;
                // }, self);
                console.log('Balance for '.green + self.exchangeName + ' fetched successfully'.green);
            }
            else {
                console.log('Error when checking balance for '.red + self.exchangeName);
            }

            try {deferred.resolve();} catch (e) {}
        });

        setTimeout(function () {
            try { deferred.resolve();} catch (e){}
        }, config.requestTimeouts.balance);

        return deferred.promise;
    },

    createOrder: function (market, type, rate, amount) {
        var deferred = new Deferred();

        console.log('Creating order for ' + amount + ' in ' + this.exchangeName + ' in market ' + market + ' to ' + type + ' at rate ' + rate);

        bitfinex.trade({
            pair: config[this.exchangeName].marketMap[market],
            type: type,
            rate: rate,
            amount: amount
        }, function (err, data) {
            if (!err && data.success === 1) {
                deferred.resolve(true);
            }
            else {
                deferred.resolve(false);
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

    getExchangeInfo: function () {
        var deferred = new Deferred(),
            market = config[this.exchangeName].marketMap[config.market],
            self = this;

        this.prices = {
            buy: {},
            sell : {}
        };

        console.time(this.exchangeName + ' getPrices');
        console.log('Checking prices for '.yellow + this.exchangeName);

        bitfinex.orderbook(market, function (err, data) {
            console.timeEnd(self.exchangeName + ' getPrices');
            if (!err) {
                data = JSON.parse(data.body);

                self.prices.buy.price = _.first(data.asks).price;
                self.prices.buy.quantity = _.first(data.asks).amount;

                self.prices.sell.price = _.first(data.bids).price;
                self.prices.sell.quantity = _.first(data.bids).amount;

                console.log('Exchange prices for ' + self.exchangeName + ' fetched successfully!');
            }
            else {
                console.log('Error! Failed to get prices for ' + self.exchangeName);
            }

            try {deferred.resolve();} catch (e) {}
        });

        setTimeout(function () {
            try {deferred.resolve();} catch (e){}
        }, config.requestTimeouts.prices);
        return deferred.promise;
    },

    checkOrderStatus: function () {
        var deferred = new Deferred(),
            self = this,
            market = config[this.exchangeName].marketMap[config.market];

        bitfinex.activeOrders({pair: market}, function (err, data) {
            console.log('Bitfinex ORDER DATA: ', data);

            if (!err && data.error === 'no orders') {
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