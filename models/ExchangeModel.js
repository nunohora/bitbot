var mongoose = require('mongoose');

module.exports = {
    ExchangeBalanceModel: null,

    initialize: function (connection) {
        this.createExchangeBalanceSchema();
    },

    getModel: function () {
        return this.ExchangeBalanceModel;
    },

    createExchangeBalanceSchema: function () {
        var ExchangeBalanceSchema = new mongoose.Schema({
            name: String,
            balances: Array
            when: Date
        });

        this.ExchangeBalanceModel = mongoose.model('ExchangeBalance', ExchangeBalanceSchema);
    }
};