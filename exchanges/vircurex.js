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

    emitter: {},

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

        vircurex.getBalances(function (err, data) {
            if (!err) {
                _.each(data.balances, function (balance, index) {
                    self.balances[index.toLowerCase()] = +balance.availablebalance;
                });

                self.hasOpenOrder = false;

                console.log('Balance for '.green + self.exchangeName + ' fetched successfully'.green);

                self.emitter.emit('exchangeBalanceFetched', self.exchangeName);
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
            realMarket = this.market.name,
            self = this,
            currency1,
            currency2;

        currency1 = realMarket.split("_")[0];
        currency2 = realMarket.split("_")[1];

        console.log('Creating order for ' + amount + ' in ' + this.exchangeName + ' in market ' + market + ' to ' + type + ' at rate ' + rate);

        this.hasOpenOrder = true;

        vircurex.createOrder(type, amount, currency1, rate, currency2, function (err, data) {
            if (!err) {
                self._releaseOrder(data.orderid, { market: market, type: type, rate: rate, amount: amount });
            }
            else {
                console.log(err);
                _.delay(function () {
                    self.emitter.emit(self.exchangeName + ':orderNotCreated', market, type, rate, amount);
                }, config.interval);
            }
        });
    },

    _releaseOrder: function (orderId, orderData) {
        var deferred = new Deferred(),
            self = this;

        vircurex.releaseOrder(orderId, function (err, data) {
            if (!err) {
                console.log('VIRCUREX RELEASE ORDER RESPONSE', data);
                self.openOrderId = data.orderid;
                self.emitter.emit(self.exchangeName + ':orderCreated');
            }
            else {
                console.log(err);
                _.delay(function () {
                    self.emitter.emit(self.exchangeName + ':orderNotCreated', orderData.market, orderData.type, orderData.rate, orderData.amount);
                }, config.interval);
            }
        });
    },

    getExchangeInfo: function () {
        var self = this,
            deferred = new Deferred(),
            market = this.market.name,
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

    checkOrderStatus: _.debounce(function () {
        var self = this,
            interval;

        vircurex.readOrders(1, function (err, data) {
            console.log('Vircurex ORDER DATA');
            console.log(data);

            if (!err && data.numberorders === 0) {
                console.log('order for '.green + self.exchangeName + ' filled successfully!'.green);
                _.delay(function () {
                    self.hasOpenOrder = false;
                    self.emitter.emit(self.exchangeName + ':orderMatched');
                    self.emitter.emit('exchangeOrderMatched', self.exchangeName);
                }, config.interval);
            }
            else {
                console.log('order for '.red + self.exchangeName + ' not filled yet!'.red);
                self.emitter.emit(self.exchangeName + ':orderNotMatched');
            }
        });
    }, config.interval)
};
