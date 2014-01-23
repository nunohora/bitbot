var config = require('./config');

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

        console.log('amount: ', amount);
        return {
            amount: amount.toFixed(8),
            profit: profit.toFixed(decimals)
        };
    },

    calculateCost: function (amount, price, currency, fee, decimals) {
        var cost = 10000,
            potentialCost,
            base = config.market.split("_")[0],
            alt = config.market.split("_")[1];

        if (currency === base) {
            amount = (amount / (1 - fee));
            cost = amount * price;
        }

        else if (currency === alt) {
            potentialCost = amount *  price;
            cost = potentialCost + (potentialCost * fee);
        }

        return {
            amount: amount.toFixed(decimals),
            cost: cost.toFixed(decimals)
        };
    },
};