var colors   = require('colors'),
    _        = require('underscore'),
    Deferred = require("promised-io/promise").Deferred,
    config   = require('./../config'),
    Anxpro   = require('anx'),
    utils    = require('../utils');

var anxpro = new Anxpro(config['anxpro'].apiKey, config['anxpro'].secret);

module.exports = {

    exchangeName: 'anxpro',

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
        this.market = config[this.exchangeName].marketMap[market].name;
        anxpro.setCurrency(this.market);
    },

    fetchBalance: function () {
        var deferred = new Deferred(),
            self = this;

        this.balances = {};

        anxpro.info(function (err, data) {
            if (!err) {
                _.each(data.data.Wallets, function (balance, index) {
                    self.balances[index.toLowerCase()] = +balance.Available_Balance.value;
                }, self);

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
        var self = this,
            newType = type === 'buy' ? 'bid' : 'ask';

        console.log('Creating order for ' + amount + ' in ' + this.exchangeName + ' in market ' + market + ' to ' + type + ' at rate ' + rate);

        this.hasOpenOrder = true;

        anxpro.newOrder(this.market, newType, +(amount*10000000).toFixed(8), +(rate*10000000).toFixed(8), function (err, data) {
            console.log('anxpro orderId:', data);

            if (!err && data['order_id']) {
                self.emitter.emit(self.exchangeName + ':orderCreated');
            }
            else {
                console.log('anxpro ORDER UNSUCCESSFULL '.red, err);
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
            self = this;

        this.prices = { buy: {}, sell : {} };

        console.log('Checking prices for '.yellow + this.exchangeName);

        anxpro.fetchDepth(function (err, data) {
            if (!err) {
                self.populatePrices(data.data);
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
        var self = this;

        anxpro.orders(function (err, data) {
            console.log('data: ', data);

            if (!err && _.isEmpty(data)) {
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
        this.prices = {
            buy: {
                price: _.first(data.asks).price,
                quantity: _.first(data.asks).amount
            },
            sell: {
                price: _.first(data.bids).price,
                quantity: _.first(data.bids).amount
            }
        };
    }
};