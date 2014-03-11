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

    hasOpenOrder: false,

    fetchBalance: function () {
        var deferred = new Deferred(),
            self = this;

        this.balances = {};

        bitfinex.wallet_balances(function (err, data) {
            if (!err) {
                _.each(data, function (balance, index) {
                    var currency;

                    if (balance['type'] === 'exchange') {
                        self.balances[balance['currency']] = +balance['amount'];
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
        var deferred = new Deferred(),
            self = this,
            mkt = config[this.exchangeName].marketMap[market];

        console.log('Creating order for ' + amount + ' in ' + this.exchangeName + ' in market ' + market + ' to ' + type + ' at rate ' + rate);

        this.hasOpenOrder = true;

        bitfinex.new_order(mkt, amount, rate, 'all', type, 'exchange limit', function (err, data) {
            console.log('bitfinex orderId:', data['order_id']);

            if (!err && data['order_id']) {
                console.log('BITFINEX ORDER SUCCESSFULL');
                console.log(data);
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

        bitfinex.orderbook(market, function (err, data) {
            if (!err) {
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

    startOrderCheckLoop: function () {
        var self = this,
            interval;

        var checkOrderStatus = function () {
            var deferred = new Deferred(),
                market = config[self.exchangeName].marketMap[config.market];

            bitfinex.active_orders(function (err, data) {
                if (!err && _.isEmpty(data)) {
                    self.fetchBalance();

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