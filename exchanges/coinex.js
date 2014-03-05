var colors      = require('colors'),
    _           = require('underscore'),
    Deferred    = require("promised-io/promise").Deferred,
    config      = require('./../config'),
    CoinEX        = require('../coinex'),
    utils       = require('../utils');

var coinex = new CoinEX(config['coinex'].apiKey, config['coinex'].secret);

module.exports = {

    exchangeName: 'coinex',

    balances: {},

    prices: {},

    hasOpenOrder: false,

    getBalance: function () {
        var deferred = new Deferred(),
            self = this;

        this.balances = {};
        
        coinex.getInfo(function (err, data) {
            if (!err) {
                _.each(data.balances, function (balance) {
                    self.balances[balance['currency_name'].toLowerCase()] = balance['amount'];
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
        var deferred = new Deferred();

        console.log('Creating order for ' + amount + ' in ' + this.exchangeName + ' in market ' + market + ' to ' + type + ' at rate ' + rate);

        amount = 0;

        this.hasOpenOrder = true;

        coinex.trade({
            pair: config[this.exchangeName].marketMap[market],
            type: type,
            rate: rate,
            amount: amount
        }, function (err, data) {
            if (!err && data.success === 1) {
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

                self.prices.buy.price = (ask['rate']/100000000).toFixed(8);
                self.prices.buy.quantity = (ask['amount']/100000000).toFixed(8);

                self.prices.sell.price = (bid['rate']/100000000).toFixed(8);
                self.prices.sell.quantity = (bid['amount']/100000000).toFixed(8);

                console.log('prices');
                console.log(self.prices);

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

    checkOrderStatus: function () {
        var deferred = new Deferred(),
            self = this,
            market = config[this.exchangeName].marketMap[config.market];

        coinex.activeOrders({pair: market}, function (err, data) {
            console.log('coinex ORDER DATA: ', data);

            if (!err && data.error === 'no orders') {
                try {
                    self.hasOpenOrder = false;

                    deferred.resolve(true);
                } catch (e){}
            }
            else {
                try { deferred.resolve(false);} catch (e){}
            }
        });

        setTimeout(function () {
            try { deferred.resolve(false);} catch (e){}
        }, config.requestTimeouts.orderStatus);

        return deferred.promise;
    }

};