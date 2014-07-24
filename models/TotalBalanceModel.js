var mongoose = require('mongoose');

module.exports = {
    TotalBalanceModel: null,

    initialize: function (connection) {
        this.createTotalBalanceSchema();
    },

    getModel: function () {
        return this.TotalBalanceModel;
    },

    createTotalBalanceSchema: function () {
        var TotalBalanceSchema = new mongoose.Schema({
            balances: Array,
            when: Date
        });

        this.TotalBalanceModel = mongoose.model('TotalBalance', TotalBalanceSchema);
    }
};