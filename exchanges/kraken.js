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

    balancesMap: {
        'XXBT': 'btc',
        'XLTC': 'ltc'
    },

    hasOpenOrder: false,
    
    getBalance: function () {
        var deferred = new Deferred(),
            self = this;

        this.balances = {};
        
        kraken.api('Balance', null, function (err, data) {
            if (!err) {
                _.each(data.result, function (balance, idx) {
                    self.balances[self.balancesMap[idx]] = +balance;
                });

                self.hasOpenOrder = false;

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
        var deferred = new Deferred(),
            newRate,
            newType,
            newAmount;

        console.log('Old Rate: ', rate);
        console.log('Old amount: ', amount);

        //ugly ugly
        if (config.market === 'LTC_BTC') {
            newType = type === 'buy' ? 'sell' : 'buy';
            newRate = (1/rate).toFixed(5);
            
            newAmount = (amount/newRate).toFixed(8);
        }

        this.hasOpenOrder = true;

        console.log('Creating order for ' + amount + ' in ' + this.exchangeName + ' in market ' + market + ' to ' + type + ' at rate ' + rate);

        kraken.api('AddOrder', {
            pair: config[this.exchangeName].marketMap[market],
            type: newType,
            ordertype: 'limit',
            price: newRate,
            volume: newAmount
        }, function (err, data) {
            console.log('KRAKEN ORDER RESPONSE!!');
            console.log('err: ', err);
            console.log('data: ', data);

            if (!err && _.isEmpty(data.error)) {
                console.log('KRAKEN resolved successfully!');
                deferred.resolve(true);
            }
            else {
                console.log('KRAKEN error on order!');
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

    startOrderCheckLoop: function () {
        var self = this,
            interval;

        checkOrderStatus = function () {
            kraken.api('OpenOrders', null, function (err, data) {
                console.log('KRAKEN OPEN ORDERS: ', data);
                if (!err && !data) {
                    self.hasOpenOrder = false;

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