var colors          = require('colors'),
    _               = require('underscore'),
    Deferred        = require("promised-io/promise").Deferred,
    config          = require('./../config'),
    utils           = require('../utils'),
    KrakenClient    = require('kraken-api');

var kraken = new KrakenClient(config['kraken'].apiKey, config['kraken'].secret);

module.exports = {

    exchangeName: 'kraken',

    balances: {},

    prices: {},

    emitter: {},

    balancesMap: {
        'XXBT': 'btc',
        'XLTC': 'ltc',
        'ZUSD': 'usd'
    },

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

        kraken.api('Balance', null, function (err, data) {
            if (!err) {
                _.each(data.result, function (balance, idx) {
                    self.balances[self.balancesMap[idx]] = +balance;
                });

                console.log('Balance for '.green + self.exchangeName + ' fetched successfully'.green);
            }
            else {
                console.log(err);
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
        var newRate = rate,
            newType = type,
            self = this;

        //ugly ugly
        if (config.market === 'LTC_BTC') {
            newType = type === 'buy' ? 'sell' : 'buy';
            newRate = (1/rate).toFixed(5);
        }

        this.hasOpenOrder = true;

        console.log('Creating order for ' + amount + ' in ' + this.exchangeName + ' in market ' + market + ' to ' + type + ' at rate ' + rate);

        kraken.api('AddOrder', {
            pair: this.market.name,
            type: newType,
            ordertype: 'limit',
            price: newRate,
            volume: amount,
            oflags: 'viqc'
        }, function (err, data) {
            if (!err && _.isEmpty(data.error)) {
                console.log('KRAKEN resolved successfully!');
                self.emitter.emit(self.exchangeName + ':orderCreated');
            }
            else {
                console.log('KRAKEN error on order: ', err);
                if (data.error) { console.log('KRAKEN error on order: ', data.error)}
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

        kraken.api('Depth', {'pair': market, 'count': 10}, function (err, data) {
            if (!err) {
                var resultMarket = _.keys(data.result),
                    tempData = data.result[resultMarket];

                //ugly, but will do for now
                if (config.market === 'LTC_BTC') {
                    self.prices.sell.price = (1/_.first(tempData.asks)[0]);
                    self.prices.sell.quantity = (_.first(tempData.asks)[1] * _.first(tempData.asks)[0]).toFixed(8);

                    self.prices.buy.price = (1/_.first(tempData.bids)[0]);
                    self.prices.buy.quantity = (_.first(tempData.bids)[1] * _.first(tempData.bids)[0]).toFixed(8);
                }
                else {
                    self.prices.buy.price = _.first(tempData.asks)[0];
                    self.prices.buy.quantity = _.first(tempData.asks)[1];

                    self.prices.sell.price = _.first(tempData.bids)[0];
                    self.prices.sell.quantity = _.first(tempData.bids)[1];
                }

                console.log('Exchange prices for ' + self.exchangeName + ' fetched successfully!');
            }
            else {
                console.log('Error! Failed to get prices for ' + self.exchangeName);
            }

            try {deferred.resolve();} catch (e){}
        });

        setTimeout(function () {
            try {deferred.resolve();} catch (e){}
        }, config.requestTimeouts.prices);

        return deferred.promise;
    },

    checkOrderStatus: _.debounce(function () {
        var self = this;

        kraken.api('OpenOrders', null, function (err, data) {
            console.log('KRAKEN OPEN ORDERS: ', data);
            if (!err && data && data['result'] && _.isEmpty(data['result'].open)) {
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