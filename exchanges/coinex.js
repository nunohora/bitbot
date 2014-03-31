var colors      = require('colors'),
    _           = require('underscore'),
    Deferred    = require("promised-io/promise").Deferred,
    config      = require('./../config'),
    CoinEX        = require('../coinex'),
    utils       = require('../utils'),
    events      = require('events'),
    emitter     = new events.EventEmitter();

var coinex = new CoinEX(config['coinex'].apiKey, config['coinex'].secret);

module.exports = {

    exchangeName: 'coinex',

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

        coinex.getInfo(function (err, data) {
            if (!err) {
                _.each(data.balances, function (balance) {
                    self.balances[balance['currency_name'].toLowerCase()] = +(balance['amount']/Math.pow(10, 8)).toFixed(8);
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
        console.log('Creating order for ' + amount + ' in ' + this.exchangeName + ' in market ' + market + ' to ' + type + ' at rate ' + rate);

        this.hasOpenOrder = true;

        coinex.trade({
            'trade_pair_id': config[this.exchangeName].marketMap[market],
            'amount': Math.round(amount * Math.pow(10, 8)),
            'bid': type === 'buy' ? true : false,
            'rate': Math.round(rate * Math.pow(10, 8)),
        }, function (err, data) {
            console.log('COINEX DATA:, ', data);
            if (!err && data && _.isEmpty(data.error)) {
                emitter.emit('orderCreated');
            }
            else {
                console.log(err);
                _.delay(function () {
                    emitter.emit('orderNotCreated', market, type, rate, amount);
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
            market = config[this.exchangeName].marketMap[config.market],
            self = this,
            bids = [],
            asks = [],
            bid,
            ask;

        this.prices = {
            buy: {},
            sell : {}
        };

        console.log('Checking prices for '.yellow + this.exchangeName);

        coinex.depth({pair: market}, function (err, data) {
            if (!err) {
                _.each(data['orders'], function (openOrder) {
                    if (openOrder['bid']) {
                        bids.push(openOrder);
                    }
                    else {
                        asks.push(openOrder);
                    }
                }, this);

                ask = _.min(asks, function (ask) {return ask.rate;});
                bid = _.max(bids, function (bid) {return bid.rate;});

                self.prices.buy.price = (ask['rate']/Math.pow(10, 8)).toFixed(8);
                self.prices.buy.quantity = (ask['amount']/Math.pow(10, 8)).toFixed(8);

                self.prices.sell.price = (bid['rate']/Math.pow(10, 8)).toFixed(8);
                self.prices.sell.quantity = (bid['amount']/Math.pow(10, 8)).toFixed(8);

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
        var market = config[this.exchangeName].marketMap[config.market],
            self = this;

        coinex.activeOrders({pair: market}, function (err, data) {
            console.log('COINEX DATA ORDER:, ', data);

            if (!err && data && _.isEmpty(data.orders)) {
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
    }, config.interval)
};