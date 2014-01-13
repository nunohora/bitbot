var config = require('./config');

module.exports = {

    calculateProfit: function (amount, price, currency, fee) {
        var profit = 0,
            potentialProfit,
            base = config.market.split("_")[0],
            alt = config.market.split("_")[1];

        if (currency === base) {
            profit = (amount * (1 - fee) * price);
        }
        else if (currency === alt) {
            potentialProfit = amount * price;
            profit = potentialProfit - (potentialProfit * fee);
        }

        return {
            amount: amount,
            profit: profit.toFixed(8)
        };
    },

    calculateCost: function (amount, price, currency, fee) {
        var cost = 10000,
            potentialCost,
            base = config.market.split("_")[0],
            alt = config.market.split("_")[1];

        if (currency === base) {
            amount = amount + (amount * fee);
            cost = amount * price;
        }

        else if (currency === alt) {
            potentialCost = amount *  price;
            cost = potentialCost + (potentialCost * fee);
        }

        return {
            amount: amount.toFixed(8),
            cost: cost.toFixed(8)
        };
    },
};