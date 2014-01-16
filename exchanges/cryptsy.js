var config = require('./../config');
var cryptsy = require('cryptsy-api');
var utils = require('../utils');
var _ = require('underscore');
var client = new cryptsy(config['cryptsy'].publicKey, config['cryptsy'].privateKey);
var Deferred = require("promised-io/promise").Deferred;

module.exports = {

    exchangeName: 'cryptsy',

    balances: {},

    prices: {},

    openOrderId: null,

    getBalance: function () {
        var deferred = new Deferred(),
            self = this;

        client.getinfo(function (data) {
            if (!data.error) {
                _.each(data.return.balances_available, function (balance, index) {
                    self.balances[index.toLowerCase()] = +balance;
                });

                deferred.resolve();
            }
            else {
                deferred.reject(data.error);
            }
        });

        return deferred.promise;
    },

    createOrder: function (market, type, rate, amount) {
        var deferred = new Deferred(),
            marketId = config[this.exchangeName].marketMap[market],
            self = this;

        console.log('Creating order for ' + amount + ' in ' + this.exchangeName + ' in market ' + market + ' to ' + type + ' at rate ' + rate);

        client.createorder(marketId, type, amount, rate, function (data) {
            if (data.success === '1') {
                self.openOrderId = +data.orderid;

                deferred.resolve(true);
            }
            else {
                deferred.reject();
            }
        });

        return deferred.promise;
    },

    calculateProfit: function (amount) {
        var sellFee = config[this.exchangeName].fees[config.market].sell;

        return utils.calculateProfit(amount, this.prices.sell.price, sellFee.currency, sellFee.percentage, 8);
    },

    calculateCost: function (amount) {
        var buyFee = config[this.exchangeName].fees[config.market].buy;

        return utils.calculateCost(amount, this.prices.buy.price, buyFee.currency, buyFee.percentage, 8);
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

        // console.log('Getting Market Prices for: ', this.exchangeName);
        client.singleorderdata(market, function (data) {
            console.timeEnd(self.exchangeName + ' getPrices');

            if (data.return) {
                data = data.return[config.market.split('_')[0]];

                self.prices.buy.price = _.first(data.sellorders)[0];
                self.prices.buy.quantity = _.first(data.sellorders)[1];

                self.prices.sell.price = _.first(data.buyorders)[0];
                self.prices.sell.quantity = _.first(data.buyorders)[1];

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

        if (this.openOrderId) {
            client.readOrder(self.openOrderId, function (data) {
                console.log('CRYPTSY ORDER DATA');
                console.log(data);

                if (!data.return) {
                    self.openOrderId = null;

                    return deferred.resolve(true);
                }
                else {
                    return deferred.resolve(false);
                }
            });
        }
        else {
            return deferred.resolve(true);
        }

        return deferred.promise;
    }
};
