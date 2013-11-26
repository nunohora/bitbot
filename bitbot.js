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
        var exchangesCompared = [];

        //compare all exchanges prices from each exchange with each other
        _.each(exchanges, function (exchangeToCompare) {
            _.each(exchanges, function (exchangeToBeCompared) {
                if (exchangeToBeCompared.exchangeName !== exchangeToCompare.exchangeName) {
                    if (!exchangesCompared[exchangeToBeCompared.exchangeName]) {
                        this.calculateViability(exchangeToCompare, exchangeToBeCompared);
                    }
                }
            }, this);

            exchangesCompared[exchangeToCompare.exchangeName] = true;
        }, this);
    },

    calculateViability: function (exchange1, exchange2) {
        if (exchange1.bestPrices.lowestBuyPrice.price < exchange2.bestPrices.highestSellPrice.price) {
            this.calculateAfterFees(exchange1.bestPrices.lowestBuyPrice.price, exchange1.buyltcFee, exchange2.bestPrices.highestSellPrice.price, exchange2.buybtcFee);
        }
        else if (exchange1.bestPrices.highestSellPrice.price > exchange2.bestPrices.lowestBuyPrice.price) {
            this.calculateAfterFees(exchange2.bestPrices.lowestBuyPrice.price, exchange2.buyltcFee, exchange1.bestPrices.highestSellPrice.price, exchange1.buybtcFee);
        }
    },

    calculateAfterFees: function (exchange1BuyPrice, exchange1Fee, exchange2SellPrice, exchange2Fee, exchange1Name, exchange2Name) {
        var amount = this.tradeAmount;

        var amountToBuy = (exchange1BuyPrice * amount) * (1 - exchange1Fee);
        var amountToSell = (exchange2SellPrice * amount) * (1 - exchange2Fee);

        if ((amountToBuy - amountToSell) > 0) {
            console.log("\007");
            console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');
            console.log('Found a candidate!!!');
            console.log('buy ' + amount + ' ltc for ' + exchange1BuyPrice + ' in ' + exchange1Name + ' and sell ' + amount + ' ltc for ' + exchange2SellPrice + ' in ' + exchange2Name);
            console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');
        }
    }
};