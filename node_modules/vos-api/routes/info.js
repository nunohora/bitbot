var _ = require('underscore'),
    Core = require('../core/index'),
    Validator = require('../core/validator'),
    crypto = require('crypto'),
    qs = require('querystring');

function Call(endpoint, options, cb) {
    if(arguments.length === 2) {
         // there are no args!
         var cb = options;
         options = {};
    }

    var params = {};

    // check required params
    if(!_.isUndefined(options.requires)) {
        Validator.check(options.requires, options.params);
        _.each(options.requires, function(v, i) {
            params[v] = options.params[v]; 
        });
    }

    // check optional params
    if(!_.isUndefined(options.optional)) {
        _.each(options.optional, function(v, i) {
            if(!_.isUndefined(options.params[v])) {
                params[v] = options.params[v];
            }
        });
    }

    Core.post(endpoint, params, cb, Info.settings);
}

var Info = {
    ticker: function(opts, cb) {
        Call('/info/ticker', {
            requires: 'order_currency payment_currency'.split(' '),
            params: opts
        }, cb);

    },
    currency: function(opts, cb) {
        if(_.isEqual(arguments.length, 1)) {
            var cb = opts;
            var opts = {};
        }

        Call('/info/currency', {
            optional: 'currency'.split(' '),
            params: opts
        }, cb);
    },
    account: function(cb) {
        Call('/info/account', cb);
    },
    balance: function(opts, cb) {
        if(_.isEqual(arguments.length, 1)) {
            var cb = opts;
            var opts = {};
        }

        Call('/info/balance', {
            optional: 'currency'.split(' '),
            params: opts
        }, cb);
    },
    quote: function(opts, cb) {
        Call('/info/quote', {
            requires: 'type order_currency units payment_currency price'.split(' '),
            params: opts
        }, cb);
    },
    orders: function(opts, cb) {
        if(_.isEqual(arguments.length, 1)) {
            var cb = opts;
            var opts = {};
        }

        Call('/info/orders', {
            optional: 'count after open_only'.split(' '),
            params: opts,
        }, cb);

    },
    order_detail: function(opts, cb) {
        Call('/info/order_detail', {
            requires: 'order_id'.split(' '),
            params: opts
        }, cb);
    },
    wallet: {
        address: function(opts, cb) {
            if(_.isEqual(arguments.length, 1)) {
                var cb = opts;
                var opts = {};
            }

            Call('/info/balance', {
                optional: 'currency'.split(' '),
                params: opts
            }, cb);

        },
        history: function(opts, cb) {
            Call('/info/wallet_history', {
                requires: 'currency count after'.split(' '),
                params: opts
            }, cb);
        }
    }
};

module.exports = function(settings) {
    Info.settings = settings;
    return Info;
}
