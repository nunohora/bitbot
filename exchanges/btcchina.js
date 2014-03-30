var colors      = require('colors'),
    _           = require('underscore'),
    Deferred    = require("promised-io/promise").Deferred,
    config      = require('./../config'),
    BTCChina    = require('btcchina'),
    utils       = require('../utils'),
    events      = require('events'),
    emitter     = new events.EventEmitter();

var btcchina = new BTCChina(config['btcchina'].apiKey, config['btcchina'].secret);

module.exports = {

    exchangeName: 'btcchina',

    balances: {},

    prices: {},

    hasOpenOrder: false,

    initialize: function () {
        _.bindAll(this, 'checkOrderStatus', 'fetchBalance', 'createOrder');
        emitter.on('orderNotMatched', this.checkOrderStatus);
        emitter.on('orderMatched', this.fetchBalance);
        emitter.on('orderCreated', this.checkOrderStatus);
        emitter.on('orderNotCreated', this.createOrder);
    },

    fetchBalance: function () {
        var deferred = new Deferred(),
            self = this;

        this.balances = {};

        btcchina.getAccountInfo(function (err, data) {
            if (!err) {
                _.each(data.result.balance, function (balance, idx) {
                    var amount = balance.amount;

                    self.balances[idx] = +amount;
                });

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
        var mkt = config[this.exchangeName].marketMap[market];

        console.log('Creating order for ' + amount + ' in ' + this.exchangeName + ' in market ' + market + ' to ' + type + ' at rate ' + rate);

        this.hasOpenOrder = true;

        btcchina.createOrder(mkt, type, rate, amount, function (err, data) {
            if (!err && data.success === 1) {
            }
            else {
            }
        });
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

        btcchina.getMarketDepth2(null, market, function (err, data) {
            if (!err) {
                self.populatePrices(data);
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

    checkOrderStatus: _.debounce(function () {
        var deferred = new Deferred(),
            self = this,
            market = config[this.exchangeName].marketMap[config.market];

        btcchina.getOrders(true, function (err, data) {
            console.log('BTCCHINA ORDER DATA: ', data);

            if (!err && _.isEmpty(data.result.orders)) {
                console.log('order for '.green + self.exchangeName + ' filled successfully!'.green);
                _.delay(function () {
                    self.hasOpenOrder = false;
                    emitter.emit('orderMatched');
                }, config.interval);
            }
            else {
                console.log('order for '.red + self.exchangeName + ' not filled yet!'.red);
                emitter.emit('orderNotMatched');
            }
        });
    }, config.interval),

    populatePrices: function (data) {
        data = data.result.market_depth;

        this.prices = {
            buy: {
                price: _.first(data.ask).price,
                quantity: _.first(data.ask).amount
            },
            sell: {
                price: _.first(data.bid).price,
                quantity: _.first(data.bid).amount
            }
        };
    }
};