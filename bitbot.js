var config = require('./config'),
    cryptsy = require('./exchanges/cryptsy'),
    btce = require('./exchanges/btce'),
    vircurex = require('./exchanges/vircurex'),
    _ = require('underscore'),
    when = require('promised-io/promise').when;
    all = require('promised-io/promise').all;

module.exports = {

    interval: 5000,

    exchanges: [],

    tradeAmount: 1,

	start: function () {
        console.log("starting bot");

        var self = this;

        setInterval(function () {
            self.getExchangesInfo();
        }, self.interval);
	},

    getExchangesInfo: function () {
        var self = this;

        var group = all(
            btce.getExchangeInfo(config.btce.ltcbtcMarket),
            cryptsy.getExchangeInfo(config.cryptsy.ltcbtcMarket),
            vircurex.getExchangeInfo(config.vircurex.ltcbtcMarket)
        ).then(function (array) {
            self.calculateArbOpportunity(array);
        });
    },

    calculateArbOpportunity: function (exchanges) {
        var exArray = [];

        //compare all exchanges prices from each exchange with each other
        _.each(exchanges, function (ex1) {
            _.each(exchanges, function (ex2) {
                if (ex2.exchangeName !== ex1.exchangeName) {
                    if (!exArray[ex2.exchangeName]) {
                        this.calculateViability(ex1, ex2);
                    }
                }
            }, this);

            exArray[ex1.exchangeName] = true;
        }, this);
    },

    calculateViability: function (ex1, ex2) {
        if (ex1.bestPrices.lowestBuyPrice.price < ex2.bestPrices.highestSellPrice.price) {
            this.calculateAfterFees(ex1.bestPrices.lowestBuyPrice.price, ex1.buyltcFee, ex2.bestPrices.highestSellPrice.price, ex2.buybtcFee, ex1.exchangeName, ex2.exchangeName);
        }
        else if (ex1.bestPrices.highestSellPrice.price > ex2.bestPrices.lowestBuyPrice.price) {
            this.calculateAfterFees(ex2.bestPrices.lowestBuyPrice.price, ex2.buyltcFee, ex1.bestPrices.highestSellPrice.price, ex1.buybtcFee, ex2.exchangeName, ex1.exchangeName);
        }
    },

    calculateAfterFees: function (ex1BuyPrice, ex1Fee, ex2SellPrice, ex2Fee, ex1Name, ex2Name) {
        var amount = this.tradeAmount;

        var amountToBuy = (ex1BuyPrice * amount) * (1 - ex1Fee);
        var amountToSell = (ex2SellPrice * amount) * (1 - ex2Fee);

        if ((amountToBuy - amountToSell) > 0) {
            console.log("\007");
            console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');
            console.log('Found a candidate!!!');
            console.log('buy ' + amount + ' ltc for ' + ex1BuyPrice + ' in ' + ex1Name + ' and sell ' + amount + ' ltc for ' + ex2SellPrice + ' in ' + ex2Name);
            console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');
        }
    }
};