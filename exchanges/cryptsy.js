var colors      = require('colors'),
    Deferred    = require("promised-io/promise").Deferred,
    _           = require('underscore'),
    utils       = require('../utils'),
    config      = require('./../config'),
    cryptsy     = require('cryptsy-api');

var client = new cryptsy(config['cryptsy'].publicKey, config['cryptsy'].privateKey);

module.exports = {

    exchangeName: 'cryptsy',

    balances: {},

    prices: {},

    openOrderId: null,

    getBalance: function () {
        var deferred = new Deferred(),
            self = this;

        this.balances = {};

        client.getinfo(function (err, data) {
            if (!err) {
                _.each(data.return.balances_available, function (balance, index) {
                    self.balances[index.toLowerCase()] = +balance;
                });
                console.log('Balance for '.green + self.exchangeName + ' fetched successfully'.green);
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

    createOrder: function (market, type, rate, amount) {
        var deferred = new Deferred(),
            marketId = config[this.exchangeName].marketMap[market],
            self = this;

        console.log('Creating order for ' + amount + ' in ' + this.exchangeName + ' in market ' + market + ' to ' + type + ' at rate ' + rate);

        client.createorder(marketId, type, amount, rate, function (err, data) {
            if (!err && data.success === '1') {
                self.openOrderId = +data.orderid;

                deferred.resolve(true);
            }
            else {
                deferred.reject();
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

        // console.log('Getting Market Prices for: ', this.exchangeName);
        client.singleorderdata(market, function (err, data) {

            if (!err && data.return) {
                data = data.return[config.market.split('_')[0]];

                self.prices.buy.price = _.first(data.sellorders)[0];
                self.prices.buy.quantity = _.first(data.sellorders)[1];

                self.prices.sell.price = _.first(data.buyorders)[0];
                self.prices.sell.quantity = _.first(data.buyorders)[1];

                console.log('Exchange prices for ' + self.exchangeName + ' fetched successfully!');
            }

            try { deferred.resolve();} catch (e){}
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

        client.myorders(market, function (err, data) {
            console.log('CRYPTSY ORDER DATA');
            console.log(data);

            if (!err && !data.return) {
                self.openOrderId = null;
                try { deferred.resolve(false);} catch (e){}
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
