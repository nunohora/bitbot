var mongoose = require('mongoose');

module.exports = {
    TradeModel: null,

    initialize: function (connection) {
        this.createTradeSchema();
    },

    getModel: function () {
        return this.TradeModel;
    },

    createTradeSchema: function () {
        var TradeSchema = new mongoose.Schema({
            exchange1: {
                name: String,
                buyPrice: Number,
                amount: Number
            },
            exchange2: {
                name: String,
                sellPrice: Number,
                amount: Number
            },
            profit: Number,
            when: Date
        });

        this.TradeModel = mongoose.model('TradeModel', TradeSchema);
    }
};