var colors      = require('colors'),
    _           = require('underscore'),
    Deferred    = require("promised-io/promise").Deferred,
    config      = require('./../config'),
    Cexio        = require('cexio'),
    utils       = require('../utils');

var cexio = Cexio.create(config['cexio'].username, config['cexio'].apiKey, config['cexio'].secret);

module.exports = {

    exchangeName: 'cexio',

    balances: {},

    prices: {},

    hasOpenOrder: false,

    getBalance: function () {
        var deferred = new Deferred(),
            self = this;

        this.balances = {};

        Cexio.balance(function (err, data) {
            if (!err) {
                _.each(data, function (balance, index) {
                    var currency;

                    if (index === 'BTC' || index === 'LTC') {
                        self.balances[index.toLowerCase()] = +balance['available'];
                    }
                }, self);

                self.hasOpenOrder = false;

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

        // amount = 0;

        this.hasOpenOrder = true;

        Cexio.place_order(type, amount, rate, config[this.exchangeName].marketMap[market] , function (err, data) {
            console.log('CEX.IO place order data: ', data);
            if (!err && data && !data.error) {
                deferred.resolve(true);
            }
            else {
                deferred.resolve(false);
            }
        });

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

    getExchangeInfo: function () {
        var deferred = new Deferred(),
            market = config[this.exchangeName].marketMap[config.market],
            self = this;

        this.prices = {
            buy: {},
            sell : {}
        };

        console.log('Checking prices for '.yellow + this.exchangeName);

        Cexio.order_book(market, function (err, data) {
            if (!err) {
                self.prices.buy.price = _.first(data.asks)[0];
                self.prices.buy.quantity = _.first(data.asks)[1];

                self.prices.sell.price = _.first(data.bids)[0];
                self.prices.sell.quantity = _.first(data.bids)[1];

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

    startOrderCheckLoop: function () {
        var self = this,
            interval;

        var checkOrderStatus = function () {
            var deferred = new Deferred(),
                market = config[self.exchangeName].marketMap[config.market];

            Cexio.open_orders(market, function (err, data) {
                console.log('CEX.IO ORDER DATA: ', data);

                if (!err && data.error === 'no orders') {
                    self.getBalance();

                    console.log('order for '.green + self.exchangeName + ' filled successfully!'.green);
                    clearInterval(interval);
                }
                else {
                    console.log('order for '.red + self.exchangeName + ' not filled yet!'.red);
                }
            });
        };

        interval = setInterval(checkOrderStatus, config.interval);
    }
};