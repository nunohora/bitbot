var colors      = require('colors'),
    _           = require('underscore'),
    Deferred    = require("promised-io/promise").Deferred,
    config      = require('./../config'),
    BTCChina    = require('btcchina'),
    utils       = require('../utils');

var btcchina = new BTCChina(config['btcchina'].apiKey, config['btcchina'].secret);

module.exports = {

    exchangeName: 'btcchina',

    market: '',

    emitter: {},

    balances: {},

    prices: {},

    hasOpenOrder: false,

    initialize: function (emitter) {
        this.emitter = emitter;
        this.bindEvents();
    },

    bindEvents: function () {
        _.bindAll(this, 'checkOrderStatus', 'fetchBalance', 'createOrder');
        this.emitter.on(this.exchangeName + ':orderNotMatched', this.checkOrderStatus);
        this.emitter.on(this.exchangeName + ':orderMatched', this.fetchBalance);
        this.emitter.on(this.exchangeName + ':orderCreated', this.checkOrderStatus);
        this.emitter.on(this.exchangeName + ':orderNotCreated', this.createOrder);
    },

    setMarket: function (market) {
        this.market = config[this.exchangeName].marketMap[market];
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

                self.emitter.emit('exchangeBalanceFetched', self.exchangeName);

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
        var mkt = this.market.name;

        console.log('Creating order for ' + amount + ' in ' + this.exchangeName + ' in market ' + market + ' to ' + type + ' at rate ' + rate);

        this.hasOpenOrder = true;

        btcchina.createOrder(mkt, type, rate, amount, function (err, data) {
            console.log('btcchina order data: ', data);
            if (!err) {
                self.emitter.emit(self.exchangeName + ':orderCreated');
            }
            else {
                console.log('BTC CHINA ORDER UNSUCCESSFULL '.red, err);
                _.delay(function () {
                    self.emitter.emit(self.exchangeName + ':orderNotCreated', market, type, rate, amount);
                }, config.interval);
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
            market = this.market.name,
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
            market = this.market.name;

        btcchina.getOrders(true, function (err, data) {
            console.log('BTCCHINA ORDER DATA: ', data);

            if (!err && _.isEmpty(data.result.orders)) {
                console.log('order for '.green + self.exchangeName + ' filled successfully!'.green);
                _.delay(function () {
                    self.hasOpenOrder = false;
                    self.emitter.emit(self.exchangeName + ':orderMatched');
                }, config.interval);
            }
            else {
                console.log('order for '.red + self.exchangeName + ' not filled yet!'.red);
                self.emitter.emit(self.exchangeName + ':orderNotMatched');
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