var config          = require('./config'),
    _               = require('underscore'),
    fs              = require('fs'),
    emailManager    = require('./emailManager');

module.exports = {

    calculateProfit: function (amount, price, currency, fee, decimals) {
        var profit = 0,
            potentialProfit,
            base = config.market.split("_")[0],
            alt = config.market.split("_")[1];

        if (currency === base) {
            profit = (amount * (1 - fee) * price);
            amount = (amount / (1 - fee));
        }
        else if (currency === alt) {
            potentialProfit = amount * price;
            profit = potentialProfit - (potentialProfit * fee);
        }

        return {
            amount: amount.toFixed(decimals),
            profit: profit.toFixed(8)
        };
    },

    calculateCost: function (amount, price, currency, fee, decimals) {
        var cost = 10000,
            potentialCost,
            tempAmount,
            base = config.market.split("_")[0],
            alt = config.market.split("_")[1];

        if (currency === base) {
            amount = (amount / (1 - fee));
            cost = amount * price;
        }
        else if (currency === alt) {
            tempAmount = amount * price;
            cost = tempAmount + (tempAmount * fee);
        }

        return {
            amount: amount.toFixed(decimals),
            cost: cost.toFixed(8)
        };
    },

    getBestArb: function (arrayOfArbs) {
        return _.max(arrayOfArbs, function (arb) {
            return +arb.finalProfit;
        }, this);
    },

    getSmallestDecimal: function (ex1, ex2) {
        return _.min([config[ex1.exchangeName].decimals, config[ex2.exchangeName].decimals]);
    },

    getTotalBalanceInExchanges: function (exchangeMarkets) {
        var totalBalances = {};

        _.each(exchangeMarkets, function (exchange) {
            var exchangeBalance = exchange.balances;

            _.each(exchangeBalance, function (currency, index) {
                if (totalBalances[index]) {
                    totalBalances[index] += currency;
                }

                else {
                    totalBalances[index] = currency;
                }
            }, this);
        }, this);

        return totalBalances;
    },

    orderByProfit: function (arrayOfArbs) {
        return _.sortBy(arrayOfArbs, function (arb) {
            return -(+arb.finalProfit);
        });
    },

    registerTrade: function (arb, totalBalances) {
        this.writeToFile(arb, totalBalances);

        emailManager.prepareEmail();
    },

    writeToFile: function (arb, totalBalances) {
        var obj = JSON.stringify({
            arb: arb,
            totalBalances: totalBalances,
            timestamp: Date.now()
        });

        fs.appendFile('./tradeLog.log','%' + obj, function (err) {
            if (err) {
                console.log('error writing to file: ', err);
            }
        });
    }
};