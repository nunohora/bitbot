var config = require('./../config');
var _ = require('underscore');
var utils = require('../utils');

var CryptoTrade = require('../crypto-trade'),
    cryptoTrade = new CryptoTrade(config['crypto-trade'].apiKey, config['crypto-trade'].secret),
    Deferred = require("promised-io/promise").Deferred;

module.exports = {

    exchangeName: 'crypto-trade',

    balances: {},

    prices: {},

    openOrderId: null,

    getBalance: function (type) {
        var deferred = new Deferred(),
            self = this;

        cryptoTrade.getInfo(function (err, data) {
            if (!err) {
                _.each(data.data.funds, function (balance, index) {
                    self.balances[index.toLowerCase()] = +balance;
                }, self);

                deferred.resolve();
            }
            else {
                deferred.reject(err);
            }
        });

        return deferred.promise;
    },

    createOrder: function (market, type, rate, amount) {
        var deferred = new Deferred(),
            self = this;

        console.log('Creating order for ' + amount + ' in ' + this.exchangeName + ' in market ' + market + ' to ' + type + ' at rate ' + rate);

        cryptoTrade.trade({
            pair: market.toLowerCase(),
            type: type.charAt(0).toUpperCase() + type.slice(1),
            rate: rate,
            amount: amount
        }, function (err, data) {
            if (!err) {
                console.log('CryptoTrade create order response: ', data);
                self.openOrderId = data.data;

                deferred.resolve(data);
            }
            else {
                deferred.reject(err);
            }
        });

        return deferred.promise;
    },

    calculateProfit: function (amount) {
        var sellFee = config[this.exchangeName].fees[config.market].sell;

        return utils.calculateProfit(amount, this.prices.sell.price, sellFee.currency, sellFee.percentage, 3);
    },

    calculateCost: function (amount) {
        var buyFee = config[this.exchangeName].fees[config.market].buy;

        return utils.calculateCost(amount, this.prices.buy.price, buyFee.currency, buyFee.percentage, 3);
    },

    getExchangeInfo: function () {
        var deferred = new Deferred(),
            market = config[this.exchangeName].marketMap[config.market],
            self = this;

        this.prices = {
            buy: {},
            sell : {}
        };

        console.time(this.exchangeName + ' getPrices');
        console.log('Checking prices for ' + this.exchangeName);

        cryptoTrade.depth({pair: market}, function (err, data) {
            console.timeEnd(self.exchangeName + ' getPrices');

            if (!err && data) {

                self.prices.buy.price = _.first(data.asks)[0];
                self.prices.buy.quantity = _.first(data.asks)[1];

                self.prices.sell.price = _.first(data.bids)[0];
                self.prices.sell.quantity = _.first(data.bids)[1];

                console.log('Exchange prices for ' + self.exchangeName + ' fetched successfully!');
            }

            deferred.resolve();
        });

        return deferred.promise;
    },

    checkOrderStatus: function () {
        var deferred = new Deferred(),
            self = this,
            market = config[this.exchangeName].marketMap[config.market];

            cryptoTrade.orderInfo({orderid: self.openOrderId}, function (data) {
                console.log('CryptoTrade ORDER DATA');
                console.log(data);

                if (!_.isEmpty(data)) {
                    console.log(_.first(data.data).remaining_amount === '0');
                    console.log(_.first(data.data)['remaining_amount'] === '0');
                    console.log(_.first(data.data));
                }

                return !_.isEmpty(data) && _.first(data.data)['remaining_amount'] === '0' ? deferred.resolve(true) : deferred.resolve(false);
            });

        return deferred.promise;
    }
};