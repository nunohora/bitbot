var colors      = require('colors'),
    _           = require('underscore'),
    Deferred    = require("promised-io/promise").Deferred,
    config      = require('./../config'),
    Bitfinex    = require('bitfinex'),
    utils       = require('../utils');

var bitfinex = new Bitfinex(config['bitfinex'].apiKey, config['bitfinex'].secret);

module.exports = {

    exchangeName: 'bitfinex',

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

        bitfinex.wallet_balances(function (err, data) {
            if (!err) {
                _.each(data, function (balance, index) {
                    var currency;

                    if (balance['type'] === 'exchange') {
                        self.balances[balance['currency']] = +balance['amount'];
                    }
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
        var mkt = this.market.name,
            self = this;

        console.log('Creating order for ' + amount + ' in ' + this.exchangeName + ' in market ' + market + ' to ' + type + ' at rate ' + rate);

        this.hasOpenOrder = true;

        bitfinex.new_order(mkt, amount, rate, 'all', type, 'exchange limit', function (err, data) {
            console.log('bitfinex orderId:', data);

            if (!err && data['order_id']) {
                self.emitter.emit(self.exchangeName + ':orderCreated');
            }
            else {
                console.log('BITFINEX ORDER UNSUCCESSFULL '.red, err);
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

        bitfinex.orderbook(this.market.name, function (err, data) {
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
        var self = this,
            market = this.market.name;

        bitfinex.active_orders(function (err, data) {
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