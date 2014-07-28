var colors      = require('colors'),
    _           = require('underscore'),
    Deferred    = require("promised-io/promise").Deferred,
    config      = require('./../config'),
    Cexio       = require('cexio'),
    utils       = require('../utils'),
    events      = require('events'),
    emitter     = new events.EventEmitter();

var cexio = Cexio.create(config['cexio'].username, config['cexio'].apiKey, config['cexio'].secret);

module.exports = {

    exchangeName: 'cexio',

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

        Cexio.balance(function (err, data) {
            if (!err) {
                _.each(data, function (balance, index) {
                    var currency;

                    if (index === index.toUpperCase()) {
                        self.balances[index.toLowerCase()] = +balance['available'];
                    }
                }, self);

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
        var self = this;

        console.log('Creating order for ' + amount + ' in ' + this.exchangeName + ' in market ' + market + ' to ' + type + ' at rate ' + rate);

        this.hasOpenOrder = true;

        Cexio.place_order(type, amount, rate, this.market.name , function (err, data) {
            console.log('CEX.IO place order data: ', data);
            if (!err && data && !data.error) {
                self.emitter.emit(self.exchangeName + ':orderCreated');
            }
            else {
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

    checkOrderStatus: _.debounce(function () {
        var deferred = new Deferred(),
            self = this,
            market = this.market.name;

        Cexio.open_orders(market, function (err, data) {
            if (!err && _.isArray(data) && _.isEmpty(data)) {
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
    }, config.interval)
};