var mongoose             = require('mongoose'),
    connection           = mongoose.connect('mongodb://localhost/bitcoinbombs'),
    db                   = mongoose.connection,
    TradeModel           = require('./models/TradeModel'),
    ExchangeBalanceModel = require('./models/ExchangeModel');

module.exports = {
    initialize: function () {
        ExchangeBalanceModel.initialize();
        TradeModel.initialize();

        db.on('error', console.error.bind(console, 'connection error:'));
        db.once('open', function () { console.log('connection open'); });
    },

    registerNewTrade: function (tradeData) {
        var tradeModel = TradeModel.getModel(),
            trade;

        trade = new tradeModel({
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
    }
}