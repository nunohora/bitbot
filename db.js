var mongoose             = require('mongoose'),
    connection           = mongoose.connect('mongodb://bitbot:12345@162.243.22.198:27017/bitbot'),
    db                   = mongoose.connection,
    TradeModel           = require('./models/TradeModel'),
    ExchangeBalanceModel = require('./models/ExchangeBalanceModel'),
    TotalBalanceModel    = require('./models/TotalBalanceModel'),
    _                    = require('underscore');

module.exports = {
    initialize: function () {
        ExchangeBalanceModel.initialize();
        TotalBalanceModel.initialize();
        TradeModel.initialize();

        db.on('error', console.error.bind(console, 'connection error:'));
        db.once('open', function () { console.log('connection open'); });
    },

    registerNewTrade: function (tradeData) {
        var tradeModel = TradeModel.getModel(),
            trade;

        trade = new tradeModel({
            market: tradeData.market,
            exchange1: {
                name: tradeData.ex1.name,
                buyPrice: tradeData.ex1.buyPrice,
                amount: tradeData.ex1.amount
            },
            exchange2: {
                name: tradeData.ex2.name,
                sellPrice: tradeData.ex2.sellPrice,
                amount: tradeData.ex2.amount
            },
            profit: tradeData.finalProfit,
            when: Date.now()
        });

        trade.save();
    },

    newExchangeBalance: function (exchangeName, exchangeBalance) {
        var exchangeBalanceModel = ExchangeBalanceModel.getModel(),
            balance,
            currencies = ['btc', 'ltc'],
            balanceArray = [];

        _.each(currencies, function (currency) {
            var amount = exchangeBalance[currency],
                obj = {};

            if (!amount) {
                amount = 0;
            }

            obj = { currency: currency, amount: amount };

            balanceArray.push(obj);
        }, this);

        balance = new exchangeBalanceModel({
            name: exchangeName,
            balances: balanceArray,
            when: Date.now()
        });

        balance.save();
    },

    newTotalBalance: function (balances) {
        var totalBalanceModel = TotalBalanceModel.getModel(),
            totalBalance;

        totalBalance = new totalBalanceModel({
            balances: balances,
            when: Date.now()
        });

        totalBalance.save();
    }
}